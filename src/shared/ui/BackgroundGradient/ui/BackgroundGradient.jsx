import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const StaticBackgroundGradient = () => (
    <View style={styles.backgroundWrapper}>
        <LinearGradient
            style={styles.baseGradient}
            colors={['#e4f6fc', '#e4f6fc']}
            locations={[0, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        />

        <LinearGradient
            style={styles.horizontalGradient}
            colors={['#e4f6fc', '#c3dffa', '#b5c9fb', '#b7c4fd', '#e2ddff']}
            locations={[0, 0.26, 0.44, 0.68, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
        />

        <LinearGradient
            style={styles.overlayGradient}
            colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.75)', '#fff']}
            locations={[0.43, 0.51, 0.57, 0.69]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
        />
    </View>
);

export const ScrollableBackgroundGradient = ({ contentHeight, showOverlayGradient = true, showShadowGradient = false }) => {
    const gradientHeight = Math.max(contentHeight || SCREEN_HEIGHT, SCREEN_HEIGHT);

    return (
        <View style={[styles.scrollableWrapper, { height: gradientHeight }]}>
            <LinearGradient
                style={styles.baseGradient}
                colors={['#e4f6fc', '#e4f6fc']}
                locations={[0, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            />

            <LinearGradient
                style={styles.horizontalGradient}
                colors={['#e4f6fc', '#c3dffa', '#b5c9fb', '#b7c4fd', '#e2ddff']}
                locations={[0, 0.26, 0.44, 0.68, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
            />

            {showOverlayGradient && (
                <LinearGradient
                    style={styles.overlayGradient}
                    colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.75)', '#fff']}
                    locations={[0.43, 0.51, 0.57, 0.69]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                />
            )}

            {showShadowGradient && (
                <LinearGradient
                    style={styles.shadowGradient}
                    colors={['#e4f6fc','#c3dffa','#b5c9fb','#b7c4fd','#e2ddff']}
                    locations={[0, 0.99]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                />
            )}
        </View>
    );
};


const BackgroundGradient = StaticBackgroundGradient;
export default BackgroundGradient;

const styles = StyleSheet.create({
    backgroundWrapper: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        zIndex: -10,
    },
    scrollableWrapper: {
        position: 'absolute',
        width: '100%',
        top: 0,
        left: 0,
        zIndex: -1,
    },
    baseGradient: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
    },
    horizontalGradient: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 1,
    },
    overlayGradient: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 1,
    },
    shadowGradient: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 1,
    },
});