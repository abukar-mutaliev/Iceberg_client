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

# expo-av (Audio.Sound / Audio.Recording, ExoPlayer + Sonic).
# В release-сборке R8 порой выкидывает классы, до которых дотягивается
# рефлексия из expo-av / ExoPlayer — после этого голосовые сообщения
# создают Sound, но он остаётся "isLoaded: false" и воспроизведение
# падает с "sound is not loaded". Удерживаем явно, чтобы исключить этот
# класс отказов на проде.
-keep class expo.modules.av.** { *; }
-keep class com.google.android.exoplayer2.** { *; }
-keep class androidx.media3.** { *; }
-keep class org.vinuxproject.sonic.** { *; }

# Add any project specific keep options here:
