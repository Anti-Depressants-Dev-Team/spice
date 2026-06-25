package xyz.spiceapp.mobile.data

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import xyz.spiceapp.mobile.model.StreamQuality
import xyz.spiceapp.mobile.model.Track

class LibraryStore(context: Context) {
    private val preferences = context.getSharedPreferences("spice_native_library", Context.MODE_PRIVATE)

    fun history(): List<Track> = readTracks(KEY_HISTORY)

    fun liked(): List<Track> = readTracks(KEY_LIKED)

    fun addToHistory(track: Track) {
        writeTracks(KEY_HISTORY, listOf(track) + history().filterNot { it.id == track.id }.take(49))
    }

    fun toggleLike(track: Track): Boolean {
        val current = liked()
        val isLiked = current.any { it.id == track.id }
        val next = if (isLiked) current.filterNot { it.id == track.id } else listOf(track) + current
        writeTracks(KEY_LIKED, next)
        return !isLiked
    }

    fun quality(): StreamQuality = runCatching {
        StreamQuality.valueOf(preferences.getString(KEY_QUALITY, StreamQuality.Standard.name).orEmpty())
    }.getOrDefault(StreamQuality.Standard)

    fun setQuality(quality: StreamQuality) {
        preferences.edit().putString(KEY_QUALITY, quality.name).apply()
    }

    private fun readTracks(key: String): List<Track> = runCatching {
        val array = JSONArray(preferences.getString(key, "[]"))
        buildList {
            for (index in 0 until array.length()) {
                val item = array.optJSONObject(index) ?: continue
                add(
                    Track(
                        id = item.getString("id"),
                        title = item.getString("title"),
                        artist = item.optString("artist", "Unknown artist"),
                        album = item.optString("album"),
                        durationMs = item.optLong("durationMs", 0),
                        artworkUrl = item.optString("artworkUrl"),
                        sourceId = item.optString("sourceId", "youtube_music"),
                    ),
                )
            }
        }
    }.getOrDefault(emptyList())

    private fun writeTracks(key: String, tracks: List<Track>) {
        val array = JSONArray()
        tracks.forEach { track ->
            array.put(
                JSONObject()
                    .put("id", track.id)
                    .put("title", track.title)
                    .put("artist", track.artist)
                    .put("album", track.album)
                    .put("durationMs", track.durationMs)
                    .put("artworkUrl", track.artworkUrl)
                    .put("sourceId", track.sourceId),
            )
        }
        preferences.edit().putString(key, array.toString()).apply()
    }

    private companion object {
        const val KEY_HISTORY = "history"
        const val KEY_LIKED = "liked"
        const val KEY_QUALITY = "quality"
    }
}
