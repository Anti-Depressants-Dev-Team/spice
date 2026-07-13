package xyz.spiceapp.mobile

import android.app.Application
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.SystemClock
import android.util.Log
import androidx.core.content.FileProvider
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import xyz.spiceapp.mobile.data.LibraryRepository
import xyz.spiceapp.mobile.data.PairedCredentialStore
import xyz.spiceapp.mobile.data.SessionStore
import xyz.spiceapp.mobile.data.SpiceApi
import xyz.spiceapp.mobile.data.SpiceApiException
import xyz.spiceapp.mobile.data.toRemoteTrackJson
import xyz.spiceapp.mobile.data.download.MediaDownloadClient
import xyz.spiceapp.mobile.model.AccountSession
import xyz.spiceapp.mobile.model.AccentTheme
import xyz.spiceapp.mobile.model.AppScreen
import xyz.spiceapp.mobile.model.AuthMode
import xyz.spiceapp.mobile.model.DownloadedTrack
import xyz.spiceapp.mobile.model.EmailVerificationChallenge
import xyz.spiceapp.mobile.model.FeedSection
import xyz.spiceapp.mobile.model.LibraryTab
import xyz.spiceapp.mobile.model.LibrarySyncSummary
import xyz.spiceapp.mobile.model.LyricsPayload
import xyz.spiceapp.mobile.model.PairedDeviceCredential
import xyz.spiceapp.mobile.model.PendingPlaylistInvite
import xyz.spiceapp.mobile.model.Playlist
import xyz.spiceapp.mobile.model.PlaylistInvitePreview
import xyz.spiceapp.mobile.model.PlaylistMembersSummary
import xyz.spiceapp.mobile.model.ProfileSummary
import xyz.spiceapp.mobile.model.RemoteCommand
import xyz.spiceapp.mobile.model.RemoteDevice
import xyz.spiceapp.mobile.model.RepeatMode
import xyz.spiceapp.mobile.model.SharedPlaylistTrack
import xyz.spiceapp.mobile.model.SharedPlaylistTracks
import xyz.spiceapp.mobile.model.SpiceProfile
import xyz.spiceapp.mobile.model.StreamQuality
import xyz.spiceapp.mobile.model.Track
import xyz.spiceapp.mobile.playback.PlayerConnection
import xyz.spiceapp.mobile.playback.PlayerUiState
import java.io.File
import java.util.UUID
import kotlin.random.Random

private const val SPICE_CONNECT_LOG_TAG = "SpiceConnect"

data class SpiceUiState(
    val screen: AppScreen = AppScreen.Home,
    val homeSections: List<FeedSection> = emptyList(),
    val homeLoading: Boolean = true,
    val searchQuery: String = "",
    val searchResults: List<Track> = emptyList(),
    val searchLoading: Boolean = false,
    val resolvingTrackId: String? = null,
    val currentTrack: Track? = null,
    val playbackQueue: List<Track> = emptyList(),
    val queueIndex: Int = -1,
    val likedTracks: List<Track> = emptyList(),
    val historyTracks: List<Track> = emptyList(),
    val playlists: List<Playlist> = emptyList(),
    val downloads: List<DownloadedTrack> = emptyList(),
    val libraryTab: LibraryTab = LibraryTab.Playlists,
    val quality: StreamQuality = StreamQuality.Standard,
    val accentTheme: AccentTheme = AccentTheme.NeonSpice,
    val accountSession: AccountSession? = null,
    val pairedDeviceCredential: PairedDeviceCredential? = null,
    val pairingCode: String = "",
    val pairingLoading: Boolean = false,
    val profileSummary: ProfileSummary? = null,
    val profileLoading: Boolean = false,
    val profileEditOpen: Boolean = false,
    val profileEditDisplayName: String = "",
    val profileEditUsername: String = "",
    val profileEditAvatarUrl: String = "",
    val profileEditBio: String = "",
    val profileEditPrivate: Boolean = false,
    val profileEditLoading: Boolean = false,
    val authMode: AuthMode = AuthMode.SignIn,
    val authEmail: String = "",
    val authPassword: String = "",
    val authUsername: String = "",
    val emailVerification: EmailVerificationChallenge? = null,
    val authVerificationCode: String = "",
    val accountLoading: Boolean = false,
    val syncLoading: Boolean = false,
    val lastSync: LibrarySyncSummary? = null,
    val pendingInvitePreview: PlaylistInvitePreview? = null,
    val inviteLoading: Boolean = false,
    val pendingAccountInvites: List<PendingPlaylistInvite> = emptyList(),
    val accountInvitesLoading: Boolean = false,
    val sharingPlaylistId: String? = null,
    val activeMemberPlaylist: Playlist? = null,
    val playlistMembers: PlaylistMembersSummary? = null,
    val sharedPlaylistTracks: SharedPlaylistTracks? = null,
    val membersLoading: Boolean = false,
    val memberActionLoading: Boolean = false,
    val sharedTrackActionLoading: Boolean = false,
    val memberInviteUsername: String = "",
    val downloadTrackId: String? = null,
    val downloadProgress: String? = null,
    val lyricsTrackId: String? = null,
    val lyricsPayload: LyricsPayload? = null,
    val lyricsLoading: Boolean = false,
    val remoteDeviceId: String = "",
    val remoteDevices: List<RemoteDevice> = emptyList(),
    val selectedPlaybackDeviceId: String = "",
    val connectLoading: Boolean = false,
    val connectStatus: String = "",
    val message: String? = null,
)

class SpiceViewModel(application: Application) : AndroidViewModel(application) {
    private val api = SpiceApi()
    private val libraryRepository = LibraryRepository(application)
    private val sessionStore = SessionStore(application)
    private val pairedCredentialStore = PairedCredentialStore(application)
    private val downloadClient = MediaDownloadClient(application)
    private val playerConnection = PlayerConnection(application) { handlePlaybackEnded() }
    private val connectPreferences = application.getSharedPreferences("spice_connect", Context.MODE_PRIVATE)
    private val remoteDeviceId = loadRemoteDeviceId()
    private val initialPairedCredential = pairedCredentialStore.load()
        ?.takeIf { it.deviceId == remoteDeviceId }
        .also { credential ->
            if (credential == null) pairedCredentialStore.clear()
        }
    private var playJob: Job? = null
    private var downloadJob: Job? = null
    private var connectJob: Job? = null
    private var optimisticRemoteDeviceId: String? = null
    private var optimisticRemoteStateUntilElapsedMs: Long = 0L
    private var activeDownloadProcessId: String? = null
    private val _uiState = MutableStateFlow(
        SpiceUiState(
            quality = libraryRepository.quality(),
            accentTheme = libraryRepository.accentTheme(),
            accountSession = sessionStore.load(),
            pairedDeviceCredential = initialPairedCredential,
            remoteDeviceId = remoteDeviceId,
            selectedPlaybackDeviceId = loadSelectedPlaybackDeviceId(),
        ),
    )
    val uiState: StateFlow<SpiceUiState> = _uiState.asStateFlow()
    val playerState: StateFlow<PlayerUiState> = playerConnection.state

    init {
        migrateLegacyLibrary()
        observeLibrary()
        loadHome()
        _uiState.value.accountSession?.let { session ->
            loadProfileSummary(session)
            loadPendingAccountInvites(session)
        }
        if (_uiState.value.accountSession != null || _uiState.value.pairedDeviceCredential != null) {
            startSpiceConnect()
        }
    }

    fun selectScreen(screen: AppScreen) {
        _uiState.value = _uiState.value.copy(screen = screen)
    }

    fun setSearchQuery(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
    }

    fun search(query: String = _uiState.value.searchQuery) {
        val normalized = query.trim()
        if (normalized.isEmpty()) return
        _uiState.value = _uiState.value.copy(searchQuery = normalized, searchLoading = true, message = null)
        viewModelScope.launch {
            runCatching { api.search(normalized, 20) }
                .onSuccess { tracks ->
                    _uiState.value = _uiState.value.copy(
                        screen = AppScreen.Search,
                        searchResults = tracks,
                        searchLoading = false,
                        message = if (tracks.isEmpty()) "No tracks found." else null,
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        searchLoading = false,
                        message = error.message ?: "Search failed.",
                    )
                }
        }
    }

    fun play(track: Track, queue: List<Track> = listOf(track)) {
        activeRemoteTargetId()?.let { targetDeviceId ->
            playOnRemoteDevice(targetDeviceId, track, queue)
            return
        }
        val normalizedQueue = normalizeQueue(queue, track)
        val nextIndex = normalizedQueue.indexOfFirst { it.queueKey() == track.queueKey() }.takeIf { it >= 0 } ?: 0
        playQueueIndex(normalizedQueue, nextIndex)
    }

    fun playNext() {
        activeRemoteTargetId()?.let { targetDeviceId ->
            patchRemoteQueueStep(targetDeviceId, step = 1)
            sendRemoteCommand(targetDeviceId, "next")
            return
        }
        playNextLocally()
    }

    private fun playNextLocally() {
        val state = _uiState.value
        val nextIndex = nextQueueIndex(state, allowWrap = state.playbackQueue.isNotEmpty())
        if (nextIndex == null) {
            _uiState.value = state.copy(message = "No next track in queue.")
            return
        }
        playQueueIndex(state.playbackQueue, nextIndex)
    }

