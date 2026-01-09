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

# OneSignal - правила для работы с включенной минификацией
-keep class com.onesignal.** { *; }
-keepclassmembers class com.onesignal.** { *; }
-dontwarn com.onesignal.**
-keep interface com.onesignal.** { *; }

# React Native OneSignal
-keep class com.geektime.rnonesignalandroid.** { *; }
-keepclassmembers class com.geektime.rnonesignalandroid.** { *; }

# Add any project specific keep options here:

# Android 15+ Edge-to-Edge Compatibility
# Удаляем вызовы deprecated Status Bar APIs из React Native StatusBar модуля
# Это решает проблему с Google Play о использовании deprecated APIs в Android 15+
-assumenosideeffects class android.view.Window {
    public int getStatusBarColor();
    public void setStatusBarColor(int);
    public void setNavigationBarColor(int);
}

# Сохраняем WindowInsetsControllerCompat - это правильный API для Android 15+
-keep class androidx.core.view.WindowInsetsControllerCompat { *; }
-keep class androidx.core.view.WindowCompat { *; }

# Удаляем неиспользуемые методы из React Native StatusBar модуля
# Наш кастомный EdgeToEdgeStatusBarModule заменяет функциональность
-assumenosideeffects class com.facebook.react.modules.statusbar.StatusBarModule {
    *** getTypedExportedConstants(...);
}

# Google ML Kit - сохраняем для правильной работы barcode scanner
-keep class com.google.mlkit.** { *; }
-dontwarn com.google.mlkit.**
