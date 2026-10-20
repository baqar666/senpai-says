package expo.modules.ringtonesetter

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.util.UUID

class RingtoneSetterModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("RingtoneSetter")

    Function("canWriteSettings") {
      Settings.System.canWrite(context)
    }

    Function("openWriteSettings") {
      val intent = Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS)
        .setData(Uri.parse("package:" + context.packageName))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    AsyncFunction("setToneFromFileAsync") { path: String, title: String, type: String ->
      saveAndSet(File(Uri.parse(path).path ?: path), title, type)
    }

    // Joins voice clips (e.g. the name, then the line) into one tone. The clips are CBR MP3s
    // without ID3/Xing headers, so plain byte concatenation gives a valid file.
    AsyncFunction("setToneFromFilesAsync") { paths: List<String>, title: String, type: String ->
      val out = File(context.cacheDir, "tone-${UUID.randomUUID()}.mp3")
      try {
        out.outputStream().use { o ->
          for (p in paths) File(Uri.parse(p).path ?: p).inputStream().use { it.copyTo(o) }
        }
        saveAndSet(out, title, type)
      } finally {
        out.delete()
      }
    }
  }

  private fun saveAndSet(source: File, title: String, type: String): String {
    val (ringtoneType, dir, flag) = when (type) {
      "notification" -> Triple(RingtoneManager.TYPE_NOTIFICATION, Environment.DIRECTORY_NOTIFICATIONS, MediaStore.Audio.Media.IS_NOTIFICATION)
      "alarm" -> Triple(RingtoneManager.TYPE_ALARM, Environment.DIRECTORY_ALARMS, MediaStore.Audio.Media.IS_ALARM)
      else -> Triple(RingtoneManager.TYPE_RINGTONE, Environment.DIRECTORY_RINGTONES, MediaStore.Audio.Media.IS_RINGTONE)
    }
    val ext = source.extension.ifEmpty { "wav" }
    val mime = if (ext == "mp3") "audio/mpeg" else "audio/wav"
    val values = ContentValues().apply {
      put(MediaStore.MediaColumns.DISPLAY_NAME, "$title.$ext")
      put(MediaStore.MediaColumns.TITLE, title)
      put(MediaStore.MediaColumns.MIME_TYPE, mime)
      put(flag, true)
    }
    val resolver = context.contentResolver
    val uri: Uri
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      values.put(MediaStore.MediaColumns.RELATIVE_PATH, dir)
      values.put(MediaStore.MediaColumns.IS_PENDING, 1)
      uri = resolver.insert(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, values)
        ?: throw IllegalStateException("Couldn't save the tone")
      resolver.openOutputStream(uri)!!.use { o -> source.inputStream().use { it.copyTo(o) } }
      resolver.update(uri, ContentValues().apply { put(MediaStore.MediaColumns.IS_PENDING, 0) }, null, null)
    } else {
      @Suppress("DEPRECATION")
      val target = File(Environment.getExternalStoragePublicDirectory(dir), "$title.$ext")
      target.parentFile?.mkdirs()
      source.copyTo(target, overwrite = true)
      @Suppress("DEPRECATION")
      values.put(MediaStore.MediaColumns.DATA, target.absolutePath)
      uri = resolver.insert(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, values)
        ?: throw IllegalStateException("Couldn't save the tone")
    }
    RingtoneManager.setActualDefaultRingtoneUri(context, ringtoneType, uri)
    return uri.toString()
  }
}
