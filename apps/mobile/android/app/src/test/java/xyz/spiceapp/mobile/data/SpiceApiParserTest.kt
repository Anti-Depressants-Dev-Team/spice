package xyz.spiceapp.mobile.data

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import xyz.spiceapp.mobile.model.StreamQuality

class SpiceApiParserTest {
    @Test
    fun parsesYouTubeTrackMetadata() {
        val tracks = parseTracks(
            JSONObject(
                """
                {
                  "tracks": [{
                    "id": "abc123",
                    "title": "Digital Love",
                    "artists": [{"name": "Daft Punk"}],
                    "album": {"title": "Discovery"},
                    "durationMs": 301000,
                    "artworkUrl": "https://example.test/art.jpg",
                    "sourceId": "youtube_music"
                  }]
                }
                """.trimIndent(),
            ),
            "youtube_music",
        )

        assertEquals(1, tracks.size)
        assertEquals("Digital Love", tracks.single().title)
        assertEquals("Daft Punk", tracks.single().artist)
        assertEquals("Discovery", tracks.single().album)
        assertEquals(301000, tracks.single().durationMs)
        assertEquals("youtube_music", tracks.single().sourceId)
    }

    @Test
    fun appliesSoundCloudDefaultsAndSkipsInvalidTracks() {
        val tracks = parseTracks(
            JSONObject(
                """
                {
                  "tracks": [
                    {
                      "id": "soundcloud:42",
                      "title": "One More Time",
                      "artists": [{"name": "Daft Punk"}]
                    },
                    {"id": "", "title": "Invalid"}
                  ]
                }
                """.trimIndent(),
            ),
            "soundcloud",
        )

        assertEquals(1, tracks.size)
        assertEquals("soundcloud", tracks.single().sourceId)
        assertEquals("42", soundCloudTrackId(tracks.single().id))
    }

    @Test
    fun interleavesAndDeduplicatesProviders() {
        val youtube = listOf(
            xyz.spiceapp.mobile.model.Track("yt-1", "First", "Artist", sourceId = "youtube_music"),
            xyz.spiceapp.mobile.model.Track("yt-2", "Second", "Artist", sourceId = "youtube_music"),
        )
        val soundCloud = listOf(
            xyz.spiceapp.mobile.model.Track("sc-1", "Third", "Artist", sourceId = "soundcloud"),
            xyz.spiceapp.mobile.model.Track("sc-2", "First", "Artist", sourceId = "soundcloud"),
        )

        val merged = mergeProviderTracks(listOf(youtube, soundCloud), 4)

        assertEquals(listOf("yt-1", "sc-1", "yt-2"), merged.map { it.id })
    }

    @Test
    fun mapsQualityToSoundCloudApiValues() {
        assertEquals("high", StreamQuality.High.apiValue())
        assertEquals("standard", StreamQuality.Standard.apiValue())
        assertEquals("low", StreamQuality.DataSaver.apiValue())
        assertTrue(soundCloudTrackId("plain-id") == "plain-id")
    }

    @Test
    fun buildsAndFiltersSoundCloudFallbackCandidates() {
        val requested = xyz.spiceapp.mobile.model.Track(
            "yt-1",
            "Digital Love",
            "Daft Punk",
            sourceId = "youtube_music",
        )
        val candidates = listOf(
            xyz.spiceapp.mobile.model.Track("sc-1", "Digital Love cover", "Artist", sourceId = "soundcloud"),
            xyz.spiceapp.mobile.model.Track("yt-2", "Digital Love", "Artist", sourceId = "youtube_music"),
        )

        assertEquals("Digital Love Daft Punk", fallbackSearchQuery(requested))
        assertEquals(listOf("sc-1"), soundCloudFallbackCandidates(requested, candidates).map { it.id })
    }
}
