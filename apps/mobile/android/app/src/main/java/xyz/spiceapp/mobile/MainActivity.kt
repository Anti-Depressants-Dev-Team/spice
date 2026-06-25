package xyz.spiceapp.mobile

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import xyz.spiceapp.mobile.ui.SpiceApp
import xyz.spiceapp.mobile.ui.SpiceTheme

class MainActivity : ComponentActivity() {
    private val viewModel: SpiceViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { SpiceTheme { SpiceRoot(viewModel) } }
    }
}

@Composable
private fun SpiceRoot(viewModel: SpiceViewModel) {
    val context = LocalContext.current
    val notificationPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) {}
    val uiState = viewModel.uiState.collectAsStateWithLifecycle().value
    val playerState = viewModel.playerState.collectAsStateWithLifecycle().value
    val ensureNotificationPermission = {
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    SpiceApp(
        uiState = uiState,
        playerState = playerState,
        onScreenSelected = viewModel::selectScreen,
        onSearchQueryChanged = viewModel::setSearchQuery,
        onSearch = viewModel::search,
        onTrackSelected = { track ->
            ensureNotificationPermission()
            viewModel.play(track)
        },
        onTogglePlayback = viewModel::togglePlayback,
        onSeekTo = viewModel::seekTo,
        onSeekBy = viewModel::seekBy,
        onStopPlayback = viewModel::stopPlayback,
        onToggleLike = viewModel::toggleLike,
        onLibraryTabSelected = viewModel::setLibraryTab,
        onQualitySelected = viewModel::setQuality,
        onTestEngine = {
            ensureNotificationPermission()
            viewModel.playEngineTest()
        },
        onRetryHome = viewModel::retryHome,
        onClearMessage = viewModel::clearMessage,
    )
}
