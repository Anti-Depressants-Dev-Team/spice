package xyz.spiceapp.mobile

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SpiceConnectPollingTest {
    @Test
    fun usesRealtimeWakeupsWithAConservativePollingFallback() {
        assertEquals(5_000L, SPICE_CONNECT_COMMAND_POLL_INTERVAL_MS)
        assertEquals(30_000L, SPICE_CONNECT_REALTIME_FALLBACK_POLL_INTERVAL_MS)
        assertEquals(250L, SPICE_CONNECT_REALTIME_RECONNECT_MIN_MS)
        assertEquals(5_000L, SPICE_CONNECT_REALTIME_RECONNECT_MAX_MS)
        assertEquals(500L, SPICE_CONNECT_COMMAND_STATE_SETTLE_MS)
        assertEquals(60_000L, SPICE_CONNECT_DEVICE_SYNC_INTERVAL_MS)
        assertEquals(30_000L, SPICE_CONNECT_CONTROLLER_REFRESH_INTERVAL_MS)
        assertEquals(6_000L, SPICE_CONNECT_OPTIMISTIC_STATE_WINDOW_MS)
    }

    @Test
    fun waitsUntilDeviceSyncDeadlineWhenNoCommandsArrive() {
        assertFalse(
            shouldSyncSpiceConnectDevices(
                nowElapsedRealtimeMs = 59_999L,
                nextDeviceSyncAtMs = 60_000L,
                receivedCommands = false,
                isControllingRemoteDevice = false,
            ),
        )
    }

    @Test
    fun syncsExactlyAtDeviceSyncDeadline() {
        assertTrue(
            shouldSyncSpiceConnectDevices(
                nowElapsedRealtimeMs = 60_000L,
                nextDeviceSyncAtMs = 60_000L,
                receivedCommands = false,
                isControllingRemoteDevice = false,
            ),
        )
    }

    @Test
    fun receivedCommandsTriggerImmediateDeviceSyncBeforeDeadline() {
        assertTrue(
            shouldSyncSpiceConnectDevices(
                nowElapsedRealtimeMs = 1_500L,
                nextDeviceSyncAtMs = 60_000L,
                receivedCommands = true,
                isControllingRemoteDevice = false,
            ),
        )
        assertEquals(
            6_500L,
            nextSpiceConnectDeviceSyncAt(
                nowElapsedRealtimeMs = 1_500L,
                receivedCommands = true,
                isControllingRemoteDevice = false,
            ),
        )
        assertEquals(
            61_500L,
            nextSpiceConnectDeviceSyncAt(
                nowElapsedRealtimeMs = 1_500L,
                receivedCommands = false,
                isControllingRemoteDevice = false,
            ),
        )
    }

    @Test
    fun activelyControlledReceiverRefreshesWithoutWaitingForHeartbeat() {
        assertTrue(
            shouldSyncSpiceConnectDevices(
                nowElapsedRealtimeMs = 2_000L,
                nextDeviceSyncAtMs = 60_000L,
                receivedCommands = false,
                isControllingRemoteDevice = true,
            ),
        )
        assertEquals(
            32_000L,
            nextSpiceConnectDeviceSyncAt(
                nowElapsedRealtimeMs = 2_000L,
                receivedCommands = false,
                isControllingRemoteDevice = true,
            ),
        )
    }

    @Test
    fun realtimeStateEventsRefreshDeviceSnapshotsWithoutWaitingForFallback() {
        assertTrue(
            shouldSyncSpiceConnectDevices(
                nowElapsedRealtimeMs = 1_500L,
                nextDeviceSyncAtMs = 60_000L,
                receivedCommands = false,
                receivedStateUpdate = true,
                isControllingRemoteDevice = false,
            ),
        )
    }

    @Test
    fun pairingCodeInputUsesAStableFourByFourDisplayFormat() {
        assertEquals("____-____", formatSpiceConnectPairingCodeInput(""))
        assertEquals("2___-____", formatSpiceConnectPairingCodeInput("2"))
        assertEquals("2W8P-CLU7", formatSpiceConnectPairingCodeInput("2w8pclu7"))
        assertEquals("2W8P-CL__", formatSpiceConnectPairingCodeInput("2w8p-cl"))
        assertEquals("2W8PCLU7", normalizeSpiceConnectPairingCodeInput("2W8P-CLU7"))
        assertEquals("2W8P-CLU7", spiceConnectPairingCodeForSubmission("2w8p‑clu7"))
        assertEquals("ABCD2345", normalizeSpiceConnectPairingCodeInput("ａｂｃｄ－２３４５"))
        assertEquals("2345", normalizeSpiceConnectPairingCodeInput("0O1I-2345"))
        assertTrue(isCompleteSpiceConnectPairingCode("2W8P-CLU7"))
        assertFalse(isCompleteSpiceConnectPairingCode("2W8P-CLU"))
    }

    @Test
    fun pairingCodePasteAndMidStringEditsPreserveAUsableCursor() {
        assertEquals(
            SpiceConnectPairingCodeEdit("ABCD2345", 4, 4),
            sanitizeSpiceConnectPairingCodeEdit("ABCD-2345", 4, 4),
        )
        assertEquals(
            SpiceConnectPairingCodeEdit("ABCD2345", 6, 6),
            sanitizeSpiceConnectPairingCodeEdit("ABCD-2345", 7, 7),
        )
        assertEquals(
            SpiceConnectPairingCodeEdit("ABC2345", 3, 3),
            sanitizeSpiceConnectPairingCodeEdit("ABC-2345", 3, 3),
        )
    }

    @Test
    fun projectsRemoteProgressBetweenAuthoritativeSnapshots() {
        assertEquals(
            13_500L,
            projectedSpiceConnectProgressMs(12_500L, 180_000L, true, 1_000L, 2_000L),
        )
        assertEquals(
            12_500L,
            projectedSpiceConnectProgressMs(12_500L, 180_000L, false, 1_000L, 10_000L),
        )
        assertEquals(
            180_000L,
            projectedSpiceConnectProgressMs(179_500L, 180_000L, true, 1_000L, 5_000L),
        )
    }

    @Test
    fun redeliveredRemoteCommandsAreAppliedOnlyOnceWithinABoundedHistory() {
        val ids = BoundedSpiceConnectCommandIds(capacity = 3, initialIds = listOf("old"))

        assertFalse(ids.contains("not-applied"))
        assertFalse(ids.contains("not-applied"))
        assertTrue(ids.markIfNew("not-applied"))
        assertTrue(ids.contains("not-applied"))
        assertFalse(ids.markIfNew("old"))
        assertTrue(ids.markIfNew("one"))
        assertTrue(ids.markIfNew("two"))
        assertTrue(ids.markIfNew("three"))
        assertEquals(listOf("one", "two", "three"), ids.snapshot())
        assertTrue(ids.markIfNew("old"))
        assertFalse(ids.markIfNew("old"))
        assertEquals(listOf("two", "three", "old"), ids.snapshot())
    }

    @Test
    fun pairingCredentialAloneAllowsReceiverSelection() {
        assertTrue(hasSpiceConnectAccess(hasAccountSession = false, hasPairedCredential = true))
        assertTrue(hasSpiceConnectAccess(hasAccountSession = true, hasPairedCredential = false))
        assertFalse(hasSpiceConnectAccess(hasAccountSession = false, hasPairedCredential = false))
    }

    @Test
    fun freshReceiverPublishesItsDeviceBeforePollingCommands() {
        assertTrue(requiresSpiceConnectDeviceRegistration(null, "paired-owner"))
        assertFalse(requiresSpiceConnectDeviceRegistration("paired-owner", "paired-owner"))
        assertTrue(requiresSpiceConnectDeviceRegistration("paired-owner", "signed-in-owner"))
        assertTrue(shouldResetSpiceConnectDeviceRegistration(404))
        assertFalse(shouldResetSpiceConnectDeviceRegistration(401))
    }
}
