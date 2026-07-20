package com.example.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme = darkColorScheme(
  primary = CelestialGold,
  secondary = MysticAmber,
  tertiary = AstralRose,
  background = DeepMidnight,
  surface = DarkSpacePurple,
  onPrimary = DeepMidnight,
  onSecondary = DeepMidnight,
  onTertiary = GalacticWhite,
  onBackground = GalacticWhite,
  onSurface = GalacticWhite,
  surfaceVariant = SoftPlum,
  onSurfaceVariant = SpaceLavender
)

private val LightColorScheme = DarkColorScheme // Keep it consistently dark and mystical for celestial night sky theme

@Composable
fun MyApplicationTheme(
  darkTheme: Boolean = isSystemInDarkTheme(),
  dynamicColor: Boolean = false, // Disable device-specific dynamic colors to maintain mystical theme
  content: @Composable () -> Unit,
) {
  val colorScheme = DarkColorScheme

  MaterialTheme(colorScheme = colorScheme, typography = Typography, content = content)
}
