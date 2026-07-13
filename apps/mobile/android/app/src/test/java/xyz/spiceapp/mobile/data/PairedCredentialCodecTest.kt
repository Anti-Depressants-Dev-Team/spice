package xyz.spiceapp.mobile.data

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import xyz.spiceapp.mobile.model.PairedDeviceCredential

class PairedCredentialCodecTest {
    private val expiresAt = "2030-01-02T03:04:05.000Z"
    private val expiresAtEpochMs = parseSpiceTimestampEpochMs(expiresAt)

    @Test
    fun pairedCredentialCodecRoundTripsTrackedIdentityAndExpiry() {
        val credential = PairedDeviceCredential(
            accessToken = "spice_pair_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG",
            authorizationId = "authorization-1",
            ownerUserId = "owner-1",
            expiresAt = expiresAt,
            expiresAtEpochMs = expiresAtEpochMs,
            deviceId = "android-device-1",
            displayName = "Spice Android",
        )

        val restored = requireNotNull(parsePairedCredentialJson(pairedCredentialToJson(credential)))

        assertEquals(credential, restored)
        assertFalse(restored.isExpired(expiresAtEpochMs - 1))
        assertTrue(restored.isExpired(expiresAtEpochMs))
    }

    @Test
    fun pairedCredentialCodecRejectsAccountTokensAndMissingOwnership() {
        val payload = JSONObject()
            .put("accessToken", "ordinary-account-token")
            .put("authorizationId", "authorization-1")
            .put("ownerUserId", "")
            .put("expiresAt", expiresAt)
            .put("expiresAtEpochMs", expiresAtEpochMs)
            .put("deviceId", "android-device-1")

        assertNull(parsePairedCredentialJson(payload))
    }

    @Test
    fun timestampParserFailsClosedForMalformedExpiry() {
        assertTrue(expiresAtEpochMs > 0L)
        assertEquals(0L, parseSpiceTimestampEpochMs("not-a-timestamp"))
        assertEquals(0L, parseSpiceTimestampEpochMs(""))
    }
}
