package xyz.spiceapp.mobile

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SpiceConnectPollingTest {
    @Test
    fun keepsCommandPollingResponsiveWhileDeviceSyncUsesLongerCadence() {
        assertEquals(1_500L, SPICE_CONNECT_COMMAND_POLL_INTERVAL_MS)
        assertEquals(750L, SPICE_CONNECT_COMMAND_STATE_SETTLE_MS)
        assertEquals(30_000L, SPICE_CONNECT_DEVICE_SYNC_INTERVAL_MS)
        assertEquals(2_000L, SPICE_CONNECT_CONTROLLER_REFRESH_INTERVAL_MS)
        assertEquals(6_000L, SPICE_CONNECT_OPTIMISTIC_STATE_WINDOW_MS)
    }

    @Test
    fun waitsUntilDeviceSyncDeadlineWhenNoCommandsArrive() {
        assertFalse(
            shouldSyncSpiceConnectDevices(
                nowElapsedRealtimeMs = 29_999L,
                nextDeviceSyncAtMs = 30_000L,
                receivedCommands = false,
                isControllingRemoteDevice = false,
            ),
        )
    }

    @Test
    fun syncsExactlyAtDeviceSyncDeadline() {
        assertTrue(
            shouldSyncSpiceConnectDevices(
                nowElapsedRealtimeMs = 30_000L,
                nextDeviceSyncAtMs = 30_000L,
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
                nextDeviceSyncAtMs = 30_000L,
                receivedCommands = true,
                isControllingRemoteDevice = false,
            ),
        )
        assertEquals(
            3_000L,
            nextSpiceConnectDeviceSyncAt(
                nowElapsedRealtimeMs = 1_500L,
                receivedCommands = true,
                isControllingRemoteDevice = false,
            ),
        )
        assertEquals(
            31_500L,
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
                nextDeviceSyncAtMs = 30_000L,
                receivedCommands = false,
                isControllingRemoteDevice = true,
            ),
        )
        assertEquals(
            4_000L,
            nextSpiceConnectDeviceSyncAt(
                nowElapsedRealtimeMs = 2_000L,
                receivedCommands = false,
                isControllingRemoteDevice = true,
            ),
        )
    }

    @Test
    fun pairingCodeInputUsesAStableFourByFourDisplayFormat() {
        assertEquals("2W8P-CLU7", formatSpiceConnectPairingCodeInput("2w8pclu7"))
        assertEquals("2W8P-CL", formatSpiceConnectPairingCodeInput("2w8p-cl"))
        assertEquals("2W8PCLU7", normalizeSpiceConnectPairingCodeInput("2W8P-CLU7"))
        assertTrue(isCompleteSpiceConnectPairingCode("2W8P-CLU7"))
        assertFalse(isCompleteSpiceConnectPairingCode("2W8P-CLU"))
    }

    @Test
    fun pairingCredentialAloneAllowsReceiverSelection() {
        assertTrue(hasSpiceConnectAccess(hasAccountSession = false, hasPairedCredential = true))
        assertTrue(hasSpiceConnectAccess(hasAccountSession = true, hasPairedCredential = false))
        assertFalse(hasSpiceConnectAccess(hasAccountSession = false, hasPairedCredential = false))
    }
}
