package xyz.spiceapp.mobile.playback

import android.content.ComponentName
import android.content.Context
import android.net.Uri
import androidx.core.content.ContextCompat
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import xyz.spiceapp.mobile.model.Track

data class PlayerUiState(
    val connected: Boolean = false,
    val mediaId: String = "",
    val title: String = "",
    val artist: String = "",
    val artworkUrl: String = "",
    val isPlaying: Boolean = false,
    val isBuffering: Boolean = false,
    val positionMs: Long = 0,
    val durationMs: Long = 0,
    val error: String? = null,
)

class PlayerConnection(context: Context) {
    private val appContext = context.applicationContext
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val _state = MutableStateFlow(PlayerUiState())
    val state: StateFlow<PlayerUiState> = _state.asStateFlow()

    private val sessionToken = SessionToken(
        appContext,
        ComponentName(appContext, SpicePlaybackService::class.java),
    )
    private val controllerFuture = MediaController.Builder(appContext, sessionToken).buildAsync()
    private var controller: MediaController? = null
    private var pendingAction: ((MediaController) -> Unit)? = null
    private var progressJob: Job? = null

    private val listener = object : Player.Listener {
        override fun onEvents(player: Player, events: Player.Events) {
            publishState(player)
            updateProgressLoop(player.isPlaying)
        }

        override fun onPlayerError(error: PlaybackException) {
            _state.value = _state.value.copy(
                isPlaying = false,
                isBuffering = false,
                error = error.message ?: "Android could not play this stream.",
            )
        }
    }

    init {
        controllerFuture.addListener(
            {
                runCatching { controllerFuture.get() }
                    .onSuccess { connectedController ->
                        controller = connectedController
                        connectedController.addListener(listener)
                        publishState(connectedController)
                        pendingAction?.invoke(connectedController)
                        pendingAction = null
                    }
                    .onFailure { error ->
                        _state.value = _state.value.copy(
                            error = error.message ?: "Could not connect to the playback service.",
                        )
                    }
            },
            ContextCompat.getMainExecutor(appContext),
        )
    }

    fun play(track: Track, streamUrl: String) {
        runWithController { activeController ->
            val metadata = MediaMetadata.Builder()
                .setTitle(track.title)
                .setArtist(track.artist)
                .setAlbumTitle(track.album)
                .apply {
                    if (track.artworkUrl.isNotBlank()) setArtworkUri(Uri.parse(track.artworkUrl))
                }
                .build()
            val mediaItem = MediaItem.Builder()
                .setMediaId(track.id)
                .setUri(streamUrl)
                .setMediaMetadata(metadata)
                .build()
            activeController.setMediaItem(mediaItem)
            activeController.prepare()
            activeController.play()
            publishState(activeController)
        }
    }

    fun toggle() {
        runWithController { activeController ->
            if (activeController.isPlaying) {
                activeController.pause()
            } else {
                if (activeController.playbackState == Player.STATE_IDLE) activeController.prepare()
                activeController.play()
            }
        }
    }

    fun seekTo(positionMs: Long) {
        runWithController { it.seekTo(positionMs.coerceAtLeast(0)) }
    }

    fun seekBy(deltaMs: Long) {
        runWithController { activeController ->
            val duration = activeController.duration.takeUnless { it == C.TIME_UNSET } ?: Long.MAX_VALUE
            activeController.seekTo((activeController.currentPosition + deltaMs).coerceIn(0, duration))
        }
    }

    fun stop() {
        runWithController { activeController ->
            activeController.stop()
            activeController.clearMediaItems()
            publishState(activeController)
        }
    }

    fun clearError() {
        _state.value = _state.value.copy(error = null)
    }

    fun release() {
        progressJob?.cancel()
        controller?.removeListener(listener)
        MediaController.releaseFuture(controllerFuture)
        controller = null
        scope.cancel()
    }

    private fun runWithController(action: (MediaController) -> Unit) {
        controller?.let(action) ?: run { pendingAction = action }
    }

    private fun publishState(player: Player) {
        val metadata = player.mediaMetadata
        _state.value = PlayerUiState(
            connected = true,
            mediaId = player.currentMediaItem?.mediaId.orEmpty(),
            title = metadata.title?.toString().orEmpty(),
            artist = metadata.artist?.toString().orEmpty(),
            artworkUrl = metadata.artworkUri?.toString().orEmpty(),
            isPlaying = player.isPlaying,
            isBuffering = player.playbackState == Player.STATE_BUFFERING,
            positionMs = player.currentPosition.coerceAtLeast(0),
            durationMs = player.duration.takeUnless { it == C.TIME_UNSET }?.coerceAtLeast(0) ?: 0,
            error = _state.value.error,
        )
    }

    private fun updateProgressLoop(playing: Boolean) {
        if (!playing) {
            progressJob?.cancel()
            progressJob = null
            return
        }
        if (progressJob?.isActive == true) return
        progressJob = scope.launch {
            while (isActive) {
                controller?.let(::publishState)
                delay(500)
            }
        }
    }
}
