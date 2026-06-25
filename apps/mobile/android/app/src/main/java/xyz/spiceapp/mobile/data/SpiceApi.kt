package xyz.spiceapp.mobile.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import org.json.JSONObject
import xyz.spiceapp.mobile.model.ResolvedStream
import xyz.spiceapp.mobile.model.StreamQuality
import xyz.spiceapp.mobile.model.Track
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.util.Locale

class SpiceApi(
    private val baseUrl: String = "https://music.spice-app.xyz",
) {
    suspend fun search(query: String, limit: Int = 12): List<Track> = coroutineScope {
        val encoded = URLEncoder.encode(query.trim(), StandardCharsets.UTF_8.name())
        val safeLimit = limit.coerceIn(1, 30)
        val providers = listOf(
            "/api/sc/search?q=" + encoded + "&limit=" + safeLimit to "soundcloud",
            "/api/yt/search?q=" + encoded + "&limit=" + safeLimit to "youtube_music",
        )
        val results = providers.map { (path, sourceId) ->
            async(Dispatchers.IO) {
                runCatching { searchProvider(path, sourceId) }
            }
        }.awaitAll()
        val successful = results.mapNotNull { it.getOrNull() }

        if (successful.isEmpty()) {
            throw results.firstNotNullOf { it.exceptionOrNull() }
        }

        mergeProviderTracks(successful, safeLimit)
    }

    suspend fun resolvePlayable(track: Track, quality: StreamQuality): ResolvedPlayback {
        val directFailure = try {
            return ResolvedPlayback(track, resolve(track, quality), usedFallback = false)
        } catch (error: Exception) {
            error
        }

        val query = fallbackSearchQuery(track)
        val encoded = URLEncoder.encode(query, StandardCharsets.UTF_8.name())
        val alternatives = withContext(Dispatchers.IO) {
            searchProvider("/api/sc/search?q=" + encoded + "&limit=30", "soundcloud")
        }
        var lastFailure: Exception = directFailure

        for (alternative in soundCloudFallbackCandidates(track, alternatives).take(6)) {
            try {
                return ResolvedPlayback(
                    track = alternative,
                    stream = resolve(alternative, quality),
                    usedFallback = true,
                )
            } catch (error: Exception) {
                lastFailure = error
            }
        }

        throw SpiceApiException(
            message = "No full-length direct or SoundCloud source is available for this track.",
            cause = lastFailure,
        )
    }

    suspend fun resolve(track: Track, quality: StreamQuality): ResolvedStream = withContext(Dispatchers.IO) {
        val endpoint = if (track.sourceId.startsWith("soundcloud")) {
            "/api/sc/track/" + encodePath(soundCloudTrackId(track.id)) + "?quality=" + quality.apiValue()
        } else {
            "/api/yt/track/" + encodePath(track.id)
        }
        val payload = getJson(endpoint)
        val streams = payload.optJSONArray("streams")
            ?: throw SpiceApiException("Spice returned no playable streams for this track.")

        val candidates = buildList {
            for (index in 0 until streams.length()) {
                val stream = streams.optJSONObject(index) ?: continue
                val url = stream.optString("url").trim()
                if (!url.startsWith("https://")) continue
                add(
                    ResolvedStream(
                        url = url,
                        container = stream.optString("container"),
                        bitrate = stream.optLong("bitrate", 0).coerceAtLeast(0),
                    ),
                )
            }
        }

        if (candidates.isEmpty()) {
            throw SpiceApiException("No Android-compatible HTTPS stream is available for this track.")
        }

        when (quality) {
            StreamQuality.High -> candidates.maxByOrNull { it.bitrate }
            StreamQuality.DataSaver -> candidates.minByOrNull { if (it.bitrate > 0) it.bitrate else Long.MAX_VALUE }
            StreamQuality.Standard -> candidates.firstOrNull()
        } ?: candidates.first()
    }

    private fun getJson(path: String): JSONObject {
        val connection = (URL(baseUrl + path).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 8_000
            readTimeout = 15_000
            instanceFollowRedirects = true
            setRequestProperty("Accept", "application/json")
            setRequestProperty("User-Agent", "Spice-Native-Android/0.2")
        }

        try {
            val status = connection.responseCode
            val body = (if (status in 200..299) connection.inputStream else connection.errorStream)
                ?.bufferedReader()
                ?.use { it.readText() }
                .orEmpty()
            val json = runCatching { JSONObject(body) }.getOrElse { JSONObject() }
            if (status !in 200..299) {
                val message = json.optString("message")
                    .ifEmpty { json.optString("error") }
                    .ifEmpty { "Spice API request failed with HTTP " + status + "." }
                throw SpiceApiException(message, status)
            }
            return json
        } finally {
            connection.disconnect()
        }
    }

    private fun encodePath(value: String): String =
        URLEncoder.encode(value, StandardCharsets.UTF_8.name()).replace("+", "%20")

    private fun searchProvider(path: String, sourceId: String): List<Track> =
        parseTracks(getJson(path), sourceId)
}

data class ResolvedPlayback(
    val track: Track,
    val stream: ResolvedStream,
    val usedFallback: Boolean,
)

internal fun parseTracks(payload: JSONObject, defaultSourceId: String): List<Track> {
    val tracks = payload.optJSONArray("tracks") ?: return emptyList()

    return buildList {
        for (index in 0 until tracks.length()) {
            val item = tracks.optJSONObject(index) ?: continue
            val id = item.optString("id").trim()
            val title = item.optString("title").trim()
            if (id.isEmpty() || title.isEmpty()) continue

            val artists = item.optJSONArray("artists")
            val artist = artists?.optJSONObject(0)?.optString("name")?.trim().orEmpty()
            val album = item.optJSONObject("album")?.optString("title")?.trim().orEmpty()
            add(
                Track(
                    id = id,
                    title = title,
                    artist = artist.ifEmpty { "Unknown artist" },
                    album = album,
                    durationMs = item.optLong("durationMs", 0).coerceAtLeast(0),
                    artworkUrl = item.optString("artworkUrl"),
                    sourceId = item.optString("sourceId").ifEmpty { defaultSourceId },
                ),
            )
        }
    }
}

internal fun mergeProviderTracks(providers: List<List<Track>>, limit: Int): List<Track> {
    val interleaved = buildList {
        val longest = providers.maxOfOrNull { it.size } ?: 0
        for (index in 0 until longest) {
            providers.forEach { tracks -> tracks.getOrNull(index)?.let(::add) }
        }
    }
    return interleaved
        .distinctBy { track ->
            track.title.lowercase(Locale.ROOT) + "|" + track.artist.lowercase(Locale.ROOT)
        }
        .take(limit.coerceAtLeast(0))
}
internal fun soundCloudTrackId(id: String): String = id.substringAfter("soundcloud:")

internal fun fallbackSearchQuery(track: Track): String =
    listOf(track.title, track.artist)
        .filter { it.isNotBlank() }
        .joinToString(" ")

internal fun soundCloudFallbackCandidates(requested: Track, candidates: List<Track>): List<Track> =
    candidates.filter { candidate ->
        candidate.sourceId.startsWith("soundcloud") && candidate.id != requested.id
    }

internal fun StreamQuality.apiValue(): String = when (this) {
    StreamQuality.High -> "high"
    StreamQuality.Standard -> "standard"
    StreamQuality.DataSaver -> "low"
}

class SpiceApiException(
    override val message: String,
    val statusCode: Int? = null,
    cause: Throwable? = null,
) : Exception(message, cause)
