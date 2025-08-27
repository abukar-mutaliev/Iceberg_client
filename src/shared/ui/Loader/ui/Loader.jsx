import React, { useRef, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Animated } from 'react-native';
import { Color } from '@app/styles/GlobalStyles';

// Компонент анимированного лоадера в стиле YouTube
const YouTubeLoader = ({ color = Color.purpleSoft, text = 'Загружаем данные...' }) => {
    const dotAnimations = useRef([
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0)
    ]).current;

    useEffect(() => {
        const createAnimation = (index) => {
            return Animated.sequence([
                Animated.timing(dotAnimations[index], {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(dotAnimations[index], {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                })
            ]);
        };

        const startAnimation = () => {
            const animations = dotAnimations.map((_, index) => 
                Animated.loop(
                    Animated.sequence([
                        Animated.delay(index * 200),
                        createAnimation(index)
                    ])
                )
            );

            Animated.parallel(animations).start();
        };

        startAnimation();

        return () => {
            dotAnimations.forEach(anim => anim.stopAnimation());
        };
    }, []);

    return (
        <View style={styles.youtubeLoaderContainer}>
            <View style={styles.youtubeLoader}>
                {dotAnimations.map((animation, index) => (
                    <Animated.View
                        key={index}
                        style={[
                            styles.youtubeDot,
                            { backgroundColor: color },
                            {
                                opacity: animation,
                                transform: [{
                                    scale: animation.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.5, 1.2]
                                    })
                                }]
                            }
                        ]}
                    />
                ))}
            </View>
            {text && (
                <Text style={[styles.youtubeLoadingText, { color }]}>
                    {text}
                </Text>
            )}
        </View>
    );
};

export const Loader = ({ 
    size = 'large', 
    color = Color.blue2, 
    style, 
    type = 'default',
    text,
    loadingDetails
}) => {
    if (type === 'youtube') {
        return (
            <View style={[styles.container, style]}>
                <YouTubeLoader color={color} text={text} />
                {loadingDetails && (
                    <View style={styles.loadingDetails}>
                        {loadingDetails}
                    </View>
                )}
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            <ActivityIndicator size={size} color={color} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    youtubeLoaderContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    youtubeLoader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    youtubeDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginHorizontal: 4,
    },
    youtubeLoadingText: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    loadingDetails: {
        alignItems: 'center',
        gap: 8,
        marginTop: 20,
    },
});