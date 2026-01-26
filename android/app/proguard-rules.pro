# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# ============================================================================
# Android 15+ Edge-to-Edge Compatibility
# ============================================================================
# Решает проблему Google Play: "Используются неподдерживаемые API edge-to-edge"
# Удаляем вызовы deprecated Status Bar APIs из React Native

# Удаляем deprecated Window APIs для status/navigation bar
# Эти методы deprecated в Android 15+ и вызывают предупреждения в Google Play
-assumenosideeffects class android.view.Window {
    public int getStatusBarColor() return 0;
    public void setStatusBarColor(int);
    public void setNavigationBarColor(int);
}

# Сохраняем современные WindowInsetsController APIs (правильный подход для Android 15+)
-keep class androidx.core.view.WindowInsetsControllerCompat { *; }
-keep class androidx.core.view.WindowCompat { *; }
-keep class android.view.WindowInsetsController { *; }

# Удаляем проблемные вызовы из React Native StatusBarModule
# MainActivity использует WindowInsetsControllerCompat вместо deprecated APIs
-assumenosideeffects class com.facebook.react.modules.statusbar.StatusBarModule {
    *** setColor(...);
    *** setTranslucent(...);
    *** getTypedExportedConstants(...);
}

# Удаляем вызовы, выполняющиеся в guard-раннерах внутри StatusBarModule
-assumenosideeffects class com.facebook.react.modules.statusbar.StatusBarModule$* {
    *** runGuarded(...);
}

# Отключаем вызов edge-to-edge из React Native, который использует deprecated APIs
-assumenosideeffects class com.facebook.react.views.view.WindowUtilKt {
    *** enableEdgeToEdge(...);
}

# ============================================================================
# Google ML Kit Barcode Scanner
# ============================================================================
# Сохраняем ML Kit для правильной работы сканера
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.internal.mlkit** { *; }
-dontwarn com.google.mlkit.**

# ============================================================================
# React Native и связанные библиотеки
# ============================================================================
# OneSignal - правила для работы с включенной минификацией
-keep class com.onesignal.** { *; }
-keepclassmembers class com.onesignal.** { *; }
-dontwarn com.onesignal.**
-keep interface com.onesignal.** { *; }

# React Native OneSignal
-keep class com.geektime.rnonesignalandroid.** { *; }
-keepclassmembers class com.geektime.rnonesignalandroid.** { *; }
