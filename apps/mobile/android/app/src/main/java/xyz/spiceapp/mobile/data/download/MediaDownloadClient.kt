package xyz.spiceapp.mobile.data.download

import android.Manifest
import android.content.ContentValues
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.ContextCompat
import com.yausername.aria2c.Aria2c
import com.yausername.ffmpeg.FFmpeg
import com.yausername.youtubedl_android.YoutubeDL
import com.yausername.youtubedl_android.YoutubeDLRequest
import xyz.spiceapp.mobile.model.Track
import java.io.File
import java.net.URL
import java.util.UUID

internal const val DOWNLOAD_AUDIO_FORMAT = "mp3"

class MediaDownloadClient(
    private val context: Context,
) {
    fun downloadAudio(
        track: Track,
        sourceUrl: String,
        processId: String = newProcessId(),
        outputDirectory: File = context.getExternalFilesDir(Environment.DIRECTORY_MUSIC)
            ?.let { File(it, "Spice") }
            ?: File(context.filesDir, "downloads/Spice"),
        progress: (DownloadProgress) -> Unit = {},
    ): DownloadResult {
        progress(DownloadProgress(-1f, -1, "Preparing MP3 download..."))
        ensureInitialized(context)
        outputDirectory.mkdirs()

        val startedAt = System.currentTimeMillis()
        val fileStem = uniqueDownloadFileStem(outputDirectory, safeFileStem("${track.artist} - ${track.title}"))
        val outputTemplate = File(
            outputDirectory,
            "$fileStem.%(ext)s",
        ).absolutePath
        val request = YoutubeDLRequest(sourceUrl)
            .addOption("--no-playlist")
            .addOption("--extract-audio")
            .addOption("--audio-format", DOWNLOAD_AUDIO_FORMAT)
            .addOption("--audio-quality", "0")
            .addOption("--no-mtime")
            .addOption("--embed-metadata")
            .addOption("-o", outputTemplate)

        var response = YoutubeDL.getInstance().execute(request, processId) { progressValue, eta, line ->
            progress(DownloadProgress(progressValue, eta, line))
        }
        if (response.exitCode != 0 && isYouTubeUrl(sourceUrl) && updateYoutubeDlOnce(context)) {
            progress(DownloadProgress(-1f, -1, "Updated yt-dlp; retrying download..."))
            response = YoutubeDL.getInstance().execute(request, processId) { progressValue, eta, line ->
                progress(DownloadProgress(progressValue, eta, line))
            }
        }
        val outputFile = completedDownloadFile(outputDirectory, fileStem, startedAt)
        val published = if (response.exitCode == 0 && outputFile != null) {
            publishToPublicMusic(outputFile) ?: PublishedAudio(
                location = outputFile.absolutePath,
                fileName = outputFile.name,
                bytes = outputFile.length().coerceAtLeast(0),
            )
        } else {
            null
        }

        return DownloadResult(
            processId = processId,
            outputTemplate = outputTemplate,
            outputDirectory = outputDirectory.absolutePath,
            outputFilePath = published?.location.orEmpty(),
            outputFileName = published?.fileName.orEmpty(),
            outputBytes = published?.bytes ?: 0,
            exitCode = response.exitCode,
            output = response.out,
            errorOutput = response.err,
        )
    }

    fun cancel(processId: String): Boolean = YoutubeDL.getInstance().destroyProcessById(processId)

    private fun publishToPublicMusic(file: File): PublishedAudio? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return publishToLegacyPublicMusic(file)
        val resolver = context.contentResolver
        val collection = MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
        val displayName = uniqueMediaStoreDisplayName(file.nameWithoutExtension, file.extension.ifBlank { DOWNLOAD_AUDIO_FORMAT })
        val values = ContentValues().apply {
            put(MediaStore.Audio.Media.DISPLAY_NAME, displayName)
            put(MediaStore.Audio.Media.MIME_TYPE, "audio/mpeg")
            put(MediaStore.Audio.Media.RELATIVE_PATH, Environment.DIRECTORY_MUSIC + "/Spice")
            put(MediaStore.Audio.Media.IS_PENDING, 1)
        }
        val uri = resolver.insert(collection, values) ?: return null
        return try {
            resolver.openOutputStream(uri, "w")?.use { output ->
                file.inputStream().use { input -> input.copyTo(output) }
            } ?: error("Android could not open the public Music destination.")
            resolver.update(uri, ContentValues().apply {
                put(MediaStore.Audio.Media.IS_PENDING, 0)
            }, null, null)
            val bytes = file.length().coerceAtLeast(0)
            file.delete()
            PublishedAudio(uri.toString(), displayName, bytes)
        } catch (error: Exception) {
            resolver.delete(uri, null, null)
            null
        }
    }

    @Suppress("DEPRECATION")
    private fun publishToLegacyPublicMusic(file: File): PublishedAudio? {
        if (
            ContextCompat.checkSelfPermission(context, Manifest.permission.WRITE_EXTERNAL_STORAGE) !=
            PackageManager.PERMISSION_GRANTED
        ) return null
        return runCatching {
            val directory = File(
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MUSIC),
                "Spice",
            ).apply { mkdirs() }
            var index = 1
            var destination = File(directory, file.name)
            while (destination.exists()) {
                index += 1
                destination = File(directory, "${file.nameWithoutExtension} ($index).${file.extension}")
            }
            file.copyTo(destination)
            file.delete()
            PublishedAudio(destination.absolutePath, destination.name, destination.length().coerceAtLeast(0))
        }.getOrNull()
    }

    private fun uniqueMediaStoreDisplayName(stem: String, extension: String): String {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return "$stem.$extension"
        val collection = MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
        val relativePath = Environment.DIRECTORY_MUSIC + "/Spice/"
        var index = 1
        while (true) {
            val candidate = if (index == 1) "$stem.$extension" else "$stem ($index).$extension"
            val exists = context.contentResolver.query(
                collection,
                arrayOf(MediaStore.Audio.Media._ID),
                "${MediaStore.Audio.Media.DISPLAY_NAME} = ? AND ${MediaStore.Audio.Media.RELATIVE_PATH} = ?",
                arrayOf(candidate, relativePath),
                null,
            )?.use { it.moveToFirst() } == true
            if (!exists) return candidate
            index += 1
        }
    }

    companion object {
        private val initializationLock = Any()
        @Volatile private var initialized = false
        @Volatile private var updateAttempted = false

        fun newProcessId(): String = "spice-download-${UUID.randomUUID()}"

        private fun ensureInitialized(context: Context) {
            if (initialized) return
            synchronized(initializationLock) {
                if (initialized) return
                val applicationContext = context.applicationContext
                YoutubeDL.getInstance().init(applicationContext)
                FFmpeg.getInstance().init(applicationContext)
                Aria2c.getInstance().init(applicationContext)
                initialized = true
            }
        }

        private fun updateYoutubeDlOnce(context: Context): Boolean {
            if (updateAttempted) return false
            synchronized(initializationLock) {
                if (updateAttempted) return false
                updateAttempted = true
                return runCatching {
                    YoutubeDL.getInstance().updateYoutubeDL(
                        context.applicationContext,
                        YoutubeDL.UpdateChannel.STABLE,
                    )
                    true
                }.getOrDefault(false)
            }
        }
    }
}

