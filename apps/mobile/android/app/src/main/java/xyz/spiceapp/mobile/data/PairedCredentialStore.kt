package xyz.spiceapp.mobile.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import xyz.spiceapp.mobile.model.PairedDeviceCredential
import java.security.KeyStore
import java.text.ParsePosition
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class PairedCredentialStore(context: Context) {
    private val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun load(nowEpochMs: Long = System.currentTimeMillis()): PairedDeviceCredential? {
        val encrypted = preferences.getString(KEY_CREDENTIAL, null) ?: return null
        return runCatching {
            decrypt(encrypted)?.let { decrypted -> parsePairedCredentialJson(JSONObject(decrypted)) }
        }.getOrNull()?.takeUnless { credential ->
            credential.isExpired(nowEpochMs).also { expired ->
                if (expired) clear()
            }
        } ?: run {
            clear()
            null
        }
    }

    fun save(credential: PairedDeviceCredential) {
        require(!credential.isExpired()) { "Cannot persist an expired paired credential." }
        preferences.edit()
            .putString(KEY_CREDENTIAL, encrypt(pairedCredentialToJson(credential).toString()))
            .apply()
    }

    fun clear() {
        preferences.edit().remove(KEY_CREDENTIAL).apply()
    }

    private fun encrypt(value: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey())
        val ciphertext = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
        return JSONObject()
            .put("iv", Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            .put("ciphertext", Base64.encodeToString(ciphertext, Base64.NO_WRAP))
            .toString()
    }

    private fun decrypt(value: String): String? {
        val payload = JSONObject(value)
        val iv = Base64.decode(payload.getString("iv"), Base64.NO_WRAP)
        val ciphertext = Base64.decode(payload.getString("ciphertext"), Base64.NO_WRAP)
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(128, iv))
        return String(cipher.doFinal(ciphertext), Charsets.UTF_8)
    }

    private fun secretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEY_STORE).apply { load(null) }
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }

        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEY_STORE)
        val spec = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true)
            .build()
        generator.init(spec)
        return generator.generateKey()
    }

    private companion object {
        const val ANDROID_KEY_STORE = "AndroidKeyStore"
        const val KEY_ALIAS = "spice_paired_device_credential_key"
        const val KEY_CREDENTIAL = "paired_device_credential"
        const val PREFERENCES_NAME = "spice_paired_device_credential"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
    }
}

internal fun pairedCredentialToJson(credential: PairedDeviceCredential): JSONObject =
    JSONObject()
        .put("accessToken", credential.accessToken)
        .put("authorizationId", credential.authorizationId)
        .put("ownerUserId", credential.ownerUserId)
        .put("expiresAt", credential.expiresAt)
        .put("expiresAtEpochMs", credential.expiresAtEpochMs)
        .put("deviceId", credential.deviceId)
        .put("displayName", credential.displayName)

internal fun parsePairedCredentialJson(payload: JSONObject): PairedDeviceCredential? {
    val accessToken = payload.optString("accessToken").trim()
    val authorizationId = payload.optString("authorizationId").trim()
    val ownerUserId = payload.optString("ownerUserId").trim()
    val expiresAt = payload.optString("expiresAt").trim()
    val expiresAtEpochMs = payload.optLong("expiresAtEpochMs", parseSpiceTimestampEpochMs(expiresAt))
    val deviceId = payload.optString("deviceId").trim()
    val displayName = payload.optString("displayName").trim()
    if (!accessToken.startsWith("spice_pair_") || authorizationId.isEmpty() || ownerUserId.isEmpty()
        || expiresAtEpochMs <= 0L || deviceId.isEmpty()
    ) {
        return null
    }
    return PairedDeviceCredential(
        accessToken = accessToken,
        authorizationId = authorizationId,
        ownerUserId = ownerUserId,
        expiresAt = expiresAt,
        expiresAtEpochMs = expiresAtEpochMs,
        deviceId = deviceId,
        displayName = displayName.ifEmpty { "Spice Android" },
    )
}

internal fun parseSpiceTimestampEpochMs(value: String): Long {
    if (value.isBlank()) return 0L
    val formats = listOf(
        "yyyy-MM-dd'T'HH:mm:ss.SSSX",
        "yyyy-MM-dd'T'HH:mm:ssX",
    )
    for (pattern in formats) {
        val parser = SimpleDateFormat(pattern, Locale.US).apply {
            isLenient = false
            timeZone = TimeZone.getTimeZone("UTC")
        }
        val position = ParsePosition(0)
        val parsed = parser.parse(value, position)
        if (parsed != null && position.index == value.length) return parsed.time
    }
    return 0L
}
