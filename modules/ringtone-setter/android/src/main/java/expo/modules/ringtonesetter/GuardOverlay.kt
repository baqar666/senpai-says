package expo.modules.ringtonesetter

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.TypedValue
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.VideoView

// The screen-time warning, drawn by GuardService straight over the app the user is scrolling.
// Android 15 blocks background apps from opening screens unless they already show an overlay, so
// this window is the warning itself. What it shows (voice files with the user's name, animation,
// text, colours) is prepared by the app in src/lib/guard.ts prepareGuardPack().
class GuardOverlay(private val context: Context) {
  private val wm = context.getSystemService(WindowManager::class.java)
  private val handler = Handler(Looper.getMainLooper())
  private var root: View? = null
  private var video: VideoView? = null
  private var voice: MediaPlayer? = null
  private var voiceStartMs = 0L

  val showing get() = root != null

  // False when there's nothing to show yet (the app hasn't prepared a pack), so the caller can fall back.
  fun show(level: Int, pkg: String, usedMinutes: Long, onRest: () -> Unit, onSnooze: (Int) -> Unit): Boolean {
    if (showing) return true
    val pack = GuardPrefs.pack(context) ?: return false
    // Same rule as guardGirl() in guard.ts: someone gentle first, someone stricter after a snooze.
    val day = (System.currentTimeMillis() / 86_400_000L).toInt()
    val gentle = pack.getJSONArray("gentle")
    val strict = pack.getJSONArray("strict")
    val id = if (level <= 1) gentle.getString(day % gentle.length()) else strict.getString((day + level) % strict.length())
    val girl = pack.getJSONObject("girls").optJSONObject(id) ?: return false
    val lines = girl.getJSONObject("lines")
    val line = lines.optJSONObject(if (level <= 1) "rest" else "rest2") ?: lines.optJSONObject("rest") ?: return false
    val snoozeMinutes = pack.optInt("snoozeMinutes", 5)
    val appLabel = pack.optJSONObject("appLabels")?.optString(pkg).orEmpty().ifEmpty { "your phone" }
    val bg = parseColor(girl.optString("bg"), "#ECE8F3")
    val fg = parseColor(girl.optString("fg"), "#3D3650")
    voiceStartMs = (girl.optDouble("voiceStart", 0.8) * 1000).toLong()

    val content = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(dp(24), dp(24), dp(24), dp(24))
    }
    content.addView(text("${duration(usedMinutes)} on $appLabel today", 13f, fg, bold = true).apply { alpha = 0.8f })

