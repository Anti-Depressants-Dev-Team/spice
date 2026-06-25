package xyz.spiceapp.mobile

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import xyz.spiceapp.mobile.data.LibraryStore
import xyz.spiceapp.mobile.data.SpiceApi
import xyz.spiceapp.mobile.model.AppScreen
import xyz.spiceapp.mobile.model.FeedSection
import xyz.spiceapp.mobile.model.LibraryTab
import xyz.spiceapp.mobile.model.StreamQuality
import xyz.spiceapp.mobile.model.Track
import xyz.spiceapp.mobile.playback.PlayerConnection
import xyz.spiceapp.mobile.playback.PlayerUiState

data class SpiceUiState(
    val screen: AppScreen = AppScreen.Home,
    val homeSections: List<FeedSection> = emptyList(),
    val homeLoading: Boolean = true,
    val searchQuery: String = "",
    val searchResults: List<Track> = emptyList(),
    val searchLoading: Boolean = false,
    val resolvingTrackId: String? = null,
    val currentTrack: Track? = null,
    val likedTracks: List<Track> = emptyList(),
    val historyTracks: List<Track> = emptyList(),
    val libraryTab: LibraryTab = LibraryTab.Playlists,
    val quality: StreamQuality = StreamQuality.Standard,
    val message: String? = null,
)

class SpiceViewModel(application: Application) : AndroidViewModel(application) {
    private val api = SpiceApi()
    private val libraryStore = LibraryStore(application)
    private val playerConnection = PlayerConnection(application)
    private var playJob: Job? = null
    private val _uiState = MutableStateFlow(
        SpiceUiState(
            likedTracks = libraryStore.liked(),
            historyTracks = libraryStore.history(),
            quality = libraryStore.quality(),
        ),
    )
    val uiState: StateFlow<SpiceUiState> = _uiState.asStateFlow()
    val playerState: StateFlow<PlayerUiState> = playerConnection.state

    init {
        loadHome()
    }

    fun selectScreen(screen: AppScreen) {
        _uiState.value = _uiState.value.copy(
            screen = screen,
            likedTracks = libraryStore.liked(),
            historyTracks = libraryStore.history(),
        )
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

    fun play(track: Track) {
        playJob?.cancel()
        _uiState.value = _uiState.value.copy(
            resolvingTrackId = track.id,
            currentTrack = track,
            message = null,
        )
        playJob = viewModelScope.launch {
            try {
                val playback = api.resolvePlayable(track, _uiState.value.quality)
                libraryStore.addToHistory(playback.track)
                _uiState.value = _uiState.value.copy(
                    resolvingTrackId = null,
                    currentTrack = playback.track,
                    historyTracks = libraryStore.history(),
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
                    currentTrack = null,
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
            resolvingTrackId = null,
            message = null,
        )
        playerConnection.clearError()
        playerConnection.play(
            track,
            "android.resource://" + getApplication<Application>().packageName + "/" + R.raw.engine_test,
        )
    }
    fun togglePlayback() = playerConnection.toggle()

    fun seekTo(positionMs: Long) = playerConnection.seekTo(positionMs)

    fun seekBy(deltaMs: Long) = playerConnection.seekBy(deltaMs)

    fun stopPlayback() = playerConnection.stop()

    fun toggleLike(track: Track) {
        libraryStore.toggleLike(track)
        _uiState.value = _uiState.value.copy(likedTracks = libraryStore.liked())
    }

    fun setLibraryTab(tab: LibraryTab) {
        _uiState.value = _uiState.value.copy(
            libraryTab = tab,
            likedTracks = libraryStore.liked(),
            historyTracks = libraryStore.history(),
        )
    }

    fun setQuality(quality: StreamQuality) {
        libraryStore.setQuality(quality)
        _uiState.value = _uiState.value.copy(quality = quality)
    }

    fun clearMessage() {
        _uiState.value = _uiState.value.copy(message = null)
        playerConnection.clearError()
    }

    fun retryHome() = loadHome()

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

    override fun onCleared() {
        playJob?.cancel()
        playerConnection.release()
        super.onCleared()
    }
}
