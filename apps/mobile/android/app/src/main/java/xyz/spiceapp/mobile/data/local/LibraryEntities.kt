package xyz.spiceapp.mobile.data.local

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "liked_tracks",
    foreignKeys = [
        ForeignKey(
            entity = TrackEntity::class,
            parentColumns = ["id"],
            childColumns = ["trackId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index("trackId")],
)
data class LikedTrackEntity(
    @PrimaryKey val trackId: String,
    val likedAt: Long,
)

@Entity(
    tableName = "history_tracks",
    foreignKeys = [
        ForeignKey(
            entity = TrackEntity::class,
            parentColumns = ["id"],
            childColumns = ["trackId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index("trackId"), Index("playedAt")],
)
data class HistoryTrackEntity(
    @PrimaryKey val trackId: String,
    val playedAt: Long,
)

@Entity(
    tableName = "downloads",
    foreignKeys = [
        ForeignKey(
            entity = TrackEntity::class,
            parentColumns = ["id"],
            childColumns = ["trackId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index("trackId"), Index("downloadedAt")],
)
data class DownloadEntity(
    @PrimaryKey val id: String,
    val trackId: String,
    val filePath: String,
    val fileName: String,
    val mimeType: String,
    val bytes: Long,
    val downloadedAt: Long,
)

@Entity(tableName = "playlists")
data class PlaylistEntity(
    @PrimaryKey val id: String,
    val title: String,
    val description: String,
    val coverUrl: String,
    val shared: Boolean,
    val shareRole: String,
    val isPublic: Boolean,
    val sortIndex: Int,
    val updatedAt: Long,
)

@Entity(
    tableName = "playlist_tracks",
    primaryKeys = ["playlistId", "position"],
    foreignKeys = [
        ForeignKey(
            entity = PlaylistEntity::class,
            parentColumns = ["id"],
            childColumns = ["playlistId"],
            onDelete = ForeignKey.CASCADE,
        ),
        ForeignKey(
            entity = TrackEntity::class,
            parentColumns = ["id"],
            childColumns = ["trackId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index("playlistId"), Index("trackId"), Index("position")],
)
data class PlaylistTrackEntity(
    val playlistId: String,
    val trackId: String,
    val position: Int,
)

data class PlaylistTrackRow(
    val playlistId: String,
    val playlistTitle: String,
    val playlistDescription: String,
    val playlistCoverUrl: String,
    val playlistShared: Boolean,
    val playlistShareRole: String,
    val playlistIsPublic: Boolean,
    val playlistSortIndex: Int,
    val trackId: String?,
    val trackTitle: String?,
    val trackArtist: String?,
    val trackAlbum: String?,
    val trackDurationMs: Long?,
    val trackArtworkUrl: String?,
    val trackSourceId: String?,
    val trackPosition: Int?,
)

data class DownloadRow(
    val downloadId: String,
    val filePath: String,
    val fileName: String,
    val mimeType: String,
    val bytes: Long,
    val downloadedAt: Long,
    val trackId: String,
    val trackTitle: String,
    val trackArtist: String,
    val trackAlbum: String,
    val trackDurationMs: Long,
    val trackArtworkUrl: String,
    val trackSourceId: String,
)
