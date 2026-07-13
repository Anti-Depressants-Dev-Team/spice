package xyz.spiceapp.mobile

internal const val SPICE_CONNECT_COMMAND_POLL_INTERVAL_MS = 1_500L
internal const val SPICE_CONNECT_COMMAND_STATE_SETTLE_MS = 750L
internal const val SPICE_CONNECT_DEVICE_SYNC_INTERVAL_MS = 30_000L
internal const val SPICE_CONNECT_CONTROLLER_REFRESH_INTERVAL_MS = 2_000L
internal const val SPICE_CONNECT_OPTIMISTIC_STATE_WINDOW_MS = 6_000L
internal const val SPICE_CONNECT_PROGRESS_REPORT_BUCKET_MS = 5_000L

internal fun shouldSyncSpiceConnectDevices(
    nowElapsedRealtimeMs: Long,
    nextDeviceSyncAtMs: Long,
    receivedCommands: Boolean,
    isControllingRemoteDevice: Boolean,
): Boolean = receivedCommands ||
    nowElapsedRealtimeMs >= nextDeviceSyncAtMs ||
    (isControllingRemoteDevice && nowElapsedRealtimeMs + SPICE_CONNECT_CONTROLLER_REFRESH_INTERVAL_MS < nextDeviceSyncAtMs)

internal fun nextSpiceConnectDeviceSyncAt(
    nowElapsedRealtimeMs: Long,
    receivedCommands: Boolean,
    isControllingRemoteDevice: Boolean,
): Long = nowElapsedRealtimeMs + when {
    receivedCommands -> SPICE_CONNECT_COMMAND_POLL_INTERVAL_MS
    isControllingRemoteDevice -> SPICE_CONNECT_CONTROLLER_REFRESH_INTERVAL_MS
    else -> SPICE_CONNECT_DEVICE_SYNC_INTERVAL_MS
}

internal fun normalizeSpiceConnectPairingCodeInput(value: String): String = value
    .uppercase()
    .filter(Char::isLetterOrDigit)
    .take(8)

internal fun formatSpiceConnectPairingCodeInput(value: String): String {
    val normalized = normalizeSpiceConnectPairingCodeInput(value)
    return if (normalized.length <= 4) normalized else "${normalized.take(4)}-${normalized.drop(4)}"
}

internal fun isCompleteSpiceConnectPairingCode(value: String): Boolean =
    normalizeSpiceConnectPairingCodeInput(value).length == 8

internal fun hasSpiceConnectAccess(
    hasAccountSession: Boolean,
    hasPairedCredential: Boolean,
): Boolean = hasAccountSession || hasPairedCredential
