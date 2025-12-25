import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import { normalize, normalizeFont } from '@shared/lib/normalize';

/**
 * Индикатор прогресса заполнения формы
 * Показывает пользователю, сколько обязательных полей заполнено
 */
export const FormProgressIndicator = ({ 
    totalFields, 
    filledFields,
    style 
}) => {
    const progress = useMemo(() => {
        return totalFields > 0 ? (filledFields / totalFields) * 100 : 0;
    }, [totalFields, filledFields]);

    const animatedWidth = useMemo(() => new Animated.Value(progress), []);

    React.useEffect(() => {
        Animated.timing(animatedWidth, {
            toValue: progress,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [progress]);

    const progressColor = useMemo(() => {
        if (progress < 30) return '#FF3B30';
        if (progress < 70) return '#FF9500';
        if (progress < 100) return '#FFCC00';
        return '#34C759';
    }, [progress]);

    return (
        <View style={[styles.container, style]}>
            <View style={styles.header}>
                <Text style={styles.title}>Заполнение формы</Text>
                <Text style={styles.percentage}>{Math.round(progress)}%</Text>
            </View>
            
            <View style={styles.progressBarContainer}>
                <Animated.View 
                    style={[
                        styles.progressBar,
                        {
                            width: animatedWidth.interpolate({
                                inputRange: [0, 100],
                                outputRange: ['0%', '100%'],
                            }),
                            backgroundColor: progressColor,
                        }
                    ]} 
                />
            </View>
            
            <Text style={styles.info}>
                {filledFields} из {totalFields} обязательных полей заполнено
            </Text>
        </View>
    );
};

/**
 * Компактная версия индикатора прогресса (только полоса)
 */
export const FormProgressBar = ({ totalFields, filledFields, style }) => {
    const progress = useMemo(() => {
        return totalFields > 0 ? (filledFields / totalFields) * 100 : 0;
    }, [totalFields, filledFields]);

    const progressColor = useMemo(() => {
        if (progress < 30) return '#FF3B30';
        if (progress < 70) return '#FF9500';
        if (progress < 100) return '#FFCC00';
        return '#34C759';
    }, [progress]);

    return (
        <View style={[styles.compactContainer, style]}>
            <View style={styles.compactBarContainer}>
                <View 
                    style={[
                        styles.compactBar,
                        {
                            width: `${progress}%`,
                            backgroundColor: progressColor,
                        }
                    ]} 
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F8F8F8',
        borderRadius: 12,
        padding: normalize(16),
        marginBottom: normalize(16),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: normalize(12),
    },
    title: {
        fontSize: normalizeFont(15),
        fontWeight: '600',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    percentage: {
        fontSize: normalizeFont(15),
        fontWeight: '700',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    progressBarContainer: {
        height: normalize(8),
        backgroundColor: '#E5E5EA',
        borderRadius: normalize(4),
        overflow: 'hidden',
        marginBottom: normalize(8),
    },
    progressBar: {
        height: '100%',
        borderRadius: normalize(4),
    },
    info: {
        fontSize: normalizeFont(13),
        color: '#666',
        fontFamily: FontFamily.sFProText,
    },
    compactContainer: {
        paddingVertical: normalize(4),
    },
    compactBarContainer: {
        height: normalize(4),
        backgroundColor: '#E5E5EA',
        borderRadius: normalize(2),
        overflow: 'hidden',
    },
    compactBar: {
        height: '100%',
        borderRadius: normalize(2),
    },
});










