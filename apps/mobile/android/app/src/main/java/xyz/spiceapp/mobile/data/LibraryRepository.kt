package xyz.spiceapp.mobile.data

import android.content.Context
import androidx.room.withTransaction
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import org.json.JSONArray
import xyz.spiceapp.mobile.data.local.DownloadEntity
import xyz.spiceapp.mobile.data.local.DownloadRow
import xyz.spiceapp.mobile.data.local.HistoryTrackEntity
import xyz.spiceapp.mobile.data.local.LikedTrackEntity
import xyz.spiceapp.mobile.data.local.PlaylistEntity
import xyz.spiceapp.mobile.data.local.PlaylistTrackEntity
import xyz.spiceapp.mobile.data.local.PlaylistTrackRow
import xyz.spiceapp.mobile.data.local.SpiceDatabase
import xyz.spiceapp.mobile.data.local.toEntity
import xyz.spiceapp.mobile.data.local.toTrack
import xyz.spiceapp.mobile.model.AccentTheme
import xyz.spiceapp.mobile.model.DownloadedTrack
import xyz.spiceapp.mobile.model.Playlist
import xyz.spiceapp.mobile.model.StreamQuality
import xyz.spiceapp.mobile.model.Track
import java.io.File
import java.util.UUID

class LibraryRepository(context: Context) {
    private val database = SpiceDatabase.get(context)
    private val dao = database.libraryDao()
    private val preferences = context.getSharedPreferences("spice_native_library", Context.MODE_PRIVATE)

    val likedTracks: Flow<List<Track>> = dao.observeLikedTracks().map { tracks ->
        tracks.map { it.toTrack() }
    }

    val historyTracks: Flow<List<Track>> = dao.observeHistoryTracks().map { tracks ->
        tracks.map { it.toTrack() }
    }

    val playlists: Flow<List<Playlist>> = dao.observePlaylistRows().map(::playlistRowsToPlaylists)

    val downloads: Flow<List<DownloadedTrack>> = dao.observeDownloads().map { rows ->
        rows.map(::downloadRowToModel)
    }

    suspend fun likedSnapshot(): List<Track> = dao.likedTracks().map { it.toTrack() }

    suspend fun historySnapshot(): List<Track> = dao.historyTracks().map { it.toTrack() }

    suspend fun playlistSnapshot(): List<Playlist> = playlistRowsToPlaylists(dao.playlistRows())

    suspend fun downloadsSnapshot(): List<DownloadedTrack> = dao.downloads().map(::downloadRowToModel)

    suspend fun migrateLegacySnapshotsIfNeeded() {
        if (preferences.getBoolean(KEY_ROOM_MIGRATED_V1, false)) return

        val liked = readLegacyTracks(KEY_LEGACY_LIKED)
        val history = readLegacyTracks(KEY_LEGACY_HISTORY)
        val now = System.currentTimeMillis()

        database.withTransaction {
            liked.forEachIndexed { index, track ->
                dao.upsertTrack(track.toEntity(now - index))
                dao.upsertLikedTrack(LikedTrackEntity(track.id, now - index))
            }
            history.take(50).forEachIndexed { index, track ->
                dao.upsertTrack(track.toEntity(now - index))
                dao.upsertHistoryTrack(HistoryTrackEntity(track.id, now - index))
            }
            dao.trimHistory()
        }

        preferences.edit().putBoolean(KEY_ROOM_MIGRATED_V1, true).apply()
    }

    suspend fun addToHistory(track: Track) {
        val now = System.currentTimeMillis()
        database.withTransaction {
            dao.upsertTrack(track.toEntity(now))
            dao.upsertHistoryTrack(HistoryTrackEntity(track.id, now))
            dao.trimHistory()
        }
    }

    suspend fun replaceLikedTracks(tracks: List<Track>) {
        val now = System.currentTimeMillis()
        database.withTransaction {
            dao.clearLikedTracks()
            tracks.forEachIndexed { index, track ->
                val timestamp = now - index
                dao.upsertTrack(track.toEntity(timestamp))
                dao.upsertLikedTrack(LikedTrackEntity(track.id, timestamp))
            }
        }
    }

    suspend fun replaceHistoryTracks(tracks: List<Track>) {
        val now = System.currentTimeMillis()
        database.withTransaction {
            dao.clearHistoryTracks()
            tracks.take(50).forEachIndexed { index, track ->
                val timestamp = now - index
                dao.upsertTrack(track.toEntity(timestamp))
                dao.upsertHistoryTrack(HistoryTrackEntity(track.id, timestamp))
            }
            dao.trimHistory()
        }
    }

    suspend fun createPlaylist(title: String? = null): Playlist {
        val now = System.currentTimeMillis()
        val index = dao.maxPlaylistSortIndex() + 1
        val playlist = Playlist(
            id = UUID.randomUUID().toString(),
            title = title?.trim().takeUnless { it.isNullOrEmpty() } ?: "New Playlist ${index + 1}",
            isPublic = true,
        )
        dao.upsertPlaylist(playlist.toEntity(index, now))
        return playlist
    }

    suspend fun addTrackToPlaylist(playlistId: String, track: Track): Boolean {
        val now = System.currentTimeMillis()
        return database.withTransaction {
            if (dao.playlistHasTrack(playlistId, track.id)) {
                false
            } else {
                dao.upsertTrack(track.toEntity(now))
                dao.upsertPlaylistTrack(
                    PlaylistTrackEntity(
                        playlistId = playlistId,
                        trackId = track.id,
                        position = dao.maxPlaylistTrackPosition(playlistId) + 1,
                    ),
                )
                true
            }
        }
    }

    suspend fun addDownload(track: Track, file: File, mimeType: String = "audio/mp4"): DownloadedTrack {
        val now = System.currentTimeMillis()
        val download = DownloadedTrack(
            id = UUID.randomUUID().toString(),
            track = track,
            filePath = file.absolutePath,
            fileName = file.name,
            mimeType = mimeType,
            bytes = file.length().coerceAtLeast(0),
            downloadedAt = now,
        )

        database.withTransaction {
            dao.upsertTrack(track.toEntity(now))
            dao.upsertDownload(download.toEntity())
        }

        return download
    }

    suspend fun removeDownload(download: DownloadedTrack): Boolean {
        dao.deleteDownload(download.id)
        return File(download.filePath).deleteIfExists()
    }

    suspend fun replacePlaylists(playlists: List<Playlist>) {
        val now = System.currentTimeMillis()
        database.withTransaction {
            dao.clearPlaylists()
            playlists.forEachIndexed { playlistIndex, playlist ->
                dao.upsertPlaylist(playlist.toEntity(playlistIndex, now - playlistIndex))
                playlist.tracks.forEachIndexed { trackIndex, track ->
                    dao.upsertTrack(track.toEntity(now - trackIndex))
                    dao.upsertPlaylistTrack(
                        PlaylistTrackEntity(
                            playlistId = playlist.id,
                            trackId = track.id,
                            position = trackIndex,
                        ),
                    )
                }
            }
        }
    }

    suspend fun toggleLike(track: Track): Boolean {
        val now = System.currentTimeMillis()
        return database.withTransaction {
            val isLiked = dao.isLiked(track.id)
            dao.upsertTrack(track.toEntity(now))
            if (isLiked) {
                dao.deleteLikedTrack(track.id)
                false
            } else {
                dao.upsertLikedTrack(LikedTrackEntity(track.id, now))
                true
            }
        }
    }

    fun quality(): StreamQuality = runCatching {
        StreamQuality.valueOf(preferences.getString(KEY_QUALITY, StreamQuality.Standard.name).orEmpty())
    }.getOrDefault(StreamQuality.Standard)

    fun setQuality(quality: StreamQuality) {
        preferences.edit().putString(KEY_QUALITY, quality.name).apply()
    }

    fun accentTheme(): AccentTheme = runCatching {
        AccentTheme.valueOf(preferences.getString(KEY_ACCENT_THEME, AccentTheme.NeonSpice.name).orEmpty())
    }.getOrDefault(AccentTheme.NeonSpice)

    fun setAccentTheme(theme: AccentTheme) {
        preferences.edit().putString(KEY_ACCENT_THEME, theme.name).apply()
    }

    private fun readLegacyTracks(key: String): List<Track> = runCatching {
        val array = JSONArray(preferences.getString(key, "[]"))
        buildList {
            for (index in 0 until array.length()) {
                val item = array.optJSONObject(index) ?: continue
                val id = item.optString("id").trim()
                val title = item.optString("title").trim()
                if (id.isEmpty() || title.isEmpty()) continue
                add(
                    Track(
                        id = id,
                        title = title,
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

    private fun playlistRowsToPlaylists(rows: List<PlaylistTrackRow>): List<Playlist> =
        rows.groupBy { it.playlistId }.values.map { playlistRows ->
            val first = playlistRows.first()
            Playlist(
                id = first.playlistId,
                title = first.playlistTitle,
                description = first.playlistDescription,
                coverUrl = first.playlistCoverUrl,
                shared = first.playlistShared,
                shareRole = first.playlistShareRole,
                isPublic = first.playlistIsPublic,
                tracks = playlistRows
                    .sortedBy { it.trackPosition ?: Int.MAX_VALUE }
                    .mapNotNull { it.toTrackOrNull() },
            )
        }

    private fun PlaylistTrackRow.toTrackOrNull(): Track? {
        val id = trackId ?: return null
        return Track(
            id = id,
            title = trackTitle ?: "Track",
            artist = trackArtist ?: "Unknown artist",
            album = trackAlbum.orEmpty(),
            durationMs = trackDurationMs ?: 0,
            artworkUrl = trackArtworkUrl.orEmpty(),
            sourceId = trackSourceId ?: "youtube_music",
        )
    }

    private fun downloadRowToModel(row: DownloadRow): DownloadedTrack =
        DownloadedTrack(
            id = row.downloadId,
            track = Track(
                id = row.trackId,
                title = row.trackTitle,
                artist = row.trackArtist,
                album = row.trackAlbum,
                durationMs = row.trackDurationMs,
                artworkUrl = row.trackArtworkUrl,
                sourceId = row.trackSourceId,
            ),
            filePath = row.filePath,
            fileName = row.fileName,
            mimeType = row.mimeType,
            bytes = row.bytes,
            downloadedAt = row.downloadedAt,
        )

    private fun DownloadedTrack.toEntity(): DownloadEntity =
        DownloadEntity(
            id = id,
            trackId = track.id,
            filePath = filePath,
            fileName = fileName,
            mimeType = mimeType,
            bytes = bytes,
            downloadedAt = downloadedAt,
        )

    private fun File.deleteIfExists(): Boolean =
        if (!exists()) true else delete()

    private fun Playlist.toEntity(sortIndex: Int, updatedAt: Long): PlaylistEntity =
        PlaylistEntity(
            id = id,
            title = title,
            description = description,
            coverUrl = coverUrl,
            shared = shared,
            shareRole = shareRole,
            isPublic = isPublic,
            sortIndex = sortIndex,
            updatedAt = updatedAt,
        )

    private companion object {
        const val KEY_LEGACY_HISTORY = "history"
        const val KEY_LEGACY_LIKED = "liked"
        const val KEY_ACCENT_THEME = "accent_theme"
        const val KEY_QUALITY = "quality"
        const val KEY_ROOM_MIGRATED_V1 = "room_migrated_v1"
    }
}
