import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, PixelRatio } from 'react-native';
import BackArrowIcon from '@shared/ui/Icon/BackArrowIcon/BackArrowIcon';

// Получаем размеры экрана
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 440;

// Функции нормализации
const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const normalizeFont = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const ProfileHeader = ({ title, onGoBack }) => {
    return (
        <View style={styles.header}>
            {onGoBack ? (
                <TouchableOpacity
                    style={styles.backButton}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    onPress={onGoBack}
                >
                    <BackArrowIcon />
                </TouchableOpacity>
            ) : (
                <View style={styles.placeholder} />
            )}
            <Text style={styles.title}>{title}</Text>
            <View style={styles.placeholder} />
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        height: normalize(76),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: normalize(16),
        backgroundColor: '#FFFFFF',
        borderBottomColor: '#F5F5F5',
    },
    backButton: {
        padding: normalize(8),
    },
    placeholder: {
        width: normalize(32),
    },
    title: {
        fontSize: normalizeFont(18),
        fontWeight: '500',
        color: '#000000',
        textAlign: 'center',
        flex: 1,
    },
});

export default ProfileHeader;