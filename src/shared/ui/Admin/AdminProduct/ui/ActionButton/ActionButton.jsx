import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, Shadow } from '@app/styles/GlobalStyles';

const BUTTON_CONFIGS = {
    edit: {
        icon: '✎',
        iconColor: '#667eea',
        shadowColor: '#667eea',
        label: 'Редактировать'
    },
    save: {
        icon: '✓',
        iconColor: '#4facfe',
        shadowColor: '#4facfe',
        label: 'Сохранить'
    },
    cancel: {
        icon: '✕',
        iconColor: '#ff9a9e',
        shadowColor: '#ff9a9e',
        label: 'Отмена'
    },
    delete: {
        icon: '🗑',
        iconColor: '#ff6b6b',
        shadowColor: '#ff6b6b',
        label: 'Удалить'
    }
};

export const ActionButton = ({
                                 type,
                                 onPress,
                                 disabled = false,
                                 loading = false,
                                 style
                             }) => {
    const config = BUTTON_CONFIGS[type] || BUTTON_CONFIGS.edit;
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.92,
            useNativeDriver: true,
            tension: 400,
            friction: 10,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 400,
            friction: 10,
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={[
                    styles.button,
                    style
                ]}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled || loading}
                accessibilityLabel={config.label}
                accessibilityRole="button"
                activeOpacity={0.6}
            >
                {loading ? (
                    <ActivityIndicator size="small" color={config.iconColor} />
                ) : (
                    <Text style={[
                        styles.buttonText,
                        { 
                            color: disabled ? '#ccc' : config.iconColor,
                            textShadowColor: disabled ? 'transparent' : `${config.shadowColor}40`,
                        }
                    ]}>
                        {config.icon}
                    </Text>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    button: {
        padding: normalize(10),
        borderRadius: normalize(24),
        width: normalize(48),
        height: normalize(48),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    buttonText: {
        fontSize: normalizeFont(22),
        fontWeight: '700',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
});



