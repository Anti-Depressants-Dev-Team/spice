package xyz.spiceapp.mobile.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import xyz.spiceapp.mobile.model.AccentTheme

val SpicePink = Color(0xFFFF3D9A)
val SpiceCyan = Color(0xFF38C8D9)
val SpiceOrange = Color(0xFFFF6B35)
val SpiceGreen = Color(0xFF16C28B)
val SpiceGold = Color(0xFFF59E0B)
val SpiceRed = Color(0xFFE40035)
val SpicePurple = Color(0xFF32106B)
val SpiceBackground = Color(0xFF050506)
val SpiceSurface = Color(0xFF111114)
val SpiceSurfaceHigh = Color(0xFF1A1A1F)
val SpiceTextMuted = Color(0xFFA7A5AE)

fun AccentTheme.toColor(): Color =
    when (this) {
        AccentTheme.NeonSpice -> SpicePink
        AccentTheme.OceanBreeze -> Color(0xFF2EA8E6)
        AccentTheme.SolarFire -> SpiceOrange
        AccentTheme.JadeEmerald -> SpiceGreen
        AccentTheme.ImperialGold -> SpiceGold
        AccentTheme.CrimsonMoon -> SpiceRed
        AccentTheme.MidnightVelvet -> SpicePurple
    }

private fun spiceColors(accentTheme: AccentTheme) = darkColorScheme(
    primary = accentTheme.toColor(),
    onPrimary = Color.White,
    secondary = SpiceCyan,
    onSecondary = Color.Black,
    background = SpiceBackground,
    onBackground = Color(0xFFF7F5F8),
    surface = SpiceSurface,
    onSurface = Color(0xFFF7F5F8),
    surfaceVariant = SpiceSurfaceHigh,
    onSurfaceVariant = SpiceTextMuted,
    error = Color(0xFFFF6B70),
)

@Composable
fun SpiceTheme(accentTheme: AccentTheme = AccentTheme.NeonSpice, content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = spiceColors(accentTheme), typography = Typography(), content = content)
}
