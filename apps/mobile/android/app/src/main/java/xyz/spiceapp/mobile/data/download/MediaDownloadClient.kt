package xyz.spiceapp.mobile.data.download

import android.content.Context
import android.os.Environment
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
            ?: File(context.filesDir, "downloads"),
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

        return DownloadResult(
            processId = processId,
            outputTemplate = outputTemplate,
            outputDirectory = outputDirectory.absolutePath,
            outputFilePath = outputFile?.absolutePath.orEmpty(),
            outputFileName = outputFile?.name.orEmpty(),
            outputBytes = outputFile?.length()?.coerceAtLeast(0) ?: 0,
            exitCode = response.exitCode,
            output = response.out,
            errorOutput = response.err,
        )
    }

    fun cancel(processId: String): Boolean = YoutubeDL.getInstance().destroyProcessById(processId)

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