    fun playPrevious() {
        activeRemoteTargetId()?.let { targetDeviceId ->
            patchRemoteQueueStep(targetDeviceId, step = -1)
            sendRemoteCommand(targetDeviceId, "previous")
            return
        }
        playPreviousLocally()
    }

    private fun playPreviousLocally() {
        val state = _uiState.value
        val queue = state.playbackQueue
        if (queue.isEmpty()) {
            _uiState.value = state.copy(message = "No previous track in queue.")
            return
        }
        val previousIndex = if (state.queueIndex > 0) {
            state.queueIndex - 1
        } else {
            queue.lastIndex
        }
        playQueueIndex(queue, previousIndex)
    }

    private fun playQueueIndex(queue: List<Track>, index: Int) {
        val track = queue.getOrNull(index) ?: return
        playJob?.cancel()
        _uiState.value = _uiState.value.copy(
            resolvingTrackId = track.id,
            currentTrack = track,
            playbackQueue = queue,
            queueIndex = index,
            message = null,
        )
        playJob = viewModelScope.launch {
            try {
                val playback = api.resolvePlayable(track, _uiState.value.quality)
                libraryRepository.addToHistory(playback.track)
                _uiState.value = _uiState.value.copy(
                    resolvingTrackId = null,
                    currentTrack = playback.track,
                    playbackQueue = queue.replaceAt(index, playback.track),
                    queueIndex = index,
                    message = if (playback.usedFallback) {
                        "Playing full SoundCloud source: ${playback.track.title}"
                    } else {
                        null
                    },
                )
                playerConnection.clearError()
                playerConnection.play(playback.track, playback.stream.url)
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (error: Exception) {
                _uiState.value = _uiState.value.copy(
                    resolvingTrackId = null,
                    message = error.message ?: "No playable source is available.",
                )
            }
        }
    }


    fun playEngineTest() {
        if (!BuildConfig.DEBUG) return
        val track = Track(
            id = "native-engine-test",
            title = "Native audio engine test",
            artist = "Spice",
            durationMs = 30_000,
        )
        _uiState.value = _uiState.value.copy(
            currentTrack = track,
            playbackQueue = listOf(track),
            queueIndex = 0,
            resolvingTrackId = null,
            message = null,
        )
        playerConnection.clearError()
        playerConnection.play(
            track,
            "android.resource://" + getApplication<Application>().packageName + "/" + R.raw.engine_test,
        )
    }
    fun togglePlayback() {
        val targetDeviceId = activeRemoteTargetId()
        if (targetDeviceId == null) {
            playerConnection.toggle()
            return
        }

        val device = selectedRemoteDevice()
        if (device == null) {
            unavailableRemoteTarget()
            return
        }
        if (!device.isPlaying && device.currentTrack == null) {
            _uiState.value = _uiState.value.copy(message = "Choose a track for ${device.displayName} first.")
            return
        }

        val command = if (device.isPlaying) "pause" else "play"
        patchRemoteDevice(targetDeviceId) { it.copy(isPlaying = !device.isPlaying) }
        sendRemoteCommand(targetDeviceId, command)
    }

    fun seekTo(positionMs: Long) {
        val targetDeviceId = activeRemoteTargetId()
        if (targetDeviceId == null) {
            playerConnection.seekTo(positionMs)
            return
        }

        val device = selectedRemoteDevice()
        if (device == null) {
            unavailableRemoteTarget()
            return
        }
        val safePosition = positionMs.coerceIn(0, device.durationMs.takeIf { it > 0 } ?: Long.MAX_VALUE)
        patchRemoteDevice(targetDeviceId) { it.copy(progressMs = safePosition) }
        sendRemoteCommand(
            targetDeviceId,
            "seek",
            JSONObject().put("progress", safePosition / 1000.0),
        )
    }

    fun seekBy(deltaMs: Long) = playerConnection.seekBy(deltaMs)

    fun toggleShuffle() {
        val targetDeviceId = activeRemoteTargetId()
        if (targetDeviceId == null) {
            playerConnection.toggleShuffle()
            return
        }

        val device = selectedRemoteDevice()
        if (device == null) {
            unavailableRemoteTarget()
            return
        }
        val enabled = !device.shuffleEnabled
        patchRemoteDevice(targetDeviceId) { it.copy(shuffleEnabled = enabled) }
        sendRemoteCommand(targetDeviceId, "shuffle", JSONObject().put("enabled", enabled))
    }

    fun cycleRepeat() {
        val targetDeviceId = activeRemoteTargetId()
        if (targetDeviceId == null) {
            playerConnection.cycleRepeat()
            return
        }

        val device = selectedRemoteDevice()
        if (device == null) {
            unavailableRemoteTarget()
            return
        }
        val mode = device.repeatMode.next()
        patchRemoteDevice(targetDeviceId) { it.copy(repeatMode = mode) }
        sendRemoteCommand(targetDeviceId, "repeat", JSONObject().put("mode", mode.remoteValue()))
    }

    fun setAccentTheme(theme: AccentTheme) {
        libraryRepository.setAccentTheme(theme)
        _uiState.value = _uiState.value.copy(accentTheme = theme)
    }

    fun stopPlayback() {
        activeRemoteTargetId()?.let { targetDeviceId ->
            patchRemoteDevice(targetDeviceId) { it.copy(isPlaying = false) }
            sendRemoteCommand(targetDeviceId, "pause")
            return
        }
        playerConnection.stop()
        _uiState.value = _uiState.value.copy(
            currentTrack = null,
            playbackQueue = emptyList(),
            queueIndex = -1,
            resolvingTrackId = null,
        )
    }

    fun downloadTrack(track: Track) {
        if (_uiState.value.downloadTrackId != null) {
            _uiState.value = _uiState.value.copy(message = "A download is already running.")
            return
        }

        val processId = MediaDownloadClient.newProcessId()
        activeDownloadProcessId = processId
        _uiState.value = _uiState.value.copy(
            downloadTrackId = track.id,
            downloadProgress = "Preparing download...",
            message = null,
        )
        downloadJob = viewModelScope.launch {
            try {
                val source = downloadSource(track)
                val result = withContext(Dispatchers.IO) {
                    val progressHandler: (xyz.spiceapp.mobile.data.download.DownloadProgress) -> Unit = { progress ->
                        val label = if (progress.progress.isFinite() && progress.progress >= 0f) {
                            "Downloading ${progress.progress.toInt().coerceIn(0, 100)}%"
                        } else {
                            progress.line.ifBlank { "Downloading..." }.take(80)
                        }
                        _uiState.value = _uiState.value.copy(downloadProgress = label)
                    }
                    if (source.directFile) {
                        val direct = downloadClient.downloadDirectAudio(track, source.url, processId, progress = progressHandler)
                        if (direct.exitCode == 415) {
                            downloadClient.downloadAudio(track, source.url, processId, progress = progressHandler)
                        } else {
                            direct
                        }
                    } else {
                        downloadClient.downloadAudio(track, source.url, processId, progress = progressHandler)
                    }
                }
                _uiState.value = if (result.exitCode == 0) {
                    val file = result.outputFilePath
                        .takeIf { it.isNotBlank() }
                        ?.let(::File)
                    if (file == null || !file.exists()) {
                        _uiState.value.copy(
                            downloadTrackId = null,
                            downloadProgress = null,
                            message = "Download finished, but the saved audio file was not found.",
                        )
                    } else {
                        val download = libraryRepository.addDownload(
                            track = track,
                            file = file,
                            mimeType = mimeTypeForAudioFile(file),
                        )
                        _uiState.value.copy(
                            downloadTrackId = null,
                            downloadProgress = null,
                            libraryTab = LibraryTab.Downloads,
                            message = "Downloaded ${track.title} to ${download.fileName}.",
                        )
                    }
                } else {
                    _uiState.value.copy(
                        downloadTrackId = null,
                        downloadProgress = null,
                        message = "Download failed: ${result.errorOutput.ifBlank { result.output }.take(160)}",
                    )
                }
            } catch (cancelled: CancellationException) {
                _uiState.value = _uiState.value.copy(downloadTrackId = null, downloadProgress = null)
                throw cancelled
            } catch (error: Exception) {
                _uiState.value = _uiState.value.copy(
                    downloadTrackId = null,
                    downloadProgress = null,
                    message = error.message ?: "Download failed.",
                )
            } finally {
                activeDownloadProcessId = null
            }
        }
    }

    fun cancelDownload() {
        val processId = activeDownloadProcessId
        if (processId == null) {
            _uiState.value = _uiState.value.copy(message = "No active download to cancel.")
            return
        }

        runCatching { downloadClient.cancel(processId) }
        downloadJob?.cancel()
        activeDownloadProcessId = null
        _uiState.value = _uiState.value.copy(
            downloadTrackId = null,
            downloadProgress = null,
            message = "Download cancelled.",
        )
    }

    fun openDownload(download: DownloadedTrack) {
        startDownloadIntent(download, Intent.ACTION_VIEW)
    }

    fun shareDownload(download: DownloadedTrack) {
        val file = File(download.filePath)
        if (!file.exists()) {
            _uiState.value = _uiState.value.copy(message = "That downloaded file is missing.")
            return
        }

        val uri = FileProvider.getUriForFile(
            getApplication(),
            "${getApplication<Application>().packageName}.fileprovider",
            file,
        )
        val shareIntent = Intent(Intent.ACTION_SEND)
            .setType(download.mimeType)
            .putExtra(Intent.EXTRA_STREAM, uri)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        val chooser = Intent.createChooser(shareIntent, "Share audio")
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        runCatching {
            getApplication<Application>().startActivity(chooser)
        }.onFailure { error ->
            _uiState.value = _uiState.value.copy(message = error.message ?: "No app can share this download.")
        }
    }

    fun removeDownload(download: DownloadedTrack) {
        viewModelScope.launch {
            runCatching {
                libraryRepository.removeDownload(download)
            }.onSuccess {
                _uiState.value = _uiState.value.copy(message = "Removed ${download.fileName}.")
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(message = error.message ?: "Could not remove download.")
            }
        }
    }

    fun toggleLike(track: Track) {
        viewModelScope.launch {
            libraryRepository.toggleLike(track)
        }
    }

    fun setLibraryTab(tab: LibraryTab) {
        _uiState.value = _uiState.value.copy(libraryTab = tab)
    }

    fun createPlaylist() {
        viewModelScope.launch {
            val playlist = libraryRepository.createPlaylist()
            _uiState.value = _uiState.value.copy(
                libraryTab = LibraryTab.Playlists,
                message = "Created ${playlist.title}.",
            )
        }
    }

    fun addCurrentTrackToPlaylist(playlistId: String) {
        val track = _uiState.value.currentTrack
        if (track == null) {
            _uiState.value = _uiState.value.copy(message = "Play a track before adding it to a playlist.")
            return
        }
        val playlist = _uiState.value.playlists.firstOrNull { it.id == playlistId }
        if (playlist != null && playlist.shared) {
            addCurrentTrackToSharedPlaylist(playlist)
            return
        }

        viewModelScope.launch {
            val added = libraryRepository.addTrackToPlaylist(playlistId, track)
            _uiState.value = _uiState.value.copy(
                message = if (added) {
                    "Added ${track.title} to ${playlist?.title ?: "playlist"}."
                } else {
                    "${track.title} is already in ${playlist?.title ?: "that playlist"}."
                },
            )
        }
    }

    private fun addCurrentTrackToSharedPlaylist(playlist: Playlist) {
        val state = _uiState.value
        val session = state.accountSession
        val track = state.currentTrack
        if (session == null) {
            _uiState.value = state.copy(message = "Sign in before editing shared playlists.")
            return
        }
        if (track == null) {
            _uiState.value = state.copy(message = "Play a track before adding it to a playlist.")
            return
        }
        if (playlist.shareRole !in setOf("owner", "editor")) {
            _uiState.value = state.copy(message = "You need editor access to add tracks to this shared playlist.")
            return
        }

        _uiState.value = state.copy(sharedTrackActionLoading = true, message = null)
        viewModelScope.launch {
            runCatching {
                api.addSharedPlaylistTrack(session.token, playlist.id, track)
                val refresh = refreshCloudLibrary(session)
                val activePlaylist = _uiState.value.activeMemberPlaylist
                val liveTracks = if (activePlaylist?.id == playlist.id) {
                    api.fetchSharedPlaylistTracks(session.token, playlist.id)
                } else {
                    null
                }
                SharedTrackEditResult(refresh.summary, liveTracks)
            }.onSuccess { result ->
                _uiState.value = _uiState.value.copy(
                    sharedPlaylistTracks = result.tracks ?: _uiState.value.sharedPlaylistTracks,
                    sharedTrackActionLoading = false,
                    lastSync = result.summary,
                    message = "Added ${track.title} to ${playlist.title}.",
                )
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    sharedTrackActionLoading = false,
                    message = error.message ?: "Could not add track to shared playlist.",
                )
            }
        }
    }

