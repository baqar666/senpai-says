package expo.modules.ringtonesetter

import android.app.AppOpsManager
import android.content.Context
import android.os.Build
import android.os.Process
import org.json.JSONObject
import java.util.Calendar

// Screen-time guard state, shared by the module (JS side), the service and the boot receiver.
// Everything stays on the device.
object GuardPrefs {
  private fun p(c: Context) = c.getSharedPreferences("senpai_guard", Context.MODE_PRIVATE)

  fun enabled(c: Context) = p(c).getBoolean("enabled", false)
  fun packages(c: Context): Set<String> = p(c).getStringSet("packages", emptySet()) ?: emptySet()
  fun limitMs(c: Context) = p(c).getInt("limitMin", 60) * 60_000L
  fun usedMs(c: Context) = p(c).getLong("used", 0)
  fun level(c: Context) = p(c).getInt("level", 0)
  fun snoozeUntil(c: Context) = p(c).getLong("snooze", 0)

  fun configure(c: Context, enabled: Boolean, packages: List<String>, limitMin: Int) {
    p(c).edit()
      .putBoolean("enabled", enabled)
      .putStringSet("packages", packages.toSet())
      .putInt("limitMin", limitMin)
      .apply()
  }

  fun setEnabled(c: Context, enabled: Boolean) = p(c).edit().putBoolean("enabled", enabled).apply()
  fun setUsed(c: Context, ms: Long) = p(c).edit().putLong("used", ms).apply()
  fun addUsed(c: Context, ms: Long): Long = (usedMs(c) + ms).also { setUsed(c, it) }
  fun nextLevel(c: Context): Int = (level(c) + 1).also { p(c).edit().putInt("level", it).apply() }
  fun snooze(c: Context, until: Long) = p(c).edit().putLong("snooze", until).apply()

  // What the overlay shows, prepared by the app (src/lib/guard.ts prepareGuardPack).
  fun setPack(c: Context, json: String) = p(c).edit().putString("pack", json).apply()
  fun pack(c: Context): JSONObject? = p(c).getString("pack", null)?.let { runCatching { JSONObject(it) }.getOrNull() }

  // A new day starts with a clean slate: no time used, no warnings given.
  fun rollDay(c: Context, now: Long) {
    val day = dayKey(now)
    if (p(c).getInt("day", 0) != day) {
      p(c).edit().putInt("day", day).putLong("used", 0).putInt("level", 0).putLong("snooze", 0).apply()
    }
  }

  fun startOfDay(now: Long): Long = Calendar.getInstance().apply {
    timeInMillis = now
    set(Calendar.HOUR_OF_DAY, 0)
    set(Calendar.MINUTE, 0)
    set(Calendar.SECOND, 0)
    set(Calendar.MILLISECOND, 0)
  }.timeInMillis

  private fun dayKey(now: Long): Int {
    val cal = Calendar.getInstance().apply { timeInMillis = now }
    return cal.get(Calendar.YEAR) * 1000 + cal.get(Calendar.DAY_OF_YEAR)
  }

  fun hasUsageAccess(c: Context): Boolean {
    val ops = c.getSystemService(AppOpsManager::class.java) ?: return false
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), c.packageName)
    } else {
      @Suppress("DEPRECATION")
      ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), c.packageName)
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }
}

// Hands a triggered warning to JS: as an event if the app is running, or as `pending`
// for the app to pick up when it comes to the front.
object GuardBus {
  @Volatile var pending: Pair<Int, String>? = null
  @Volatile var listener: ((Int, String) -> Unit)? = null
}
