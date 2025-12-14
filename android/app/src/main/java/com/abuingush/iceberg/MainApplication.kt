package com.abuingush.iceberg

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.res.Configuration
import android.os.Build

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
        this,
        object : DefaultReactNativeHost(this) {
          override fun getPackages(): List<ReactPackage> {
            val packages = PackageList(this).packages
            // Packages that cannot be autolinked yet can be added manually here, for example:
            // packages.add(new MyReactNativePackage());
            return packages
          }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
          override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
    
    // Создаем канал уведомлений с высоким приоритетом для heads-up уведомлений
    createNotificationChannel()
  }
  
  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channelId = "onesignal_default_channel"
      val channelName = "Сообщения чата"
      // Используем IMPORTANCE_MAX для гарантированных heads-up уведомлений
      // IMPORTANCE_HIGH (4) может не всегда показывать heads-up на некоторых устройствах
      // IMPORTANCE_MAX (5) гарантирует всплывающие уведомления
      val importance = NotificationManager.IMPORTANCE_MAX
      
      val channel = NotificationChannel(channelId, channelName, importance).apply {
        description = "Уведомления о новых сообщениях в чате"
        enableLights(true)
        lightColor = android.graphics.Color.parseColor("#FF007AFF")
        enableVibration(true)
        vibrationPattern = longArrayOf(0, 250, 250, 250)
        setShowBadge(true)
        // Для heads-up уведомлений важно установить звук
        setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI, null)
        // Устанавливаем, что уведомления должны показываться на заблокированном экране
        lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
        // Включаем все возможности для heads-up
        setBypassDnd(false) // Не обходим режим "Не беспокоить" (может быть заблокировано системой)
      }
      
      val notificationManager = getSystemService(NotificationManager::class.java)
      try {
        notificationManager?.createNotificationChannel(channel)
        
        // Проверяем, что канал создан правильно
        val createdChannel = notificationManager?.getNotificationChannel(channelId)
        if (createdChannel != null) {
          android.util.Log.d("MainApplication", "✅ Канал уведомлений создан: $channelId, важность: ${createdChannel.importance}")
          android.util.Log.d("MainApplication", "   Звук: ${createdChannel.sound != null}, Вибрация: ${createdChannel.shouldVibrate()}")
        } else {
          android.util.Log.e("MainApplication", "❌ Ошибка: канал уведомлений не создан после попытки создания")
        }
      } catch (e: Exception) {
        android.util.Log.e("MainApplication", "❌ Исключение при создании канала: ${e.message}")
        e.printStackTrace()
      }
    } else {
      android.util.Log.d("MainApplication", "⚠️ Версия Android < 8.0, каналы не требуются")
    }
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
