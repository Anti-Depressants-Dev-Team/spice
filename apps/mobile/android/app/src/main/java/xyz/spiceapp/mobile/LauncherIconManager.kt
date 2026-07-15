package xyz.spiceapp.mobile

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import xyz.spiceapp.mobile.model.AccentTheme

internal enum class LauncherIconAlias(
    val theme: AccentTheme,
    val relativeComponentName: String,
    val enabledByDefault: Boolean = false,
) {
    NeonSpice(AccentTheme.NeonSpice, ".launcher.NeonSpice"),
    OceanBreeze(AccentTheme.OceanBreeze, ".launcher.OceanBreeze"),
    SolarFire(AccentTheme.SolarFire, ".launcher.SolarFire"),
    JadeEmerald(AccentTheme.JadeEmerald, ".launcher.JadeEmerald"),
    ImperialGold(AccentTheme.ImperialGold, ".launcher.ImperialGold"),
    CrimsonMoon(AccentTheme.CrimsonMoon, ".launcher.CrimsonMoon"),
    MidnightVelvet(
        AccentTheme.MidnightVelvet,
        ".launcher.MidnightVelvet",
        enabledByDefault = true,
    ),
}

internal fun launcherIconAliasFor(theme: AccentTheme): LauncherIconAlias =
    LauncherIconAlias.entries.single { it.theme == theme }

internal class LauncherIconManager(context: Context) {
    private val appContext = context.applicationContext
    private val packageManager = appContext.packageManager

    fun apply(theme: AccentTheme) {
        runCatching {
            val changes = LauncherIconAlias.entries.mapNotNull { alias ->
                val component = ComponentName(
                    appContext.packageName,
                    appContext.packageName + alias.relativeComponentName,
                )
                val shouldEnable = alias.theme == theme
                val currentSetting = packageManager.getComponentEnabledSetting(component)
                val currentlyEnabled = when (currentSetting) {
                    PackageManager.COMPONENT_ENABLED_STATE_ENABLED -> true
                    PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                    PackageManager.COMPONENT_ENABLED_STATE_DISABLED_USER,
                    PackageManager.COMPONENT_ENABLED_STATE_DISABLED_UNTIL_USED -> false
                    else -> alias.enabledByDefault
                }
                if (currentlyEnabled == shouldEnable) {
                    null
                } else {
                    component to if (shouldEnable) {
                        PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                    } else {
                        PackageManager.COMPONENT_ENABLED_STATE_DISABLED
                    }
                }
            }

            if (changes.isEmpty()) return@runCatching

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                packageManager.setComponentEnabledSettings(
                    changes.map { (component, state) ->
                        PackageManager.ComponentEnabledSetting(
                            component,
                            state,
                            PackageManager.DONT_KILL_APP,
                        )
                    },
                )
            } else {
                changes
                    .sortedBy { (_, state) ->
                        state != PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                    }
                    .forEach { (component, state) ->
                        packageManager.setComponentEnabledSetting(
                            component,
                            state,
                            PackageManager.DONT_KILL_APP,
                        )
                    }
            }
        }.onFailure { error ->
            Log.w(LOG_TAG, "Could not update the launcher icon for ${theme.name}", error)
        }
    }

    private companion object {
        const val LOG_TAG = "SpiceLauncherIcon"
    }
}
