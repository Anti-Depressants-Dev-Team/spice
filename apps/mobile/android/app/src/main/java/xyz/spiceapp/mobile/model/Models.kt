package xyz.spiceapp.mobile.model

data class Track(
    val id: String,
    val title: String,
    val artist: String,
    val album: String = "",
    val durationMs: Long = 0,
    val artworkUrl: String = "",
    val sourceId: String = "youtube_music",
)

data class FeedSection(
    val title: String,
    val tracks: List<Track>,
)

data class ResolvedStream(
    val url: String,
    val container: String = "",
    val bitrate: Long = 0,
)

enum class AppScreen(val label: String) {
    Home("Home"),
    Search("Search"),
    Library("Library"),
    Settings("Settings"),
}

enum class StreamQuality(val label: String) {
    High("High definition"),
    Standard("Standard"),
    DataSaver("Data saver"),
}

enum class LibraryTab(val label: String) {
    Playlists("Playlists"),
    Liked("Liked"),
    History("History"),
}
