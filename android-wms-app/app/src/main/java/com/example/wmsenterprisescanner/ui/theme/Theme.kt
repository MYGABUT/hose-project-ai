package com.example.wmsenterprisescanner.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// YouTube-inspired: Always dark
private val YtDarkColorScheme = darkColorScheme(
    primary = YtRed,
    onPrimary = YtWhite,
    primaryContainer = YtRedDark,
    onPrimaryContainer = YtWhite,

    secondary = YtBlue,
    onSecondary = YtWhite,
    secondaryContainer = Color(0xFF1A3A5C),
    onSecondaryContainer = YtBlue,

    tertiary = YtGreen,
    onTertiary = YtWhite,

    background = YtDarkBackground,
    onBackground = YtWhite,

    surface = YtDarkSurface,
    onSurface = YtWhite,
    surfaceVariant = YtDarkSurfaceVariant,
    onSurfaceVariant = YtLightGray,

    error = YtRedLight,
    onError = YtWhite,

    outline = YtDarkGray,
    outlineVariant = YtMediumGray
)

// Light fallback (matches YouTube light mode concept)
private val YtLightColorScheme = lightColorScheme(
    primary = YtRed,
    onPrimary = YtWhite,
    primaryContainer = Color(0xFFFFDAD5),
    onPrimaryContainer = Color(0xFF410002),

    secondary = Color(0xFF065FD4),
    onSecondary = YtWhite,

    background = Color(0xFFF9F9F9),
    onBackground = Color(0xFF0F0F0F),

    surface = YtWhite,
    onSurface = Color(0xFF0F0F0F),
    surfaceVariant = Color(0xFFF2F2F2),
    onSurfaceVariant = Color(0xFF606060)
)

@Composable
fun WMSEnterpriseScannerTheme(
    darkTheme: Boolean = true, // Force dark like YouTube
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) YtDarkColorScheme else YtLightColorScheme

    // Tint system bars
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window ?: return@SideEffect
            window.statusBarColor = YtDarkBackground.toArgb()
            window.navigationBarColor = YtDarkSurface.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}