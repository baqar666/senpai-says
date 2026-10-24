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

    // --- Screen-time guard (see GuardService) ---

    Events("onGuard")

    OnCreate {
      GuardBus.listener = { level, pkg -> sendEvent("onGuard", mapOf("level" to level, "pkg" to pkg)) }
    }

    OnDestroy {
      GuardBus.listener = null
    }

    Function("hasUsageAccess") {
      GuardPrefs.hasUsageAccess(context)
    }

    Function("openUsageAccessSettings") {
      context.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    Function("canDrawOverlays") {
      Settings.canDrawOverlays(context)
    }

    Function("openOverlaySettings") {
      val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)
        .setData(Uri.parse("package:" + context.packageName))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    Function("startGuard") { packages: List<String>, limitMinutes: Int ->
      GuardPrefs.configure(context, true, packages, limitMinutes)
      GuardService.start(context)
    }

    Function("stopGuard") {
      GuardPrefs.setEnabled(context, false)
      GuardService.stop(context)
    }

    Function("guardStatus") {
      GuardPrefs.rollDay(context, System.currentTimeMillis())
      mapOf(
        "usedMinutes" to (GuardPrefs.usedMs(context) / 60_000).toInt(),
        "limitMinutes" to (GuardPrefs.limitMs(context) / 60_000).toInt(),
        "level" to GuardPrefs.level(context),
      )
    }

    Function("takePendingGuard") {
      val p = GuardBus.pending
      GuardBus.pending = null
      p?.let { mapOf("level" to it.first, "pkg" to it.second) }
    }

    // "5 more minutes": hide the app and go back to what the user was doing.
    Function("snoozeGuard") { minutes: Int ->
      GuardPrefs.snooze(context, System.currentTimeMillis() + minutes * 60_000L)
      appContext.currentActivity?.moveTaskToBack(true)
    }

    // "OK, I'll rest": leave for the home screen. If they open the app again she's back in a minute.
    Function("goHome") {
      GuardPrefs.snooze(context, System.currentTimeMillis() + 60_000L)
      context.startActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
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
