import React, { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Image, View, StyleSheet, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { formatImageUrl } from '@shared/api/api';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1500;
const FADE_DURATION = 200;

const PLACEHOLDER_SOURCE = {
    uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
};


export function normalizeImageSource(source) {
    if (!source) return null;

    if (typeof source === 'number') return source;

    if (typeof source === 'string') {
        const trimmed = source.trim();
        if (!trimmed) return null;
        const url = formatImageUrl(trimmed);
        return url ? { uri: url } : null;
    }

    if (typeof source === 'object') {
        const raw = source.uri || source.url || source.path || source.src || source.imageUrl;
        if (raw && typeof raw === 'string') {
            const trimmed = raw.trim();
            if (!trimmed) return null;
            const url = formatImageUrl(trimmed);
            return url ? { uri: url } : null;
        }
    }

    return null;
}


function addRetryParam(source, attempt) {
    if (!source || typeof source === 'number' || !source.uri) return source;
    const sep = source.uri.includes('?') ? '&' : '?';
    return { ...source, uri: `${source.uri}${sep}_retry=${attempt}` };
}

const ReliableImageComponent = ({
    source,
    style,
    resizeMode = 'cover',
    showPlaceholder = true,
    placeholderIconSize = 24,
    placeholderText,
    onLoad: onLoadProp,
    onError: onErrorProp,
    fadeDuration = FADE_DURATION,
    ...rest
}) => {
    const { colors, isDark } = useTheme();
    const themedStyles = useMemo(
        () => createStyles(colors, isDark),
        [colors, isDark]
    );
    const skipFade = fadeDuration === 0;
    const [retryCount, setRetryCount] = useState(0);
    const [isFailed, setIsFailed] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const fadeAnim = useRef(new Animated.Value(skipFade ? 1 : 0)).current;
    const retryTimerRef = useRef(null);
    const isMountedRef = useRef(true);
    const sourceKeyRef = useRef(null);

    const normalized = normalizeImageSource(source);
    const sourceKey = normalized?.uri || (typeof normalized === 'number' ? String(normalized) : '');

    if (sourceKeyRef.current !== sourceKey) {
        sourceKeyRef.current = sourceKey;
        if (retryCount !== 0 || isFailed || isLoaded) {
            Promise.resolve().then(() => {
                if (isMountedRef.current) {
                    setRetryCount(0);
                    setIsFailed(false);
                    setIsLoaded(false);
                    fadeAnim.setValue(skipFade ? 1 : 0);
                }
            });
        }
    }

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
            }
        };
    }, []);

    const handleLoad = useCallback(() => {
        if (!isMountedRef.current) return;
        setIsLoaded(true);
        setIsFailed(false);
        if (!skipFade) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: fadeDuration,
                useNativeDriver: true,
            }).start();
        }
        onLoadProp?.();
    }, [fadeAnim, fadeDuration, skipFade, onLoadProp]);

    const handleError = useCallback(() => {
        if (!isMountedRef.current) return;

        const nextRetry = retryCount + 1;
        if (nextRetry <= MAX_RETRIES) {
            const delay = BASE_RETRY_DELAY * Math.pow(1.5, nextRetry - 1);
            retryTimerRef.current = setTimeout(() => {
                if (isMountedRef.current) {
                    setRetryCount(nextRetry);
                }
            }, delay);
        } else {
            setIsFailed(true);
            onErrorProp?.();
        }
    }, [retryCount, onErrorProp]);

    if (!normalized) {
        if (!showPlaceholder) return null;
        return <Placeholder style={style} iconSize={placeholderIconSize} text={placeholderText} />;
    }

    if (isFailed) {
        if (!showPlaceholder) return null;
        return <Placeholder style={style} iconSize={placeholderIconSize} text={placeholderText} />;
    }

    const effectiveSource = retryCount > 0
        ? addRetryParam(normalized, retryCount)
        : normalized;

    const cacheHeaders = typeof effectiveSource === 'object' && effectiveSource.uri
        ? {
            ...effectiveSource,
            headers: {
                ...(effectiveSource.headers || {}),
                'Cache-Control': 'max-age=604800',
            },
        }
        : effectiveSource;

    const wrapperStyle = [themedStyles.wrapper, style];

    return (
        <View style={wrapperStyle}>
            {!isLoaded && showPlaceholder && (
                <View style={[StyleSheet.absoluteFill, themedStyles.loadingContainer]}>
                    <View style={themedStyles.loadingPulse} />
                </View>
            )}
            <Animated.Image
                source={cacheHeaders}
                style={[StyleSheet.absoluteFill, !skipFade && { opacity: fadeAnim }]}
                resizeMode={resizeMode}
                defaultSource={PLACEHOLDER_SOURCE}
                onLoad={handleLoad}
                onError={handleError}
                {...rest}
            />
        </View>
    );
};

export const Placeholder = memo(({ style, iconSize = 24, text }) => {
    const { colors, isDark } = useTheme();
    const themedStyles = useMemo(
        () => createStyles(colors, isDark),
        [colors, isDark]
    );

    const gradientColors = isDark
        ? [
            colors.surfaceSecondary || colors.surface || '#252836',
            colors.surfaceElevated || colors.surface || '#252836',
            colors.cardBackground || colors.surface || '#1A1C24',
        ]
        : ['#dfe7ff', '#cdd6ff', '#bfc7ff'];
    const iconColor = isDark ? (colors.textSecondary || 'rgba(255,255,255,0.85)') : 'rgba(255,255,255,0.95)';

    return (
        <LinearGradient
            colors={gradientColors}
            style={[themedStyles.placeholder, style]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <Icon name="image" size={iconSize} color={iconColor} />
            {text !== undefined ? (
                text ? <PlaceholderText textColor={iconColor}>{text}</PlaceholderText> : null
            ) : (
                <PlaceholderText textColor={iconColor}>Нет фото</PlaceholderText>
            )}
        </LinearGradient>
    );
});

const PlaceholderText = ({ children, textColor }) => (
    <Animated.Text style={[baseStyles.placeholderText, { color: textColor }]}>
        {children}
    </Animated.Text>
);

export const ReliableImage = memo(ReliableImageComponent);

const baseStyles = StyleSheet.create({
    placeholderText: {
        marginTop: 6,
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.95)',
    },
});

const createStyles = (colors, isDark) => StyleSheet.create({
    wrapper: {
        overflow: 'hidden',
        backgroundColor: 'transparent',
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: isDark ? (colors.surfaceSecondary || colors.surface || '#252836') : '#f0f0f0',
    },
    loadingPulse: {
        width: '60%',
        height: '60%',
        borderRadius: 8,
        backgroundColor: isDark ? colors.surfaceElevated : '#e5e5e5',
    },
    placeholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
