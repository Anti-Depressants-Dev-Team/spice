package xyz.spiceapp.mobile.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val SpicePink = Color(0xFFFF3D9A)
val SpiceCyan = Color(0xFF38C8D9)
val SpiceBackground = Color(0xFF050506)
val SpiceSurface = Color(0xFF111114)
val SpiceSurfaceHigh = Color(0xFF1A1A1F)
val SpiceTextMuted = Color(0xFFA7A5AE)

private val SpiceColors = darkColorScheme(
    primary = SpicePink,
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
fun SpiceTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = SpiceColors, typography = Typography(), content = content)
}
