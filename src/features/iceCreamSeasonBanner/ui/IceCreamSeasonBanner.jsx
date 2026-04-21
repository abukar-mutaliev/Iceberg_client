import React, { useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@app/providers/themeProvider/ThemeProvider";

export default function IceCreamSeasonBanner() {
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { isDark } = useTheme();
  const styles = useMemo(() => createStyles(isDark), [isDark]);

  const gradientColors = isDark
    ? ["#4A2F3A", "#5C4733"]
    : ["#f4b0c4", "#fce0b8"];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.gradient}
      >
        <View style={styles.iconWrapper}>
          <Text style={styles.icon}>🍦</Text>
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.title}>Сезон мороженого стартовал!</Text>
          <Text style={styles.subtitle}>
             Ассортимент мороженого будет пополняться каждый день
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const createStyles = (isDark) => StyleSheet.create({
  container: {
    marginHorizontal: 10,
    marginTop: 0,
    marginBottom: 10,
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: isDark ? 0.4 : 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  gradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 18,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? "rgba(244, 176, 196, 0.2)" : "transparent",
  },

  iconWrapper: {
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  icon: {
    fontSize: Platform.OS === "ios" ? 42 : 38,
    lineHeight: Platform.OS === "ios" ? 50 : 46,
    textAlign: "center",
  },

  textBlock: {
    flex: 1,
  },

  title: {
    fontSize: 17,
    fontWeight: "700",
    color: isDark ? "#F4E3D7" : "#3a2c2c",
  },

  subtitle: {
    fontSize: 13,
    color: isDark ? "rgba(244, 227, 215, 0.75)" : "#5f4b4b",
    marginTop: 3,
  },
});
