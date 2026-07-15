package xyz.spiceapp.mobile

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import xyz.spiceapp.mobile.model.AccentTheme

class LauncherIconManagerTest {
    @Test
    fun launcherAliasesCoverEveryAccentThemeExactlyOnce() {
        assertEquals(
            AccentTheme.entries.toSet(),
            LauncherIconAlias.entries.map { it.theme }.toSet(),
        )
        assertEquals(
            LauncherIconAlias.entries.size,
            LauncherIconAlias.entries.map { it.relativeComponentName }.toSet().size,
        )
    }

    @Test
    fun midnightVelvetIsTheSinglePurpleDefault() {
        val defaults = LauncherIconAlias.entries.filter { it.enabledByDefault }

        assertEquals(listOf(LauncherIconAlias.MidnightVelvet), defaults)
        assertEquals(
            LauncherIconAlias.MidnightVelvet,
            launcherIconAliasFor(AccentTheme.MidnightVelvet),
        )
        assertTrue(defaults.single().relativeComponentName.endsWith(".MidnightVelvet"))
    }
}
