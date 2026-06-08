import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Easing } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { FontFamily } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const CIRCLE_SIZE = normalize(44);

const ICON_MAP = {
    success: 'check',
    error: 'close',
    warning: 'warning-amber',
    info: 'info',
};

const getToastConfig = (type, isDark) => {
    if (isDark) {
        switch (type) {
            case 'success':
                return {
                    bg: '#1F6B46',
                    circleBg: '#2E8E63',
                    border: 'rgba(76, 217, 123, 0.45)',
                    textColor: '#EAF8EF',
                };
            case 'error':
                return {
                    bg: '#7A2320',
                    circleBg: '#A2342F',
                    border: 'rgba(255, 120, 110, 0.5)',
                    textColor: '#FDECEA',
                };
            case 'warning':
                return {
                    bg: '#5C4733',
                    circleBg: '#8A6A42',
                    border: 'rgba(255, 204, 0, 0.5)',
                    textColor: '#FFE7A6',
                };
            case 'info':
            default:
                return {
                    bg: '#2A2F55',
                    circleBg: '#3D4478',
                    border: 'rgba(150, 160, 255, 0.55)',
                    textColor: '#E3E6FF',
                };
        }
    }

    switch (type) {
        case 'success':
            return {
                bg: '#34C759',
                circleBg: '#2BB052',
                border: 'transparent',
                textColor: '#FFFFFF',
            };
        case 'error':
            return {
                bg: '#FF453A',
                circleBg: '#E0362C',
                border: 'transparent',
                textColor: '#FFFFFF',
            };
        case 'warning':
            return {
                bg: '#FFB020',
                circleBg: '#E69A12',
                border: 'transparent',
                textColor: '#1A1200',
            };
        case 'info':
        default:
            return {
                bg: '#3339B0',
                circleBg: '#2A2F94',
                border: 'transparent',
                textColor: '#FFFFFF',
            };
    }
};

export const Toast = ({
    message,
    type = 'success',
    duration = 3000,
    onHide,
    position = 'top',
    icon,
    action,
    actionText,
    onActionPress,
}) => {
    const { isDark } = useTheme();
    const [isVisible, setIsVisible] = useState(true);
    const [paneWidth, setPaneWidth] = useState(0);

    const containerOpacity = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(position === 'top' ? -24 : 24)).current;
    const circleScale = useRef(new Animated.Value(0)).current;
    const expandProgress = useRef(new Animated.Value(0)).current;

    const expandStartedRef = useRef(false);
    const hideTriggeredRef = useRef(false);

    const hideToast = () => {
        if (hideTriggeredRef.current) return;
        hideTriggeredRef.current = true;

        Animated.sequence([
            Animated.timing(expandProgress, {
                toValue: 0,
                duration: 220,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: false,
            }),
            Animated.parallel([
                Animated.timing(circleScale, {
                    toValue: 0,
                    duration: 180,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(containerOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: position === 'top' ? -24 : 24,
                    duration: 220,
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]),
        ]).start(() => {
            setIsVisible(false);
            onHide?.();
        });
    };

    // Fade-in контейнера + появление круга слева
    useEffect(() => {
        Animated.parallel([
            Animated.timing(containerOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 260,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.spring(circleScale, {
                toValue: 1,
                tension: 180,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();

        if (duration > 0) {
            const timer = setTimeout(hideToast, duration);
            return () => clearTimeout(timer);
        }
        return undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Когда узнали натуральную ширину панели — раскрываем её вправо
    useEffect(() => {
        if (paneWidth > 0 && !expandStartedRef.current) {
            expandStartedRef.current = true;
            Animated.sequence([
                Animated.delay(120),
                Animated.timing(expandProgress, {
                    toValue: 1,
                    duration: 360,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: false,
                }),
            ]).start();
        }
    }, [paneWidth, expandProgress]);

    const handlePaneLayout = (e) => {
        const w = e.nativeEvent.layout.width;
        if (paneWidth === 0 && w > 0) {
            setPaneWidth(w);
        }
    };

    const config = getToastConfig(type, isDark);

    if (!isVisible) return null;

    const animatedPaneWidth =
        paneWidth === 0
            ? undefined
            : expandProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, paneWidth],
              });

    return (
        <Animated.View
            style={[
                styles.wrapper,
                {
                    transform: [{ translateY: slideAnim }],
                    opacity: containerOpacity,
                },
            ]}
            pointerEvents="box-none"
        >
            <View style={styles.row} pointerEvents="box-none">
                {/* Круг с иконкой */}
                <Animated.View
                    style={[
                        styles.circle,
                        {
                            backgroundColor: config.circleBg,
                            borderColor: config.border,
                            borderWidth: isDark ? 1 : 0,
                            transform: [{ scale: circleScale }],
                        },
                    ]}
                >
                    <Icon
                        name={icon || ICON_MAP[type] || ICON_MAP.info}
                        size={normalizeFont(22)}
                        color={config.textColor}
                    />
                </Animated.View>

                {/* Раскрывающаяся панель */}
                <Animated.View
                    style={[
                        styles.paneWrapper,
                        {
                            width: animatedPaneWidth,
                            opacity: paneWidth === 0 ? 0 : 1,
                        },
                    ]}
                >
                    <View
                        onLayout={handlePaneLayout}
                        style={[
                            styles.pane,
                            {
                                backgroundColor: config.bg,
                                borderColor: config.border,
                                borderWidth: isDark ? 1 : 0,
                                borderLeftWidth: 0,
                                width: paneWidth > 0 ? paneWidth : undefined,
                            },
                        ]}
                    >
                        <Text
                            style={[styles.message, { color: config.textColor }]}
                            numberOfLines={1}
                        >
                            {message}
                        </Text>

                        {action && actionText && (
                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    { backgroundColor: 'rgba(255,255,255,0.22)' },
                                ]}
                                onPress={() => {
                                    onActionPress?.();
                                    hideToast();
                                }}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.actionText,
                                        { color: config.textColor },
                                    ]}
                                >
                                    {actionText}
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[
                                styles.closeButton,
                                { backgroundColor: 'rgba(255,255,255,0.18)' },
                            ]}
                            onPress={hideToast}
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Icon
                                name="close"
                                size={normalizeFont(14)}
                                color={config.textColor}
                            />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    circle: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: CIRCLE_SIZE / 2,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
    },
    paneWrapper: {
        overflow: 'hidden',
        marginLeft: -CIRCLE_SIZE / 2,
        height: CIRCLE_SIZE,
        justifyContent: 'center',
    },
    pane: {
        flexDirection: 'row',
        alignItems: 'center',
        height: CIRCLE_SIZE,
        paddingLeft: CIRCLE_SIZE / 2 + normalize(14),
        paddingRight: normalize(8),
        borderTopRightRadius: CIRCLE_SIZE / 2,
        borderBottomRightRadius: CIRCLE_SIZE / 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    message: {
        fontSize: normalizeFont(14),
        fontFamily: FontFamily.medium,
        letterSpacing: 0.2,
        flexShrink: 1,
    },
    actionButton: {
        marginLeft: normalize(10),
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(6),
        borderRadius: normalize(12),
    },
    actionText: {
        fontSize: normalizeFont(13),
        fontFamily: FontFamily.medium,
        fontWeight: '700',
    },
    closeButton: {
        marginLeft: normalize(8),
        width: normalize(26),
        height: normalize(26),
        borderRadius: normalize(13),
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default Toast;
