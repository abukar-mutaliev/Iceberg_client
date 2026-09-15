import React, { useMemo } from 'react';
import { View, Image, StyleSheet } from 'react-native';

const ASSISTANT_AVATAR_IMAGE = require('@assets/images/assistant-avatar.jpg');

const SIZE_PRESETS = {
    list: 50,
    compact: 40,
    small: 32,
    card: 44,
};

/**
 * Аватар ИИ-помощника.
 */
export const AssistantAvatar = ({ size = 'list', style }) => {
    const dimension = typeof size === 'number' ? size : (SIZE_PRESETS[size] ?? SIZE_PRESETS.list);
    const styles = useMemo(
        () => createStyles(dimension),
        [dimension]
    );

    return (
        <View style={[styles.container, style]} accessibilityLabel="Помощник Iceberg">
            <Image
                source={ASSISTANT_AVATAR_IMAGE}
                style={styles.image}
                resizeMode="cover"
            />
        </View>
    );
};

const createStyles = (dimension) => StyleSheet.create({
    container: {
        width: dimension,
        height: dimension,
        borderRadius: dimension / 2,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
});

export default AssistantAvatar;
