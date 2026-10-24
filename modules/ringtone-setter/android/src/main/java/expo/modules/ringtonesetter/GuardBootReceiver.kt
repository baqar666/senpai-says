package expo.modules.ringtonesetter

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// Turns the screen-time guard back on after a reboot or an app update.
class GuardBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
    if (!GuardPrefs.enabled(context) || !GuardPrefs.hasUsageAccess(context)) return
    try {
      GuardService.start(context)
    } catch (_: Exception) {
      // Some phones block background starts; the app restarts the guard next time it opens.
    }
  }
}
