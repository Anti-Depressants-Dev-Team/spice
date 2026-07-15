package xyz.spiceapp.mobile

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import xyz.spiceapp.mobile.data.update.OFFICIAL_SPICE_RELEASES_URL
import xyz.spiceapp.mobile.ui.SpiceApp
import xyz.spiceapp.mobile.ui.SpiceTheme
import java.io.File

class MainActivity : ComponentActivity() {
    private val viewModel: SpiceViewModel by viewModels()
    private var pendingUpdateApkPath: String? = null
    private var pendingUpdateVersion: String? = null
    private val unknownSourcesLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) {
        val path = pendingUpdateApkPath ?: return@registerForActivityResult
        val version = pendingUpdateVersion ?: return@registerForActivityResult
        pendingUpdateApkPath = null
        pendingUpdateVersion = null
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            !packageManager.canRequestPackageInstalls()
        ) {
            viewModel.reportAppUpdateInstallError(
                "Allow SPICE to install unknown apps before installing this signed update.",
            )
        } else {
            openAppUpdateInstaller(path, version)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        pendingUpdateApkPath = savedInstanceState?.getString(STATE_PENDING_UPDATE_APK_PATH)
        pendingUpdateVersion = savedInstanceState?.getString(STATE_PENDING_UPDATE_VERSION)
        enableEdgeToEdge()
        setContent {
            SpiceRoot(
                viewModel = viewModel,
                onInstallAppUpdate = ::requestAppUpdateInstall,
                onOpenAppUpdateReleasePage = ::openOfficialSpiceReleases,
            )
        }
        viewModel.openPlaylistInviteFromUri(intent?.data)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        pendingUpdateApkPath?.let { outState.putString(STATE_PENDING_UPDATE_APK_PATH, it) }
        pendingUpdateVersion?.let { outState.putString(STATE_PENDING_UPDATE_VERSION, it) }
        super.onSaveInstanceState(outState)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        viewModel.openPlaylistInviteFromUri(intent.data)
    }

    private fun requestAppUpdateInstall(apkPath: String, expectedReleaseVersion: String) {
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            !packageManager.canRequestPackageInstalls()
        ) {
            pendingUpdateApkPath = apkPath
            pendingUpdateVersion = expectedReleaseVersion
            val settingsIntent = Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:$packageName"),
            )
            runCatching { unknownSourcesLauncher.launch(settingsIntent) }
                .onFailure { error ->
                    pendingUpdateApkPath = null
                    pendingUpdateVersion = null
                    viewModel.reportAppUpdateInstallError(
                        error.message ?: "Android could not open the unknown-apps setting.",
                    )
                }
            return
        }
        openAppUpdateInstaller(apkPath, expectedReleaseVersion)
    }

    private fun openAppUpdateInstaller(apkPath: String, expectedReleaseVersion: String) {
        when (
            val result = launchAppUpdateInstaller(
                activity = this,
                apkFile = File(apkPath),
                expectedReleaseVersion = expectedReleaseVersion,
            )
        ) {
            AppUpdateInstallResult.Launched -> Unit
            is AppUpdateInstallResult.Failed -> viewModel.reportAppUpdateInstallError(result.message)
        }
    }

    private fun openOfficialSpiceReleases() {
        runCatching {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(OFFICIAL_SPICE_RELEASES_URL)))
        }.onFailure { error ->
            viewModel.reportAppUpdateInstallError(
                error.message ?: "Android could not open the official SPICE release page.",
            )
        }
    }

    private companion object {
        const val STATE_PENDING_UPDATE_APK_PATH = "pending_update_apk_path"
        const val STATE_PENDING_UPDATE_VERSION = "pending_update_version"
    }
}

@Composable
private fun SpiceRoot(
    viewModel: SpiceViewModel,
    onInstallAppUpdate: (String, String) -> Unit,
    onOpenAppUpdateReleasePage: () -> Unit,
) {
    val context = LocalContext.current
    val notificationPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) {}
    val uiState = viewModel.uiState.collectAsStateWithLifecycle().value
    val playerState = viewModel.playerState.collectAsStateWithLifecycle().value
    LaunchedEffect(uiState.accentTheme) {
        LauncherIconManager(context.applicationContext).apply(uiState.accentTheme)
    }
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
            onHandoffPlayback = viewModel::handoffPlaybackToSelectedDevice,
            onSleepTimerMinutes = viewModel::setSleepTimerMinutes,
            onSleepTimerEndTrack = viewModel::setSleepTimerEndOfTrack,
            onSleepTimerEndQueue = viewModel::setSleepTimerEndOfQueue,
            onSleepTimerCancel = viewModel::cancelSleepTimer,
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
            onDownloadAppUpdate = {
                ensureNotificationPermission()
                viewModel.downloadAppUpdate()
            },
            onCancelAppUpdateDownload = viewModel::cancelAppUpdateDownload,
            onDismissAppUpdate = viewModel::dismissAppUpdate,
            onInstallAppUpdate = onInstallAppUpdate,
            onOpenAppUpdateReleasePage = onOpenAppUpdateReleasePage,
            onClearMessage = viewModel::clearMessage,
        )
    }
}
