package expo.modules.ringtonesetter

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings

// Counts today's time in the apps the user picked and brings the app (and its girl) to the
// front once the daily limit is passed. Runs as a foreground service so Android keeps it alive.
class GuardService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var current: String? = null
  private var lastQuery = 0L
  private var lastTick = 0L
  private val overlay by lazy { GuardOverlay(this) }

  private val tick = object : Runnable {
    override fun run() {
      try {
        check()
      } catch (_: Exception) {
        // A failed usage query shouldn't kill the service; try again next tick.
      }
      handler.postDelayed(this, TICK_MS)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startForeground(NOTIFICATION_ID, buildNotification())
    if (!GuardPrefs.enabled(this) || !GuardPrefs.hasUsageAccess(this)) {
      stopSelf()
      return START_NOT_STICKY
    }
    handler.removeCallbacks(tick)
    val now = System.currentTimeMillis()
    GuardPrefs.rollDay(this, now)
    GuardPrefs.setUsed(this, usedToday(now))
    lastQuery = now
    lastTick = now
    handler.post(tick)
    return START_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(tick)
    overlay.hide()
    super.onDestroy()
  }

  private fun check() {
    if (!GuardPrefs.enabled(this)) {
      stopSelf()
      return
    }
    val now = System.currentTimeMillis()
    GuardPrefs.rollDay(this, now)
    updateForeground(now)
    val elapsed = (now - lastTick).coerceIn(0, TICK_MS * 3)
    lastTick = now
    // The app underneath stays "in front" while the warning covers it; don't count that time.
    if (overlay.showing) return

    val screenOn = getSystemService(PowerManager::class.java)?.isInteractive ?: true
    val pkg = current ?: return
    if (!screenOn || pkg !in GuardPrefs.packages(this)) return

    val used = GuardPrefs.addUsed(this, elapsed)
    if (used >= GuardPrefs.limitMs(this) && now >= GuardPrefs.snoozeUntil(this) && Settings.canDrawOverlays(this)) {
      trigger(pkg, now)
    }
  }

  private fun trigger(pkg: String, now: Long) {
    val level = GuardPrefs.nextLevel(this)
    GuardPrefs.snooze(this, now + 90_000)
    val minutes = GuardPrefs.usedMs(this) / 60_000
    val shown = overlay.show(
      level,
      pkg,
      minutes,
      onRest = {
        // Leaving for the home screen is allowed while our overlay is visible. Back in a minute if they return.
        GuardPrefs.snooze(this, System.currentTimeMillis() + 60_000)
        startActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      },
      onSnooze = { m -> GuardPrefs.snooze(this, System.currentTimeMillis() + m * 60_000L) }
    )
    if (shown) return
    // No pack prepared yet (app not opened since installing): open the app's own warning instead.
    // Android 15 may block this from the background, which is why the overlay above is preferred.
    GuardBus.pending = level to pkg
    GuardBus.listener?.invoke(level, pkg)
    launchIntent()?.let { runCatching { startActivity(it) } }
  }

  // Follows which app is in front from the system's activity events since the last tick.
  private fun updateForeground(now: Long) {
    val usm = getSystemService(UsageStatsManager::class.java) ?: return
    val events = usm.queryEvents(lastQuery, now)
    val e = UsageEvents.Event()
    while (events.hasNextEvent()) {
      events.getNextEvent(e)
      when (e.eventType) {
        RESUMED -> current = e.packageName
        PAUSED -> if (e.packageName == current) current = null
      }
    }
    lastQuery = now
  }

  // Rebuilds today's total from the event log, so restarts and reboots don't lose time.
  private fun usedToday(now: Long): Long {
    val usm = getSystemService(UsageStatsManager::class.java) ?: return 0
    val watched = GuardPrefs.packages(this)
    val events = usm.queryEvents(GuardPrefs.startOfDay(now), now)
    val e = UsageEvents.Event()
    var total = 0L
    var openPkg: String? = null
    var openAt = 0L
    fun close(at: Long) {
      val pkg = openPkg
      if (pkg != null && pkg in watched) total += at - openAt
      openPkg = null
    }
    while (events.hasNextEvent()) {
      events.getNextEvent(e)
      when (e.eventType) {
        RESUMED -> {
          close(e.timeStamp)
          openPkg = e.packageName
          openAt = e.timeStamp
        }
        PAUSED -> if (e.packageName == openPkg) close(e.timeStamp)
        SCREEN_OFF -> close(e.timeStamp)
      }
    }
    // Whatever is still open counts up to now and is the app in front.
    current = openPkg
    close(now)
    return total
  }

  private fun launchIntent(): Intent? =
    packageManager.getLaunchIntentForPackage(packageName)?.addFlags(
      Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
    )

  private fun buildNotification(): Notification {
    val nm = getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      nm?.createNotificationChannel(
        NotificationChannel(CHANNEL, "Screen time guard", NotificationManager.IMPORTANCE_LOW).apply {
          description = "Shown while Senpai keeps an eye on your screen time"
          setShowBadge(false)
        }
      )
    }
    val open = launchIntent()?.let {
      PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }
    val minutes = GuardPrefs.limitMs(this) / 60_000
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
    }
    return builder
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("Senpai is watching your screen time 👀")
      .setContentText("She'll stop you after $minutes min a day on your picked apps")
      .setOngoing(true)
      .setContentIntent(open)
      .build()
  }

  companion object {
    private const val TICK_MS = 5_000L
    private const val NOTIFICATION_ID = 4417
    private const val CHANNEL = "screen-guard"
    private const val RESUMED = 1 // UsageEvents.Event.ACTIVITY_RESUMED (MOVE_TO_FOREGROUND before Q)
    private const val PAUSED = 2 // UsageEvents.Event.ACTIVITY_PAUSED (MOVE_TO_BACKGROUND before Q)
    private const val SCREEN_OFF = 16 // UsageEvents.Event.SCREEN_NON_INTERACTIVE

    fun start(c: Context) {
      val intent = Intent(c, GuardService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) c.startForegroundService(intent) else c.startService(intent)
    }

    fun stop(c: Context) {
      c.stopService(Intent(c, GuardService::class.java))
    }
  }
}