    fun sharePlaylist(playlist: Playlist) {
        val state = _uiState.value
        val session = state.accountSession
        if (session == null) {
            _uiState.value = state.copy(message = "Sign in before sharing playlists.")
            return
        }
        if (state.syncLoading || state.sharingPlaylistId != null) {
            _uiState.value = state.copy(message = "Wait for the current sync to finish before sharing.")
            return
        }

        _uiState.value = state.copy(
            sharingPlaylistId = playlist.id,
            syncLoading = true,
            message = null,
        )
        viewModelScope.launch {
            runCatching {
                val refresh = refreshCloudLibrary(session)
                val cloudPlaylist = findSyncedPlaylist(playlist, refresh.playlists)
                    ?: throw IllegalStateException("Sync finished, but this playlist was not returned from the cloud.")
                if (cloudPlaylist.shared && cloudPlaylist.shareRole != "owner") {
                    throw IllegalStateException("Only the playlist owner can create share links.")
                }
                val invite = api.createPlaylistInvite(session.token, cloudPlaylist.id)
                openShareTextIntent(
                    subject = "Spice playlist: ${cloudPlaylist.title}",
                    text = "Join my Spice playlist \"${cloudPlaylist.title}\": ${invite.inviteUrl}",
                )
                SharePlaylistResult(refresh.summary, cloudPlaylist.title)
            }.onSuccess { result ->
                _uiState.value = _uiState.value.copy(
                    syncLoading = false,
                    sharingPlaylistId = null,
                    lastSync = result.summary,
                    message = "Share link ready for ${result.playlistTitle}.",
                )
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    syncLoading = false,
                    sharingPlaylistId = null,
                    message = error.message ?: "Could not create playlist share link.",
                )
            }
        }
    }

    fun setQuality(quality: StreamQuality) {
        libraryRepository.setQuality(quality)
        _uiState.value = _uiState.value.copy(quality = quality)
    }

    fun setAuthMode(mode: AuthMode) {
        _uiState.value = _uiState.value.copy(
            authMode = mode,
            emailVerification = null,
            authVerificationCode = "",
            message = null,
        )
    }

    fun setAuthEmail(email: String) {
        _uiState.value = _uiState.value.copy(authEmail = email)
    }

    fun setAuthPassword(password: String) {
        _uiState.value = _uiState.value.copy(authPassword = password)
    }

    fun setAuthUsername(username: String) {
        _uiState.value = _uiState.value.copy(authUsername = username)
    }

    fun setAuthVerificationCode(code: String) {
        _uiState.value = _uiState.value.copy(
            authVerificationCode = code.filter(Char::isDigit).take(6),
        )
    }

    fun openProfileEditor() {
        val state = _uiState.value
        val session = state.accountSession
        if (session == null) {
            _uiState.value = state.copy(message = "Sign in before editing your profile.")
            return
        }

        val profile = state.profileSummary?.profile
        _uiState.value = state.copy(
            profileEditOpen = true,
            profileEditDisplayName = profile?.displayName?.takeIf { it.isNotBlank() }
                ?: session.account.displayName.takeIf { it.isNotBlank() }
                ?: session.account.email.substringBefore("@"),
            profileEditUsername = profile?.username?.takeIf { it.isNotBlank() }
                ?: session.account.username,
            profileEditAvatarUrl = profile?.avatarUrl?.takeIf { it.isNotBlank() }
                ?: session.account.avatarUrl,
            profileEditBio = profile?.bio.orEmpty(),
            profileEditPrivate = profile?.isPrivate == true,
            message = null,
        )
    }

    fun dismissProfileEditor() {
        _uiState.value = _uiState.value.copy(profileEditOpen = false, profileEditLoading = false)
    }

    fun setProfileEditDisplayName(value: String) {
        _uiState.value = _uiState.value.copy(profileEditDisplayName = value)
    }

    fun setProfileEditUsername(value: String) {
        _uiState.value = _uiState.value.copy(profileEditUsername = value)
    }

    fun setProfileEditAvatarUrl(value: String) {
        _uiState.value = _uiState.value.copy(profileEditAvatarUrl = value)
    }

    fun setProfileEditBio(value: String) {
        _uiState.value = _uiState.value.copy(profileEditBio = value)
    }

    fun setProfileEditPrivate(value: Boolean) {
        _uiState.value = _uiState.value.copy(profileEditPrivate = value)
    }

    fun saveProfileEdit() {
        val state = _uiState.value
        val session = state.accountSession
        if (session == null) {
            _uiState.value = state.copy(message = "Sign in before editing your profile.")
            return
        }

        val displayName = state.profileEditDisplayName.trim().ifEmpty { "Spice Listener" }
        val username = state.profileEditUsername.trim().lowercase()
        val avatarUrl = state.profileEditAvatarUrl.trim()
        val bio = state.profileEditBio.trim().ifEmpty { "No bio written yet." }

        if (!Regex("^[a-zA-Z0-9_]{3,20}$").matches(username)) {
            _uiState.value = state.copy(message = "Username must be 3-20 letters, numbers, or underscores.")
            return
        }

        if (avatarUrl.isNotBlank() && !avatarUrl.startsWith("https://") && !avatarUrl.startsWith("http://")) {
            _uiState.value = state.copy(message = "Profile picture must be an http or https URL.")
            return
        }

        _uiState.value = state.copy(profileEditLoading = true, message = null)
        viewModelScope.launch {
            runCatching {
                val remoteProfiles = api.fetchProfiles(session.token)
                val currentProfile = remoteProfiles.firstOrNull { it.id == "default" }
                    ?: state.profileSummary?.profile
                    ?: SpiceProfile(
                        id = "default",
                        displayName = displayName,
                        username = username,
                    )
                val updatedProfile = currentProfile.copy(
                    displayName = displayName,
                    username = username,
                    avatarUrl = avatarUrl,
                    bio = bio,
                    isPrivate = state.profileEditPrivate,
                    songsPlayed = currentProfile.songsPlayed.takeIf { it > 0 }
                        ?: state.profileSummary?.stats?.songsPlayed
                        ?: 0,
                )
                val profiles = if (remoteProfiles.any { it.id == updatedProfile.id }) {
                    remoteProfiles.map { profile -> if (profile.id == updatedProfile.id) updatedProfile else profile }
                } else {
                    remoteProfiles + updatedProfile
                }

                if (username != session.account.username) {
                    api.updateUsername(session.token, username, updatedProfile.id)
                }
                api.syncProfiles(session.token, profiles)
                api.fetchProfileSummary(session.token, session.account.id, updatedProfile.id)
            }.onSuccess { summary ->
                val updatedSession = session.copy(
                    account = session.account.copy(
                        username = summary.profile.username,
                        displayName = summary.profile.displayName,
                        avatarUrl = summary.profile.avatarUrl,
                    ),
                )
                sessionStore.save(updatedSession)
                _uiState.value = _uiState.value.copy(
                    accountSession = updatedSession,
                    profileSummary = summary,
                    profileEditOpen = false,
                    profileEditLoading = false,
                    message = "Profile updated.",
                )
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    profileEditLoading = false,
                    message = error.message ?: "Could not update profile.",
                )
            }
        }
    }

    fun submitAccount() {
        val state = _uiState.value
        val email = state.authEmail.trim()
        val password = state.authPassword
        val username = state.authUsername.trim()

        if (email.isEmpty() || password.isEmpty() || (state.authMode == AuthMode.SignUp && username.isEmpty())) {
            _uiState.value = state.copy(message = "Enter the required account fields.")
            return
        }

        _uiState.value = state.copy(accountLoading = true, message = null)
        viewModelScope.launch {
            if (state.authMode == AuthMode.SignUp) {
                runCatching { api.signUp(email, password, username) }
                    .onSuccess { challenge ->
                        _uiState.value = _uiState.value.copy(
                            emailVerification = challenge,
                            authVerificationCode = "",
                            authPassword = "",
                            accountLoading = false,
                            message = "We sent a six-digit code to ${challenge.email}.",
                        )
                    }
                    .onFailure { error ->
                        _uiState.value = _uiState.value.copy(
                            accountLoading = false,
                            message = error.message ?: "Account registration failed.",
                        )
                    }
            } else {
                runCatching { api.signIn(email, password) }
                    .onSuccess(::completeAccountSignIn)
                    .onFailure { error ->
                        _uiState.value = _uiState.value.copy(
                            accountLoading = false,
                            message = error.message ?: "Account sign-in failed.",
                        )
                    }
            }
        }
    }

    fun submitEmailVerification() {
        val state = _uiState.value
        val challenge = state.emailVerification ?: return
        if (state.authVerificationCode.length != 6) {
            _uiState.value = state.copy(message = "Enter the six-digit verification code.")
            return
        }
        _uiState.value = state.copy(accountLoading = true, message = null)
        viewModelScope.launch {
            runCatching { api.verifyEmail(challenge.registrationId, state.authVerificationCode) }
                .onSuccess(::completeAccountSignIn)
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        accountLoading = false,
                        message = error.message ?: "Email verification failed.",
                    )
                }
        }
    }

    fun resendEmailVerification() {
        val state = _uiState.value
        val challenge = state.emailVerification ?: return
        _uiState.value = state.copy(accountLoading = true, message = null)
        viewModelScope.launch {
            runCatching { api.resendEmailVerification(challenge.registrationId) }
                .onSuccess { refreshed ->
                    _uiState.value = _uiState.value.copy(
                        emailVerification = refreshed,
                        authVerificationCode = "",
                        accountLoading = false,
                        message = "A new verification code was sent to ${refreshed.email}.",
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        accountLoading = false,
                        message = error.message ?: "Could not resend the verification code.",
                    )
                }
        }
    }

    fun cancelEmailVerification() {
        _uiState.value = _uiState.value.copy(
            emailVerification = null,
            authVerificationCode = "",
            accountLoading = false,
            message = "Enter your account details to try again.",
        )
    }

    fun setPairingCode(code: String) {
        _uiState.value = _uiState.value.copy(
            pairingCode = formatSpiceConnectPairingCodeInput(code),
        )
    }

    fun claimPairingCode() {
        val normalizedCode = normalizeSpiceConnectPairingCodeInput(_uiState.value.pairingCode)
        if (!isCompleteSpiceConnectPairingCode(normalizedCode)) {
            _uiState.value = _uiState.value.copy(message = "Enter the eight-character pairing code.")
            return
        }

        _uiState.value = _uiState.value.copy(pairingLoading = true, message = null)
        viewModelScope.launch {
            runCatching {
                api.claimPairingCode(
                    code = normalizedCode,
                    deviceId = remoteDeviceId,
                    displayName = "Spice Android",
                ).also(pairedCredentialStore::save)
            }.onSuccess { credential ->
                _uiState.value = _uiState.value.copy(
                    pairedDeviceCredential = credential,
                    pairingCode = "",
                    pairingLoading = false,
                    connectStatus = "This phone is securely paired for Spice Connect.",
                    message = "Pairing complete. Spice Connect is ready.",
                )
                startSpiceConnect()
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    pairingLoading = false,
                    message = error.message ?: "Could not claim the pairing code.",
                )
            }
        }
    }

    fun disconnectPairedDevice() {
        clearPairedCredential("Paired-device access was removed from this phone.")
    }

    private fun completeAccountSignIn(session: AccountSession) {
        sessionStore.save(session)
        _uiState.value = _uiState.value.copy(
            accountSession = session,
            emailVerification = null,
            authVerificationCode = "",
            accountLoading = false,
            authPassword = "",
            message = "Signed in as ${session.account.email}.",
        )
        loadProfileSummary(session)
        syncLibrary(session)
        loadPendingAccountInvites(session)
        startSpiceConnect()
    }

    fun signOut() {
        sessionStore.clear()
        connectJob?.cancel()
        clearOptimisticRemoteState()
        connectPreferences.edit().remove(KEY_SELECTED_PLAYBACK_DEVICE_ID).apply()
        _uiState.value = _uiState.value.copy(
            accountSession = null,
            profileSummary = null,
            profileLoading = false,
            authPassword = "",
            emailVerification = null,
            authVerificationCode = "",
            lastSync = null,
            pendingAccountInvites = emptyList(),
            pendingInvitePreview = null,
            activeMemberPlaylist = null,
            playlistMembers = null,
            sharedPlaylistTracks = null,
            remoteDevices = emptyList(),
            selectedPlaybackDeviceId = "",
            connectLoading = false,
            connectStatus = "",
            message = "Signed out of Spice account.",
        )
        if (activePairedCredential() != null) startSpiceConnect()
    }

    fun syncNow() {
        val session = _uiState.value.accountSession
        if (session == null) {
            _uiState.value = _uiState.value.copy(message = "Sign in before syncing.")
            return
        }
        syncLibrary(session)
        loadProfileSummary(session)
        loadPendingAccountInvites(session)
    }

    fun openPlaylistInviteFromUri(uri: Uri?) {
        val token = uri?.getQueryParameter("playlistInvite")?.trim().orEmpty()
        if (token.isNotEmpty()) {
            openPlaylistInvite(token)
        }
    }

    fun openPlaylistInvite(token: String) {
        val normalized = token.trim()
        if (normalized.isEmpty() || _uiState.value.inviteLoading) return

        _uiState.value = _uiState.value.copy(inviteLoading = true, message = null)
        viewModelScope.launch {
            runCatching { api.previewPlaylistInvite(normalized) }
                .onSuccess { preview ->
                    _uiState.value = _uiState.value.copy(
                        screen = AppScreen.Library,
                        libraryTab = LibraryTab.Playlists,
                        inviteLoading = false,
                        pendingInvitePreview = preview,
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        inviteLoading = false,
                        message = error.message ?: "Could not open playlist invite.",
                    )
                }
        }
    }

    fun dismissPlaylistInvite() {
        _uiState.value = _uiState.value.copy(pendingInvitePreview = null, inviteLoading = false)
    }

    fun acceptPlaylistInvite() {
        val state = _uiState.value
        val preview = state.pendingInvitePreview ?: return
        val session = state.accountSession
        if (session == null) {
            _uiState.value = state.copy(
                screen = AppScreen.Settings,
                message = "Sign in before accepting playlist invites.",
            )
            return
        }

        _uiState.value = state.copy(inviteLoading = true, message = null)
        viewModelScope.launch {
            runCatching {
                api.acceptPlaylistInvite(session.token, preview.token)
                val refresh = refreshCloudLibrary(session)
                loadPendingAccountInvites(session, silent = true)
                refresh.summary
            }.onSuccess { summary ->
                _uiState.value = _uiState.value.copy(
                    screen = AppScreen.Library,
                    libraryTab = LibraryTab.Playlists,
                    inviteLoading = false,
                    pendingInvitePreview = null,
                    lastSync = summary,
                    message = "Added ${preview.playlist.title} to your shared playlists.",
                )
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    inviteLoading = false,
                    message = error.message ?: "Could not accept playlist invite.",
                )
            }
        }
    }

    fun refreshPendingAccountInvites() {
        val session = _uiState.value.accountSession
        if (session == null) {
            _uiState.value = _uiState.value.copy(message = "Sign in before checking playlist invites.")
            return
        }
        loadPendingAccountInvites(session)
    }

    fun acceptPendingPlaylistInvite(invite: PendingPlaylistInvite) {
        val state = _uiState.value
        val session = state.accountSession
        if (session == null) {
            _uiState.value = state.copy(message = "Sign in before accepting playlist invites.")
            return
        }

        _uiState.value = state.copy(accountInvitesLoading = true, message = null)
        viewModelScope.launch {
            runCatching {
                api.acceptPendingPlaylistInvite(session.token, invite.playlistId)
                val refresh = refreshCloudLibrary(session)
                val pending = api.fetchPendingPlaylistInvites(session.token)
                PendingInviteActionResult(refresh.summary, pending)
            }.onSuccess { result ->
                _uiState.value = _uiState.value.copy(
                    screen = AppScreen.Library,
                    libraryTab = LibraryTab.Playlists,
                    accountInvitesLoading = false,
                    pendingAccountInvites = result.pendingInvites,
                    lastSync = result.summary,
                    message = "Joined ${invite.playlistTitle}.",
                )
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    accountInvitesLoading = false,
                    message = error.message ?: "Could not accept playlist invite.",
                )
            }
        }
    }

    fun rejectPendingPlaylistInvite(invite: PendingPlaylistInvite) {
        val state = _uiState.value
        val session = state.accountSession
        if (session == null) {
            _uiState.value = state.copy(message = "Sign in before rejecting playlist invites.")
            return
        }

        _uiState.value = state.copy(accountInvitesLoading = true, message = null)
        viewModelScope.launch {
            runCatching {
                api.rejectPendingPlaylistInvite(session.token, invite.playlistId)
                api.fetchPendingPlaylistInvites(session.token)
            }.onSuccess { pending ->
                _uiState.value = _uiState.value.copy(
                    accountInvitesLoading = false,
                    pendingAccountInvites = pending,
                    message = "Rejected ${invite.playlistTitle}.",
                )
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    accountInvitesLoading = false,
                    message = error.message ?: "Could not reject playlist invite.",
                )
            }
        }
    }

    fun openPlaylistMembers(playlist: Playlist) {
        val state = _uiState.value
        val session = state.accountSession
        if (session == null && playlist.shared) {
            _uiState.value = state.copy(message = "Sign in before managing shared playlists.")
            return
        }
        if (state.membersLoading || state.memberActionLoading) return

        _uiState.value = state.copy(
            activeMemberPlaylist = playlist,
            playlistMembers = null,
            sharedPlaylistTracks = SharedPlaylistTracks(
                playlistId = playlist.id,
                role = playlist.shareRole.ifBlank { if (playlist.shared) "viewer" else "owner" },
                tracks = playlist.tracks.mapIndexed { index, track -> SharedPlaylistTrack(index, track) },
            ),
            membersLoading = true,
            memberInviteUsername = "",
            message = null,
        )
        if (session == null) {
            _uiState.value = _uiState.value.copy(membersLoading = false)
            return
        }
        viewModelScope.launch {
            runCatching {
                val membersDeferred = async { api.fetchPlaylistMembers(session.token, playlist.id) }
                val tracksDeferred = async { api.fetchSharedPlaylistTracks(session.token, playlist.id) }
                MemberSheetResult(playlist, membersDeferred.await(), tracksDeferred.await())
            }.onSuccess { result ->
                _uiState.value = _uiState.value.copy(
                    activeMemberPlaylist = result.playlist,
                    playlistMembers = result.members,
                    sharedPlaylistTracks = result.tracks,
                    membersLoading = false,
                )
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    membersLoading = false,
                    message = error.message ?: "Could not load playlist members.",
                )
            }
        }
    }

    fun dismissPlaylistMembers() {
        _uiState.value = _uiState.value.copy(
            activeMemberPlaylist = null,
            playlistMembers = null,
            sharedPlaylistTracks = null,
            membersLoading = false,
            memberActionLoading = false,
            sharedTrackActionLoading = false,
            memberInviteUsername = "",
        )
    }

    fun setMemberInviteUsername(username: String) {
        _uiState.value = _uiState.value.copy(memberInviteUsername = username)
    }

    fun invitePlaylistMember() {
        val state = _uiState.value
        val session = state.accountSession
        val playlist = state.activeMemberPlaylist
        val username = state.memberInviteUsername.trim()
        if (session == null || playlist == null) {
            _uiState.value = state.copy(message = "Open a signed-in playlist before inviting members.")
            return
        }
        if (username.isEmpty()) {
            _uiState.value = state.copy(message = "Enter a Spice username to invite.")
            return
        }

        _uiState.value = state.copy(memberActionLoading = true, message = null)
        viewModelScope.launch {
            runCatching {
                api.invitePlaylistMember(session.token, playlist.id, username)
                api.fetchPlaylistMembers(session.token, playlist.id)
            }.onSuccess { members ->
                _uiState.value = _uiState.value.copy(
                    playlistMembers = members,
                    memberActionLoading = false,
                    memberInviteUsername = "",
                    message = "Join request sent to @$username.",
                )
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    memberActionLoading = false,
                    message = error.message ?: "Could not invite playlist member.",
                )
            }
        }
    }

    fun removePlaylistMember(userId: String) {
        val state = _uiState.value
        val session = state.accountSession
        val playlist = state.activeMemberPlaylist
        if (session == null || playlist == null) return

        _uiState.value = state.copy(memberActionLoading = true, message = null)
        viewModelScope.launch {
            runCatching {
                api.removePlaylistMember(session.token, playlist.id, userId)
                api.fetchPlaylistMembers(session.token, playlist.id)
            }.onSuccess { members ->
                _uiState.value = _uiState.value.copy(
                    playlistMembers = members,
                    memberActionLoading = false,
                    message = "Member removed.",
                )
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    memberActionLoading = false,
                    message = error.message ?: "Could not remove playlist member.",
                )
            }
        }
    }

    fun removeSharedPlaylistTrack(track: SharedPlaylistTrack) {
        val state = _uiState.value
        val session = state.accountSession
        val playlist = state.activeMemberPlaylist
        if (session == null || playlist == null) return

        _uiState.value = state.copy(sharedTrackActionLoading = true, message = null)
        viewModelScope.launch {
            runCatching {
                api.removeSharedPlaylistTrack(session.token, playlist.id, track.position)
                val refresh = refreshCloudLibrary(session)
                val liveTracks = api.fetchSharedPlaylistTracks(session.token, playlist.id)
                SharedTrackEditResult(refresh.summary, liveTracks)
            }.onSuccess { result ->
                _uiState.value = _uiState.value.copy(
                    sharedPlaylistTracks = result.tracks,
                    sharedTrackActionLoading = false,
                    lastSync = result.summary,
                    message = "Removed ${track.track.title} from ${playlist.title}.",
                )
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    sharedTrackActionLoading = false,
                    message = error.message ?: "Could not remove track from shared playlist.",
                )
            }
        }
    }

    fun refreshActiveSharedPlaylistTracks() {
        val state = _uiState.value
        val session = state.accountSession
        val playlist = state.activeMemberPlaylist
        if (session == null || playlist == null) return

        _uiState.value = state.copy(sharedTrackActionLoading = true, message = null)
        viewModelScope.launch {
            runCatching { api.fetchSharedPlaylistTracks(session.token, playlist.id) }
                .onSuccess { tracks ->
                    _uiState.value = _uiState.value.copy(
                        sharedPlaylistTracks = tracks,
                        sharedTrackActionLoading = false,
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        sharedTrackActionLoading = false,
                        message = error.message ?: "Could not refresh shared playlist tracks.",
                    )
                }
        }
    }

    fun leaveActiveSharedPlaylist() {
        val state = _uiState.value
        val session = state.accountSession
        val playlist = state.activeMemberPlaylist
        if (session == null || playlist == null) return

        _uiState.value = state.copy(memberActionLoading = true, message = null)
        viewModelScope.launch {
            runCatching {
                api.removePlaylistMember(session.token, playlist.id)
                val refresh = refreshCloudLibrary(session)
                refresh.summary
            }.onSuccess { summary ->
                _uiState.value = _uiState.value.copy(
                    activeMemberPlaylist = null,
                    playlistMembers = null,
                    sharedPlaylistTracks = null,
                    memberActionLoading = false,
                    lastSync = summary,
                    message = "Left ${playlist.title}.",
                )
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    memberActionLoading = false,
                    message = error.message ?: "Could not leave shared playlist.",
                )
            }
        }
    }

    fun clearMessage() {
        _uiState.value = _uiState.value.copy(message = null)
        playerConnection.clearError()
    }

    fun retryHome() = loadHome()

    private fun handlePlaybackEnded() {
        viewModelScope.launch {
            val state = _uiState.value
            val nextIndex = nextQueueIndex(
                state = state,
                allowWrap = playerState.value.repeatMode == RepeatMode.All,
            )
            if (nextIndex == null) {
                _uiState.value = state.copy(message = "Queue finished.")
                return@launch
            }
            playQueueIndex(state.playbackQueue, nextIndex)
        }
    }

    fun loadCurrentLyrics() {
        val track = activePlayerTrack()
        if (track == null) {
            _uiState.value = _uiState.value.copy(message = "Play a track before opening lyrics.")
            return
        }
        _uiState.value = _uiState.value.copy(
            lyricsTrackId = track.id,
            lyricsPayload = null,
            lyricsLoading = true,
            message = null,
        )
        viewModelScope.launch {
            runCatching { api.fetchLyrics(track) }
                .onSuccess { lyrics ->
                    _uiState.value = _uiState.value.copy(
                        lyricsPayload = lyrics,
                        lyricsLoading = false,
                        message = if (lyrics.plainLyrics.isBlank() && lyrics.syncedLyrics.isBlank()) {
                            "No lyrics found for ${track.title}."
                        } else {
                            null
                        },
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        lyricsLoading = false,
                        message = error.message ?: "Could not load lyrics.",
                    )
                }
        }
    }

    fun dismissLyrics() {
        _uiState.value = _uiState.value.copy(lyricsTrackId = null, lyricsPayload = null, lyricsLoading = false)
    }

    fun selectPlaybackDevice(deviceId: String?) {
        val normalized = deviceId
            ?.trim()
            ?.takeUnless { it == remoteDeviceId }
            .orEmpty()
        if (normalized.isNotEmpty() && !hasRemoteAccess()) {
            _uiState.value = _uiState.value.copy(message = "Sign in or pair this phone to use Spice Connect.")
            return
        }

        if (normalized.isEmpty()) {
            clearOptimisticRemoteState()
            connectPreferences.edit().remove(KEY_SELECTED_PLAYBACK_DEVICE_ID).apply()
            _uiState.value = _uiState.value.copy(
                selectedPlaybackDeviceId = "",
                connectStatus = "Player controls now target this phone.",
            )
            return
        }

        val target = _uiState.value.remoteDevices.firstOrNull { it.deviceId == normalized }
        if (target == null) {
            _uiState.value = _uiState.value.copy(message = "That Spice Connect device is no longer available.")
            refreshSpiceConnect()
            return
        }

        playerConnection.pause()
        clearOptimisticRemoteState()
        connectPreferences.edit().putString(KEY_SELECTED_PLAYBACK_DEVICE_ID, normalized).apply()
        _uiState.value = _uiState.value.copy(
            selectedPlaybackDeviceId = normalized,
            connectStatus = "Player controls now target ${target.displayName}.",
        )
    }

    fun refreshSpiceConnect() {
        if (!hasRemoteAccess()) {
            _uiState.value = _uiState.value.copy(message = "Sign in or pair this phone to use Spice Connect.")
            return
        }
        _uiState.value = _uiState.value.copy(connectLoading = true, connectStatus = "")
        viewModelScope.launch {
            runCatching {
                withRemoteAccess { token ->
                    publishSpiceConnectDevice(token)
                    api.fetchRemoteDevices(token)
                }
            }.onSuccess { devices ->
                applyRemoteDeviceSnapshot(
                    devices = devices,
                    loading = false,
                    status = "${devices.count { it.deviceId != remoteDeviceId }} other device(s) visible.",
                )
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    connectLoading = false,
                    connectStatus = error.message ?: "Could not refresh Spice Connect.",
                    message = error.message ?: "Could not refresh Spice Connect.",
                )
            }
        }
    }

    private fun sendRemoteCommand(
        deviceId: String,
        command: String,
        payload: JSONObject = JSONObject(),
    ) {
        if (!hasRemoteAccess()) {
            _uiState.value = _uiState.value.copy(message = "Sign in or pair this phone to use Spice Connect.")
            return
        }
        if (deviceId == remoteDeviceId) {
            _uiState.value = _uiState.value.copy(connectStatus = "Choose another Spice Connect device.")
            return
        }
        viewModelScope.launch {
            runCatching {
                withRemoteAccess { token ->
                    api.sendRemoteCommand(
                        token = token,
                        targetDeviceId = deviceId,
                        sourceDeviceId = remoteDeviceId,
                        command = command,
                        payload = payload,
                    )
                }
            }.onSuccess {
                _uiState.value = _uiState.value.copy(
                    connectStatus = "Sent $command through Spice Connect.",
                )
                Log.i(SPICE_CONNECT_LOG_TAG, "Queued $command from $remoteDeviceId to $deviceId")
            }.onFailure { error ->
                clearOptimisticRemoteState(deviceId)
                _uiState.value = _uiState.value.copy(
                    connectStatus = error.message ?: "Spice Connect command failed.",
                    message = error.message ?: "Spice Connect command failed.",
                )
                Log.e(SPICE_CONNECT_LOG_TAG, "Failed to send $command from $remoteDeviceId to $deviceId", error)
                refreshSpiceConnect()
            }
        }
    }

    private fun playOnRemoteDevice(targetDeviceId: String, track: Track, queue: List<Track>) {
        val target = _uiState.value.remoteDevices.firstOrNull { it.deviceId == targetDeviceId }
        if (target == null) {
            unavailableRemoteTarget()
            return
        }

        val normalizedQueue = normalizeQueue(queue, track)
        val queueIndex = normalizedQueue.indexOfFirst { it.queueKey() == track.queueKey() }
            .takeIf { it >= 0 }
            ?: 0
        patchRemoteDevice(targetDeviceId) {
            it.copy(
                currentTrack = track,
                queue = normalizedQueue,
                queueIndex = queueIndex,
                isPlaying = true,
                progressMs = 0,
                durationMs = track.durationMs,
            )
        }
        sendRemoteCommand(
            targetDeviceId,
            "play_track",
            JSONObject()
                .put("track", track.toRemoteTrackJson())
                .put("queue", JSONArray(normalizedQueue.map { it.toRemoteTrackJson() }))
                .put("queueIndex", queueIndex),
        )
        _uiState.value = _uiState.value.copy(connectStatus = "Sent ${track.title} to ${target.displayName}.")
    }

    private fun patchRemoteQueueStep(deviceId: String, step: Int) {
        patchRemoteDevice(deviceId) { device ->
            val queue = device.queue
            if (queue.isEmpty()) return@patchRemoteDevice device.copy(isPlaying = true)
            val currentIndex = device.queueIndex.coerceIn(0, queue.lastIndex)
            val nextIndex = (currentIndex + step).mod(queue.size)
            val nextTrack = queue[nextIndex]
            device.copy(
                currentTrack = nextTrack,
                queueIndex = nextIndex,
                isPlaying = true,
                progressMs = 0,
                durationMs = nextTrack.durationMs,
            )
        }
    }

    private fun patchRemoteDevice(deviceId: String, transform: (RemoteDevice) -> RemoteDevice) {
        optimisticRemoteDeviceId = deviceId
        optimisticRemoteStateUntilElapsedMs = SystemClock.elapsedRealtime() + SPICE_CONNECT_OPTIMISTIC_STATE_WINDOW_MS
        _uiState.value = _uiState.value.copy(
            remoteDevices = _uiState.value.remoteDevices.map { device ->
                if (device.deviceId == deviceId) transform(device) else device
            },
        )
    }

    private fun clearOptimisticRemoteState(deviceId: String? = null) {
        if (deviceId != null && optimisticRemoteDeviceId != deviceId) return
        optimisticRemoteDeviceId = null
        optimisticRemoteStateUntilElapsedMs = 0L
    }

    private fun activeRemoteTargetId(): String? =
        _uiState.value.selectedPlaybackDeviceId.takeIf { it.isNotBlank() }

    private fun selectedRemoteDevice(): RemoteDevice? {
        val state = _uiState.value
        return state.remoteDevices.firstOrNull { it.deviceId == state.selectedPlaybackDeviceId }
    }

    private fun activePlayerTrack(): Track? =
        if (activeRemoteTargetId() == null) _uiState.value.currentTrack else selectedRemoteDevice()?.currentTrack

    private fun unavailableRemoteTarget() {
        _uiState.value = _uiState.value.copy(message = "The selected Spice Connect device is unavailable. Refreshing devices.")
        refreshSpiceConnect()
    }

    private fun migrateLegacyLibrary() {
        viewModelScope.launch {
            libraryRepository.migrateLegacySnapshotsIfNeeded()
        }
    }

    private fun observeLibrary() {
        viewModelScope.launch {
            combine(
                libraryRepository.likedTracks,
                libraryRepository.historyTracks,
                libraryRepository.playlists,
                libraryRepository.downloads,
            ) { liked, history, playlists, downloads ->
                LibrarySnapshot(liked, history, playlists, downloads)
            }
                .collect { snapshot ->
                    _uiState.value = _uiState.value.copy(
                        likedTracks = snapshot.liked,
                        historyTracks = snapshot.history,
                        playlists = snapshot.playlists,
                        downloads = snapshot.downloads,
                    )
                }
        }
    }

    private fun syncLibrary(session: AccountSession) {
        if (_uiState.value.syncLoading) return

        _uiState.value = _uiState.value.copy(syncLoading = true, message = null)
        viewModelScope.launch {
            runCatching {
                refreshCloudLibrary(session).summary
            }.onSuccess { summary ->
                _uiState.value = _uiState.value.copy(
                    syncLoading = false,
                    lastSync = summary,
                    message = "Synced ${summary.likedCount} liked tracks, ${summary.historyCount} history items, and ${summary.playlistCount} playlists.",
                )
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    syncLoading = false,
                    message = error.message ?: "Cloud sync failed.",
                )
            }
        }
    }

    private fun loadPendingAccountInvites(session: AccountSession, silent: Boolean = false) {
        if (!silent) {
            _uiState.value = _uiState.value.copy(accountInvitesLoading = true)
        }
        viewModelScope.launch {
            runCatching { api.fetchPendingPlaylistInvites(session.token) }
                .onSuccess { invites ->
                    _uiState.value = _uiState.value.copy(
                        pendingAccountInvites = invites,
                        accountInvitesLoading = false,
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        accountInvitesLoading = false,
                        message = if (silent) {
                            _uiState.value.message
                        } else {
                            error.message ?: "Could not load playlist invites."
                        },
                    )
                }
        }
    }

    private fun loadProfileSummary(session: AccountSession) {
        _uiState.value = _uiState.value.copy(profileLoading = true)
        viewModelScope.launch {
            runCatching { api.fetchProfileSummary(session.token, session.account.id) }
                .onSuccess { summary ->
                    val updatedSession = session.copy(
                        account = session.account.copy(
                            username = summary.profile.username,
                            displayName = summary.profile.displayName,
                            avatarUrl = summary.profile.avatarUrl,
                        ),
                    )
                    sessionStore.save(updatedSession)
                    _uiState.value = _uiState.value.copy(
                        accountSession = updatedSession,
                        profileSummary = summary,
                        profileLoading = false,
                    )
                }
                .onFailure {
                    _uiState.value = _uiState.value.copy(profileLoading = false)
                }
        }
    }

    private fun hasRemoteAccess(): Boolean = hasSpiceConnectAccess(
        hasAccountSession = _uiState.value.accountSession != null,
        hasPairedCredential = activePairedCredential() != null,
    )

    private fun activePairedCredential(): PairedDeviceCredential? {
        val credential = _uiState.value.pairedDeviceCredential ?: return null
        if (credential.deviceId != remoteDeviceId || credential.isExpired()) {
            clearPairedCredential("Paired-device access expired. Enter a new pairing code.")
            return null
        }
        return credential
    }

    private fun clearPairedCredential(message: String) {
        pairedCredentialStore.clear()
        clearOptimisticRemoteState()
        val state = _uiState.value
        val accountFallback = state.accountSession != null
        if (!accountFallback) {
            connectJob?.cancel()
            connectPreferences.edit().remove(KEY_SELECTED_PLAYBACK_DEVICE_ID).apply()
        }
        _uiState.value = state.copy(
            pairedDeviceCredential = null,
            pairingCode = "",
            pairingLoading = false,
            remoteDevices = if (accountFallback) state.remoteDevices else emptyList(),
            selectedPlaybackDeviceId = if (accountFallback) state.selectedPlaybackDeviceId else "",
            connectLoading = false,
            connectStatus = if (accountFallback) "Using the signed-in Spice account for Connect." else "",
            message = message,
        )
    }

    private suspend fun <T> withRemoteAccess(block: suspend (token: String) -> T): T {
        val pairedCredential = activePairedCredential()
        val accountToken = _uiState.value.accountSession?.token
        if (pairedCredential != null) {
            try {
                return block(pairedCredential.accessToken)
            } catch (error: SpiceApiException) {
                if (error.statusCode != 401) throw error
                clearPairedCredential("Paired-device access was revoked or expired.")
                if (!accountToken.isNullOrBlank()) return block(accountToken)
                throw SpiceApiException("Pairing expired or was revoked. Enter a new pairing code.", 401, error)
            }
        }
        if (!accountToken.isNullOrBlank()) return block(accountToken)
        throw SpiceApiException("Sign in or pair this phone to use Spice Connect.", 401)
    }

    private fun startSpiceConnect() {
        connectJob?.cancel()
        connectJob = viewModelScope.launch {
            var nextDeviceSnapshotAtMs = 0L
            var nextDeviceHeartbeatAtMs = 0L
            var lastPublishedFingerprint: String? = null
            while (true) {
                if (!hasRemoteAccess()) return@launch
                runCatching {
                    withRemoteAccess { token ->
                        val commands = api.fetchRemoteCommands(token, remoteDeviceId)
                        applyRemoteCommands(commands)

                        if (commands.isNotEmpty()) {
                            // MediaController callbacks settle asynchronously after a remote command.
                            delay(SPICE_CONNECT_COMMAND_STATE_SETTLE_MS)
                        }

                        val nowElapsedRealtimeMs = SystemClock.elapsedRealtime()
                        val currentFingerprint = spiceConnectDeviceFingerprint()
                        if (
                            commands.isNotEmpty() ||
                            currentFingerprint != lastPublishedFingerprint ||
                            nowElapsedRealtimeMs >= nextDeviceHeartbeatAtMs
                        ) {
                            publishSpiceConnectDevice(token)
                            lastPublishedFingerprint = spiceConnectDeviceFingerprint()
                            nextDeviceHeartbeatAtMs = nowElapsedRealtimeMs + SPICE_CONNECT_DEVICE_SYNC_INTERVAL_MS
                        }

                        val isControllingRemoteDevice = activeRemoteTargetId() != null
                        val shouldSyncDevices = shouldSyncSpiceConnectDevices(
                            nowElapsedRealtimeMs = nowElapsedRealtimeMs,
                            nextDeviceSyncAtMs = nextDeviceSnapshotAtMs,
                            receivedCommands = commands.isNotEmpty(),
                            isControllingRemoteDevice = isControllingRemoteDevice,
                        )
                        if (shouldSyncDevices) {
                            val devices = api.fetchRemoteDevices(token)
                            applyRemoteDeviceSnapshot(devices)
                            nextDeviceSnapshotAtMs = nextSpiceConnectDeviceSyncAt(
                                nowElapsedRealtimeMs = nowElapsedRealtimeMs,
                                receivedCommands = commands.isNotEmpty(),
                                isControllingRemoteDevice = isControllingRemoteDevice,
                            )
                        }
                    }
                }.onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        connectStatus = error.message ?: _uiState.value.connectStatus,
                    )
                }
                delay(SPICE_CONNECT_COMMAND_POLL_INTERVAL_MS)
            }
        }
    }

    private suspend fun publishSpiceConnectDevice(token: String) {
        val player = playerState.value
        api.updateRemoteDevice(
            token = token,
            deviceId = remoteDeviceId,
            displayName = "Spice Android",
            currentTrack = _uiState.value.currentTrack,
            isPlaying = player.isPlaying,
            shuffleEnabled = player.shuffleEnabled,
            repeatMode = player.repeatMode,
            progressMs = player.positionMs,
            durationMs = player.durationMs,
            volume = player.volume,
            queue = _uiState.value.playbackQueue,
            queueIndex = _uiState.value.queueIndex.coerceAtLeast(0),
        )
    }

    private fun spiceConnectDeviceFingerprint(): String {
        val state = _uiState.value
        val player = playerState.value
        return listOf(
            state.currentTrack?.id.orEmpty(),
            state.playbackQueue.joinToString(",") { it.id },
            state.queueIndex,
            player.isPlaying,
            player.shuffleEnabled,
            player.repeatMode,
            player.volume,
            player.positionMs / SPICE_CONNECT_PROGRESS_REPORT_BUCKET_MS,
            player.durationMs,
        ).joinToString("|")
    }

    private fun applyRemoteCommands(commands: List<RemoteCommand>) {
        commands.forEach { command ->
            Log.i(SPICE_CONNECT_LOG_TAG, "Applying ${command.command} (${command.id}) on $remoteDeviceId")
            when (command.command) {
                "toggle" -> playerConnection.toggle()
                "pause" -> playerConnection.pause()
                "play" -> if (!playerState.value.isPlaying && _uiState.value.currentTrack != null) playerConnection.toggle()
                "next" -> playNextLocally()
                "previous" -> playPreviousLocally()
                "seek" -> command.seekPositionMs?.let(playerConnection::seekTo)
                "volume" -> command.volume?.let(playerConnection::setVolume)
                "shuffle" -> command.shuffleEnabled?.let(playerConnection::setShuffle)
                "repeat" -> command.repeatMode?.let(playerConnection::setRepeatMode)
                "play_track" -> command.payloadTrack?.let { track ->
                    val queue = normalizeQueue(command.payloadQueue, track)
                    val requestedIndex = command.payloadQueueIndex.takeIf { it in queue.indices }
                    val trackIndex = queue.indexOfFirst { it.queueKey() == track.queueKey() }.takeIf { it >= 0 }
                    playQueueIndex(queue, requestedIndex ?: trackIndex ?: 0)
                }
            }
        }
    }

    private fun applyRemoteDeviceSnapshot(
        devices: List<RemoteDevice>,
        loading: Boolean = _uiState.value.connectLoading,
        status: String = _uiState.value.connectStatus,
    ) {
        val state = _uiState.value
        val nowElapsedRealtimeMs = SystemClock.elapsedRealtime()
        if (optimisticRemoteStateUntilElapsedMs <= nowElapsedRealtimeMs) {
            clearOptimisticRemoteState()
        }
        val optimisticDevice = optimisticRemoteDeviceId?.let { deviceId ->
            state.remoteDevices.firstOrNull { it.deviceId == deviceId }
        }
        val reconciledDevices = if (optimisticDevice != null) {
            devices.map { device ->
                if (device.deviceId == optimisticDevice.deviceId) {
                    optimisticDevice.copy(updatedAt = device.updatedAt)
                } else {
                    device
                }
            }
        } else {
            devices
        }
        val selectedId = state.selectedPlaybackDeviceId
        val selectedStillExists = selectedId.isBlank() || reconciledDevices.any { it.deviceId == selectedId }
        if (!selectedStillExists) {
            clearOptimisticRemoteState(selectedId)
            connectPreferences.edit().remove(KEY_SELECTED_PLAYBACK_DEVICE_ID).apply()
        }
        _uiState.value = state.copy(
            remoteDevices = reconciledDevices,
            selectedPlaybackDeviceId = selectedId.takeIf { selectedStillExists }.orEmpty(),
            connectLoading = loading,
            connectStatus = if (selectedStillExists) status else "Selected device went offline; using this phone.",
            message = if (selectedStillExists) state.message else "Selected Spice Connect device went offline. Playback controls are local again.",
        )
    }

    private suspend fun refreshCloudLibrary(session: AccountSession): CloudLibraryRefresh {
        val localLiked = libraryRepository.likedSnapshot()
        val localHistory = libraryRepository.historySnapshot()
        val localPlaylists = libraryRepository.playlistSnapshot()
        val summary = api.syncLibrary(session.token, localLiked, localHistory, localPlaylists)
        val remoteLiked = api.fetchLikedTracks(session.token)
        val remoteHistory = api.fetchHistoryTracks(session.token)
        val remotePlaylists = api.fetchPlaylists(session.token)
        libraryRepository.replaceLikedTracks(remoteLiked)
        libraryRepository.replaceHistoryTracks(remoteHistory)
        libraryRepository.replacePlaylists(remotePlaylists)
        return CloudLibraryRefresh(summary, remotePlaylists)
    }

    private fun findSyncedPlaylist(local: Playlist, remotePlaylists: List<Playlist>): Playlist? {
        val localTrackIds = local.tracks.map { it.id }
        return remotePlaylists.firstOrNull { it.id == local.id }
            ?: remotePlaylists.firstOrNull { remote ->
                remote.title == local.title && remote.tracks.map { it.id } == localTrackIds
            }
    }

    private fun openShareTextIntent(subject: String, text: String) {
        val shareIntent = Intent(Intent.ACTION_SEND)
            .setType("text/plain")
            .putExtra(Intent.EXTRA_SUBJECT, subject)
            .putExtra(Intent.EXTRA_TEXT, text)
        val chooser = Intent.createChooser(shareIntent, "Share playlist")
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        getApplication<Application>().startActivity(chooser)
    }

    private fun loadHome() {
        _uiState.value = _uiState.value.copy(homeLoading = true, message = null)
        viewModelScope.launch {
            runCatching {
                coroutineScope {
                    listOf(
                        "Quick Picks" to "Top Hits 2026",
                        "Lofi & Chill" to "Chill Study Lofi Beats",
                        "Workout Energy" to "Workout Gym Power",
                    ).map { (title, query) ->
                        async { FeedSection(title, api.search(query, 10)) }
                    }.awaitAll()
                }
            }.onSuccess { sections ->
                _uiState.value = _uiState.value.copy(homeSections = sections, homeLoading = false)
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    homeLoading = false,
                    message = error.message ?: "Home feed failed to load.",
                )
            }
        }
    }

    private suspend fun downloadSource(track: Track): DownloadSource =
        if (track.sourceId.startsWith("youtube")) {
            DownloadSource("https://www.youtube.com/watch?v=${track.id}", directFile = false)
        } else {
            DownloadSource(api.resolvePlayable(track, _uiState.value.quality).stream.url, directFile = true)
        }

    private fun loadRemoteDeviceId(): String {
        connectPreferences.getString(KEY_REMOTE_DEVICE_ID, null)?.let { return it }
        val id = "spice-android-${UUID.randomUUID()}"
        connectPreferences.edit().putString(KEY_REMOTE_DEVICE_ID, id).apply()
        return id
    }

    private fun loadSelectedPlaybackDeviceId(): String =
        connectPreferences.getString(KEY_SELECTED_PLAYBACK_DEVICE_ID, "").orEmpty()

    private fun startDownloadIntent(download: DownloadedTrack, action: String) {
        val file = File(download.filePath)
        if (!file.exists()) {
            _uiState.value = _uiState.value.copy(message = "That downloaded file is missing.")
            return
        }

        val uri = FileProvider.getUriForFile(
            getApplication(),
            "${getApplication<Application>().packageName}.fileprovider",
            file,
        )
        val intent = Intent(action)
            .setDataAndType(uri, download.mimeType)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        runCatching {
            getApplication<Application>().startActivity(intent)
        }.onFailure { error ->
            _uiState.value = _uiState.value.copy(message = error.message ?: "No app can open this download.")
        }
    }

    private fun mimeTypeForAudioFile(file: File): String =
        when (file.extension.lowercase()) {
            "m4a", "mp4" -> "audio/mp4"
            "mp3" -> "audio/mpeg"
            "opus" -> "audio/opus"
            "ogg" -> "audio/ogg"
            "webm" -> "audio/webm"
            else -> "audio/*"
        }

    private fun normalizeQueue(queue: List<Track>, selected: Track): List<Track> {
        val normalized = queue
            .ifEmpty { listOf(selected) }
            .filter { it.id.isNotBlank() }
            .distinctBy { it.queueKey() }
        return if (normalized.any { it.queueKey() == selected.queueKey() }) {
            normalized
        } else {
            listOf(selected) + normalized
        }
    }

    private fun nextQueueIndex(state: SpiceUiState, allowWrap: Boolean): Int? {
        val queue = state.playbackQueue
        if (queue.isEmpty()) return null
        if (playerState.value.shuffleEnabled && queue.size > 1) {
            val choices = queue.indices.filter { it != state.queueIndex }
            return choices.random(Random(System.nanoTime()))
        }
        val next = state.queueIndex + 1
        return when {
            next in queue.indices -> next
            allowWrap -> 0
            else -> null
        }
    }

    private fun List<Track>.replaceAt(index: Int, track: Track): List<Track> =
        mapIndexed { itemIndex, item -> if (itemIndex == index) track else item }

    private fun Track.queueKey(): String = "$sourceId:$id"

    private fun RepeatMode.next(): RepeatMode = when (this) {
        RepeatMode.Off -> RepeatMode.All
        RepeatMode.All -> RepeatMode.One
        RepeatMode.One -> RepeatMode.Off
    }

    private fun RepeatMode.remoteValue(): String = when (this) {
        RepeatMode.Off -> "none"
        RepeatMode.All -> "all"
        RepeatMode.One -> "one"
    }

    override fun onCleared() {
        playJob?.cancel()
        downloadJob?.cancel()
        connectJob?.cancel()
        playerConnection.release()
        super.onCleared()
    }

    private companion object {
        const val KEY_REMOTE_DEVICE_ID = "remote_device_id"
        const val KEY_SELECTED_PLAYBACK_DEVICE_ID = "selected_playback_device_id"
    }
}

private data class LibrarySnapshot(
    val liked: List<Track>,
    val history: List<Track>,
    val playlists: List<Playlist>,
    val downloads: List<DownloadedTrack>,
)

private data class CloudLibraryRefresh(
    val summary: LibrarySyncSummary,
    val playlists: List<Playlist>,
)

private data class SharePlaylistResult(
    val summary: LibrarySyncSummary,
    val playlistTitle: String,
)

private data class PendingInviteActionResult(
    val summary: LibrarySyncSummary,
    val pendingInvites: List<PendingPlaylistInvite>,
)

private data class MemberSheetResult(
    val playlist: Playlist,
    val members: PlaylistMembersSummary,
    val tracks: SharedPlaylistTracks,
)

private data class SharedTrackEditResult(
    val summary: LibrarySyncSummary,
    val tracks: SharedPlaylistTracks?,
)

private data class DownloadSource(
    val url: String,
    val directFile: Boolean,
)
