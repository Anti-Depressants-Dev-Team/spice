package xyz.spiceapp.mobile

import java.text.Normalizer
import java.util.Locale

internal const val SPICE_CONNECT_COMMAND_POLL_INTERVAL_MS = 500L
internal const val SPICE_CONNECT_COMMAND_STATE_SETTLE_MS = 250L
internal const val SPICE_CONNECT_DEVICE_SYNC_INTERVAL_MS = 20_000L
internal const val SPICE_CONNECT_CONTROLLER_REFRESH_INTERVAL_MS = 750L
internal const val SPICE_CONNECT_OPTIMISTIC_STATE_WINDOW_MS = 6_000L
internal const val SPICE_CONNECT_PROGRESS_REPORT_BUCKET_MS = 1_000L
private const val SPICE_CONNECT_PAIRING_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

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

internal fun normalizeSpiceConnectPairingCodeInput(value: String): String =
    Normalizer.normalize(value, Normalizer.Form.NFKC)
        .uppercase(Locale.ROOT)
        .filter(SPICE_CONNECT_PAIRING_ALPHABET::contains)
        .take(8)

internal fun formatSpiceConnectPairingCodeInput(value: String): String {
    val padded = normalizeSpiceConnectPairingCodeInput(value).padEnd(8, '_')
    return "${padded.take(4)}-${padded.drop(4)}"
}

internal data class SpiceConnectPairingCodeEdit(
    val text: String,
    val selectionStart: Int,
    val selectionEnd: Int,
)

internal fun sanitizeSpiceConnectPairingCodeEdit(
    value: String,
    selectionStart: Int,
    selectionEnd: Int,
): SpiceConnectPairingCodeEdit {
    val normalized = normalizeSpiceConnectPairingCodeInput(value)
    fun normalizedOffset(offset: Int): Int = normalizeSpiceConnectPairingCodeInput(
        value.take(offset.coerceIn(0, value.length)),
    )
        .length
        .coerceAtMost(normalized.length)
    return SpiceConnectPairingCodeEdit(
        text = normalized,
        selectionStart = normalizedOffset(selectionStart),
        selectionEnd = normalizedOffset(selectionEnd),
    )
}

internal fun spiceConnectPairingCodeForSubmission(value: String): String? {
    val normalized = normalizeSpiceConnectPairingCodeInput(value)
    return normalized.takeIf { it.length == 8 }?.let { "${it.take(4)}-${it.drop(4)}" }
}

internal fun isCompleteSpiceConnectPairingCode(value: String): Boolean =
    normalizeSpiceConnectPairingCodeInput(value).length == 8

internal fun hasSpiceConnectAccess(
    hasAccountSession: Boolean,
    hasPairedCredential: Boolean,
): Boolean = hasAccountSession || hasPairedCredential

internal fun requiresSpiceConnectDeviceRegistration(
    publishedAccessIdentity: String?,
    activeAccessIdentity: String,
): Boolean = publishedAccessIdentity != activeAccessIdentity

internal fun shouldResetSpiceConnectDeviceRegistration(commandPollStatusCode: Int?): Boolean =
    commandPollStatusCode == 404

internal fun projectedSpiceConnectProgressMs(
    progressMs: Long,
    durationMs: Long,
    isPlaying: Boolean,
    observedAtElapsedRealtimeMs: Long,
    nowElapsedRealtimeMs: Long,
): Long {
    val elapsed = if (isPlaying && observedAtElapsedRealtimeMs > 0L) {
        (nowElapsedRealtimeMs - observedAtElapsedRealtimeMs).coerceAtLeast(0L)
    } else {
        0L
    }
    val projected = (progressMs.coerceAtLeast(0L) + elapsed).coerceAtLeast(0L)
    return durationMs.takeIf { it > 0L }?.let(projected::coerceAtMost) ?: projected
}

internal class BoundedSpiceConnectCommandIds(
    private val capacity: Int,
    initialIds: Iterable<String> = emptyList(),
) {
    private val ids = LinkedHashSet<String>()

    init {
        require(capacity > 0)
        initialIds.forEach(::markIfNew)
    }

    @Synchronized
    fun markIfNew(commandId: String): Boolean {
        val normalized = commandId.trim()
        if (normalized.isEmpty() || !ids.add(normalized)) return false
        while (ids.size > capacity) {
            ids.remove(ids.first())
        }
        return true
    }

    @Synchronized
    fun contains(commandId: String): Boolean = ids.contains(commandId.trim())

    @Synchronized
    fun snapshot(): List<String> = ids.toList()
}