    val size = minOf(context.resources.displayMetrics.widthPixels - dp(48), dp(380))
    val stage = FrameLayout(context).apply {
      background = GradientDrawable().apply { setColor(bg); cornerRadius = dp(32).toFloat() }
      elevation = dp(10).toFloat()
      clipToOutline = true
    }
    content.addView(stage, LinearLayout.LayoutParams(size, size).apply { topMargin = dp(20) })
    girl.optString("video").takeIf { it.isNotEmpty() && it != "null" }?.let { path ->
      video = VideoView(context).apply {
        setVideoURI(Uri.parse(path))
        // No looping on its own: each time it starts over, the voice line starts with it.
        setOnPreparedListener { mp ->
          mp.setVolume(0f, 0f)
          start()
          speakSoon()
        }
        setOnCompletionListener {
          seekTo(0)
          start()
          speakSoon()
        }
        setOnErrorListener { _, _, _ ->
          speakSoon()
          true
        }
      }
      stage.addView(video, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
    }

    content.addView(text(girl.optString("name"), 15f, fg, bold = true).apply { setPadding(0, dp(22), 0, 0) })
    content.addView(text("“${line.optString("text")}”", 20f, Color.parseColor("#3D3650"), bold = true).apply { setPadding(0, dp(8), 0, 0) })
    line.optString("sub").takeIf { it.isNotEmpty() }?.let {
      content.addView(text(it, 13f, Color.parseColor("#7D7591")).apply { setTypeface(typeface, Typeface.ITALIC); setPadding(0, dp(6), 0, 0) })
    }

    val rest = button("OK, I'll rest 💤", primary = true) {
      hide()
      onRest()
    }
    val snooze = button("$snoozeMinutes more minutes…", primary = false) {
      hide()
      onSnooze(snoozeMinutes)
    }
    content.addView(rest, LinearLayout.LayoutParams(MATCH_PARENT, dp(54)).apply { topMargin = dp(28) })
    content.addView(snooze, LinearLayout.LayoutParams(MATCH_PARENT, dp(46)).apply { topMargin = dp(14) })

    // Back counts as "5 more minutes", like the in-app version.
    val frame = object : FrameLayout(context) {
      override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode == KeyEvent.KEYCODE_BACK) {
          if (event.action == KeyEvent.ACTION_UP) {
            hide()
            onSnooze(snoozeMinutes)
          }
          return true
        }
        return super.dispatchKeyEvent(event)
      }
    }.apply {
      setBackgroundColor(bg)
      isFocusable = true
      isFocusableInTouchMode = true
      addView(content, FrameLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT, Gravity.CENTER))
    }

    voice = runCatching {
      MediaPlayer().apply {
        setDataSource(context, Uri.parse(line.getString("audio")))
        prepare()
      }
    }.getOrNull()

    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
      @Suppress("DEPRECATION")
      WindowManager.LayoutParams.TYPE_PHONE
    }
    val params = WindowManager.LayoutParams(
      MATCH_PARENT,
      MATCH_PARENT,
      type,
      WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
      PixelFormat.TRANSLUCENT
    )
    return try {
      wm.addView(frame, params)
      root = frame
      frame.requestFocus()
      if (video == null) repeatWithoutVideo()
      true
    } catch (_: Exception) {
      release()
      false
    }
  }

  fun hide() {
    root?.let { runCatching { wm.removeView(it) } }
    root = null
    release()
  }

  private fun release() {
    handler.removeCallbacksAndMessages(null)
    video?.stopPlayback()
    video = null
    voice?.release()
    voice = null
  }

  // Starts the line when her mouth starts moving in the clip, unless she's still finishing the last one.
  private fun speakSoon() {
    handler.removeCallbacksAndMessages(null)
    handler.postDelayed({
      voice?.takeIf { !it.isPlaying }?.let {
        it.seekTo(0)
        it.start()
      }
    }, voiceStartMs)
  }

  private fun repeatWithoutVideo() {
    speakSoon()
    handler.postDelayed({ if (showing) repeatWithoutVideo() }, 6_000)
  }

  private fun text(value: String, sp: Float, color: Int, bold: Boolean = false) = TextView(context).apply {
    text = value
    setTextSize(TypedValue.COMPLEX_UNIT_SP, sp)
    setTextColor(color)
    gravity = Gravity.CENTER
    if (bold) setTypeface(typeface, Typeface.BOLD)
  }

  private fun button(label: String, primary: Boolean, onClick: () -> Unit) =
    text(label, if (primary) 16f else 14f, Color.parseColor(if (primary) "#D4537E" else "#7D7591"), bold = true).apply {
      background = GradientDrawable().apply {
        setColor(Color.parseColor("#F4F1F8"))
        cornerRadius = dp(18).toFloat()
      }
      elevation = dp(if (primary) 5 else 3).toFloat()
      isClickable = true
      setOnClickListener { onClick() }
    }

  private fun duration(minutes: Long) =
    if (minutes >= 60) "${minutes / 60} h${if (minutes % 60 > 0) " ${minutes % 60} min" else ""}" else "$minutes min"

  private fun parseColor(value: String, fallback: String) = runCatching { Color.parseColor(value) }.getOrElse { Color.parseColor(fallback) }

  private fun dp(v: Int) =
    TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), context.resources.displayMetrics).toInt()
}
