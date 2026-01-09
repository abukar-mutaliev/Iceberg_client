package com.abuingush.iceberg

import android.os.Build
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil

/**
 * Кастомный StatusBar модуль для Android 15+ совместимости
 * 
 * Заменяет deprecated Window.getStatusBarColor/setStatusBarColor/setNavigationBarColor APIs
 * на современный WindowInsetsControllerCompat подход.
 * 
 * Этот модуль решает проблему с Google Play:
 * "Один или несколько используемых вами параметров для отображения от края до края или API 
 * не поддерживаются в Android 15"
 */
class EdgeToEdgeStatusBarModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "EdgeToEdgeStatusBar"
    }

    /**
     * Устанавливает светлый или темный стиль для status bar
     * Использует WindowInsetsControllerCompat вместо deprecated APIs
     */
    @ReactMethod
    fun setBarStyle(style: String) {
        UiThreadUtil.runOnUiThread {
            currentActivity?.window?.let { window ->
                val insetsController = WindowInsetsControllerCompat(window, window.decorView)
                
                // Определяем светлый стиль (темные иконки) или темный стиль (светлые иконки)
                val isLightStyle = style == "light-content" || style == "dark"
                insetsController.isAppearanceLightStatusBars = !isLightStyle
            }
        }
    }

    /**
     * Управляет видимостью status bar
     */
    @ReactMethod
    fun setHidden(hidden: Boolean) {
        UiThreadUtil.runOnUiThread {
            currentActivity?.window?.let { window ->
                val insetsController = WindowInsetsControllerCompat(window, window.decorView)
                
                if (hidden) {
                    insetsController.hide(android.view.WindowInsets.Type.statusBars())
                } else {
                    insetsController.show(android.view.WindowInsets.Type.statusBars())
                }
            }
        }
    }

    /**
     * Устанавливает прозрачность status bar
     * На Android 15+ всегда используется прозрачный status bar для edge-to-edge
     */
    @ReactMethod
    fun setTranslucent(translucent: Boolean) {
        // На Android 15+ status bar всегда прозрачный для edge-to-edge
        // Этот метод оставлен для совместимости с React Native API
        UiThreadUtil.runOnUiThread {
            currentActivity?.window?.let { window ->
                WindowCompat.setDecorFitsSystemWindows(window, !translucent)
            }
        }
    }
}

