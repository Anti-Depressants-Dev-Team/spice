package xyz.spiceapp.mobile.data.download

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.io.File
import java.nio.file.Files

class MediaDownloadClientTest {
    @Test
    fun sanitizesDownloadFileStem() {
        assertEquals(
            "Artist Song Name",
            safeFileStem("""Artist / Song: "Name"?"""),
        )
        assertEquals("spice-track", safeFileStem("   "))
        assertEquals(120, safeFileStem("a".repeat(160)).length)
    }

    @Test
    fun detectsCompletedDownloadFileByStemAndTimestamp() {
        val directory = Files.createTempDirectory("spice-download-test").toFile()
        try {
            val old = File(directory, "Artist Song.m4a")
            old.writeText("old")
            old.setLastModified(100)
            val fresh = File(directory, "Artist Song.webm")
            fresh.writeText("fresh")
            fresh.setLastModified(5_000)

            assertEquals(
                fresh.absolutePath,
                completedDownloadFile(directory, "Artist Song", startedAt = 4_500)?.absolutePath,
            )
            assertNull(completedDownloadFile(directory, "Other Song", startedAt = 4_500))
        } finally {
            directory.deleteRecursively()
        }
    }

    @Test
    fun createsCollisionSafeDownloadFileStems() {
        val directory = Files.createTempDirectory("spice-download-name-test").toFile()
        try {
            assertEquals("Artist Song", uniqueDownloadFileStem(directory, "Artist Song"))
            File(directory, "Artist Song.m4a").writeText("first")
            assertEquals("Artist Song (2)", uniqueDownloadFileStem(directory, "Artist Song"))
            File(directory, "Artist Song (2).webm").writeText("second")
            assertEquals("Artist Song (3)", uniqueDownloadFileStem(directory, "Artist Song"))
        } finally {
            directory.deleteRecursively()
        }
    }

    @Test
    fun ignoresEmptyCompletedDownloadFiles() {
        val directory = Files.createTempDirectory("spice-download-empty-test").toFile()
        try {
            File(directory, "Artist Song.m4a").createNewFile()
            assertNull(completedDownloadFile(directory, "Artist Song", startedAt = 0))
        } finally {
            directory.deleteRecursively()
        }
    }
}