private data class PublishedAudio(
    val location: String,
    val fileName: String,
    val bytes: Long,
)

data class DownloadProgress(
    val progress: Float,
    val etaSeconds: Long,
    val line: String,
)

data class DownloadResult(
    val processId: String,
    val outputTemplate: String,
    val outputDirectory: String,
    val outputFilePath: String,
    val outputFileName: String,
    val outputBytes: Long,
    val exitCode: Int,
    val output: String,
    val errorOutput: String,
)

internal fun completedDownloadFile(outputDirectory: File, fileStem: String, startedAt: Long): File? =
    outputDirectory
        .listFiles()
        .orEmpty()
        .filter { file ->
            file.isFile &&
                file.length() > 0 &&
                (file.nameWithoutExtension == fileStem || file.nameWithoutExtension.startsWith("$fileStem.")) &&
                file.lastModified() >= startedAt - 5_000
        }
        .maxByOrNull { it.lastModified() }

internal fun safeFileStem(value: String): String =
    value
        .replace(Regex("""[\\/:*?"<>|]+"""), " ")
        .replace(Regex("""\s+"""), " ")
        .trim()
        .take(120)
        .ifBlank { "spice-track" }

internal fun uniqueDownloadFileStem(directory: File, fileStem: String): String {
    var candidate = fileStem
    var index = 2
    while (directory.listFiles().orEmpty().any { file ->
        file.nameWithoutExtension == candidate || file.nameWithoutExtension.startsWith("$candidate.")
    }) {
        candidate = "$fileStem ($index)"
        index += 1
    }
    return candidate
}

private fun isYouTubeUrl(url: String): Boolean =
    runCatching { URL(url).host.lowercase() }
        .getOrDefault("")
        .let { it == "youtu.be" || it == "youtube.com" || it.endsWith(".youtube.com") }
