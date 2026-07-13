package xyz.spiceapp.mobile

import android.Manifest
import android.content.Intent
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
        setContent { SpiceRoot(viewModel) }
        viewModel.openPlaylistInviteFromUri(intent?.data)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        viewModel.openPlaylistInviteFromUri(intent.data)
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

    SpiceTheme(uiState.accentTheme) {
        SpiceApp(
            uiState = uiState,
            playerState = playerState,
            onScreenSelected = viewModel::selectScreen,
            onSearchQueryChanged = viewModel::setSearchQuery,
            onSearch = viewModel::search,
            onTrackSelected = { track, queue ->
                ensureNotificationPermission()
                viewModel.play(track, queue)
            },
            onTogglePlayback = viewModel::togglePlayback,
            onPlayNext = viewModel::playNext,
            onPlayPrevious = viewModel::playPrevious,
            onSeekTo = viewModel::seekTo,
            onToggleShuffle = viewModel::toggleShuffle,
            onCycleRepeat = viewModel::cycleRepeat,
            onStopPlayback = viewModel::stopPlayback,
            onToggleLike = viewModel::toggleLike,
            onAccentSelected = viewModel::setAccentTheme,
            onLibraryTabSelected = viewModel::setLibraryTab,
            onCreatePlaylist = viewModel::createPlaylist,
            onAddCurrentTrackToPlaylist = viewModel::addCurrentTrackToPlaylist,
            onSharePlaylist = viewModel::sharePlaylist,
            onAcceptPlaylistInvite = viewModel::acceptPlaylistInvite,
            onDismissPlaylistInvite = viewModel::dismissPlaylistInvite,
            onRefreshPendingInvites = viewModel::refreshPendingAccountInvites,
            onAcceptPendingInvite = viewModel::acceptPendingPlaylistInvite,
            onRejectPendingInvite = viewModel::rejectPendingPlaylistInvite,
            onOpenPlaylistMembers = viewModel::openPlaylistMembers,
            onDismissPlaylistMembers = viewModel::dismissPlaylistMembers,
            onMemberInviteUsernameChanged = viewModel::setMemberInviteUsername,
            onInvitePlaylistMember = viewModel::invitePlaylistMember,
            onRemovePlaylistMember = viewModel::removePlaylistMember,
            onLeaveSharedPlaylist = viewModel::leaveActiveSharedPlaylist,
            onRemoveSharedPlaylistTrack = viewModel::removeSharedPlaylistTrack,
            onRefreshSharedPlaylistTracks = viewModel::refreshActiveSharedPlaylistTracks,
            onAuthModeSelected = viewModel::setAuthMode,
            onAuthEmailChanged = viewModel::setAuthEmail,
            onAuthPasswordChanged = viewModel::setAuthPassword,
            onAuthUsernameChanged = viewModel::setAuthUsername,
            onSubmitAccount = viewModel::submitAccount,
            onAuthVerificationCodeChanged = viewModel::setAuthVerificationCode,
            onSubmitEmailVerification = viewModel::submitEmailVerification,
            onResendEmailVerification = viewModel::resendEmailVerification,
            onCancelEmailVerification = viewModel::cancelEmailVerification,
            onPairingCodeChanged = viewModel::setPairingCode,
            onClaimPairingCode = viewModel::claimPairingCode,
            onDisconnectPairedDevice = viewModel::disconnectPairedDevice,
            onSignOut = viewModel::signOut,
            onOpenProfileEditor = viewModel::openProfileEditor,
            onDismissProfileEditor = viewModel::dismissProfileEditor,
            onProfileDisplayNameChanged = viewModel::setProfileEditDisplayName,
            onProfileUsernameChanged = viewModel::setProfileEditUsername,
            onProfileAvatarUrlChanged = viewModel::setProfileEditAvatarUrl,
            onProfileBioChanged = viewModel::setProfileEditBio,
            onProfilePrivateChanged = viewModel::setProfileEditPrivate,
            onSaveProfile = viewModel::saveProfileEdit,
            onSyncNow = viewModel::syncNow,
            onRefreshSpiceConnect = viewModel::refreshSpiceConnect,
            onPlaybackDeviceSelected = viewModel::selectPlaybackDevice,
            onTestEngine = {
                ensureNotificationPermission()
                viewModel.playEngineTest()
            },
            onDownloadTrack = viewModel::downloadTrack,
            onCancelDownload = viewModel::cancelDownload,
            onLoadLyrics = viewModel::loadCurrentLyrics,
            onDismissLyrics = viewModel::dismissLyrics,
            onOpenDownload = viewModel::openDownload,
            onShareDownload = viewModel::shareDownload,
            onRemoveDownload = viewModel::removeDownload,
            onRetryHome = viewModel::retryHome,
            onClearMessage = viewModel::clearMessage,
        )
    }
}
