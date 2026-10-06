import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const BRAND = '#3339B0';

const SIZE_PRESETS = {
    list: 50,
    compact: 40,
    header: 32,
    group: 120,
};

/**
 * Аватар официальной поддержки: фирменный круг и гарнитура.
 * Отличается от искры помощника и от серой иконки обычной группы.
 */
export const SupportAvatar = ({ size = 'list', style }) => {
    const dimension = typeof size === 'number' ? size : (SIZE_PRESETS[size] ?? SIZE_PRESETS.list);
    const styles = useMemo(() => createStyles(dimension), [dimension]);

    return (
        <View style={[styles.container, style]} accessibilityLabel="Поддержка Iceberg">
            <View style={styles.ring} />
            <Icon name="support-agent" size={Math.round(dimension * 0.56)} color="#FFFFFF" />
        </View>
    );
};

const createStyles = (dimension) => StyleSheet.create({
    container: {
        width: dimension,
        height: dimension,
        borderRadius: dimension / 2,
        backgroundColor: BRAND,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    ring: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: dimension / 2,
        borderWidth: Math.max(2, Math.round(dimension * 0.06)),
        borderColor: 'rgba(255,255,255,0.35)',
    },
});

export default SupportAvatar;
