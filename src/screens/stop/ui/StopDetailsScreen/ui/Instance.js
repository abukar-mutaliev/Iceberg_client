import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Text, StyleSheet, View, Dimensions } from "react-native";
import Animated, {
    cancelAnimation,
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { Color, FontFamily } from "@app/styles/GlobalStyles";

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 375;
const ROTATION_INTERVAL_MS = 3000;
const LINE_HEIGHT = IS_SMALL_SCREEN ? 16 : 18;
const TEXT_BLOCK_HEIGHT = LINE_HEIGHT * 2;

const DEFAULT_SLIDES = [
    {
        id: 'title',
        line1: 'Остановки',
        line2: 'в твоем городе',
        variant: 'title',
    },
];

const Instance = ({ slides = DEFAULT_SLIDES }) => {
    const safeSlides = slides?.length ? slides : DEFAULT_SLIDES;
    const [slideIndex, setSlideIndex] = useState(0);
    const slideIndexRef = useRef(0);
    const slidesRef = useRef(safeSlides);
    const opacity = useSharedValue(1);
    const translateY = useSharedValue(0);

    const currentSlide = safeSlides[slideIndex] || safeSlides[0];
    const isPlaceSlide = currentSlide.variant === 'place';
    const isInfoSlide = currentSlide.variant === 'info';
    const slidesSignature = useMemo(
        () => safeSlides.map((slide) => slide.id).join('|'),
        [safeSlides]
    );

    useEffect(() => {
        slidesRef.current = safeSlides;
    }, [safeSlides]);

    useEffect(() => {
        slideIndexRef.current = 0;
        setSlideIndex(0);
        opacity.value = 1;
        translateY.value = 0;
    }, [slidesSignature, opacity, translateY]);

    useEffect(() => {
        if (safeSlides.length < 2) {
            return undefined;
        }

        const intervalId = setInterval(() => {
            opacity.value = withTiming(0, {
                duration: 260,
                easing: Easing.in(Easing.cubic),
            });
            translateY.value = withTiming(-12, {
                duration: 260,
                easing: Easing.in(Easing.cubic),
            }, (finished) => {
                if (!finished) {
                    return;
                }

                const nextIndex = (slideIndexRef.current + 1) % slidesRef.current.length;
                slideIndexRef.current = nextIndex;
                runOnJS(setSlideIndex)(nextIndex);
                translateY.value = 16;
                opacity.value = withTiming(1, {
                    duration: 380,
                    easing: Easing.out(Easing.cubic),
                });
                translateY.value = withSpring(0, {
                    damping: 16,
                    stiffness: 170,
                    mass: 0.7,
                });
            });
        }, ROTATION_INTERVAL_MS);

        return () => {
            clearInterval(intervalId);
            cancelAnimation(opacity);
            cancelAnimation(translateY);
        };
    }, [safeSlides.length, opacity, translateY]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <View style={styles.view}>
            <View style={styles.tickerViewport}>
                <Animated.View style={[styles.tickerContent, animatedStyle]}>
                    {isPlaceSlide ? (
                        <Text
                            style={[styles.placeText, IS_SMALL_SCREEN && styles.placeTextSmall]}
                            numberOfLines={2}
                            adjustsFontSizeToFit
                            minimumFontScale={0.62}
                            maxFontSizeMultiplier={1.15}
                            ellipsizeMode="tail"
                        >
                            {currentSlide.line1}
                        </Text>
                    ) : (
                        <>
                            <Text
                                style={[
                                    isInfoSlide ? styles.infoText : styles.titleText,
                                    IS_SMALL_SCREEN && (isInfoSlide ? styles.infoTextSmall : styles.titleTextSmall),
                                ]}
                                numberOfLines={currentSlide.line2 ? 1 : 2}
                                adjustsFontSizeToFit
                                minimumFontScale={0.7}
                                maxFontSizeMultiplier={1.15}
                                ellipsizeMode="tail"
                            >
                                {currentSlide.line1}
                            </Text>
                            {currentSlide.line2 ? (
                                <Text
                                    style={[
                                        isInfoSlide ? styles.subtitleText : styles.titleText,
                                        IS_SMALL_SCREEN && (
                                            isInfoSlide ? styles.subtitleTextSmall : styles.titleTextSmall
                                        ),
                                    ]}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                >
                                    {currentSlide.line2}
                                </Text>
                            ) : null}
                        </>
                    )}
                </Animated.View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    titleText: {
        fontSize: 12,
        lineHeight: LINE_HEIGHT,
        fontWeight: "600",
        fontFamily: FontFamily.sFProText,
        color: Color.colorLightMode,
        textAlign: "left",
        flexShrink: 1,
        includeFontPadding: false,
    },
    titleTextSmall: {
        fontSize: 12,
        lineHeight: LINE_HEIGHT,
    },
    subtitleText: {
        fontSize: 11,
        lineHeight: LINE_HEIGHT,
        fontWeight: "500",
        fontFamily: FontFamily.sFProText,
        color: Color.colorLightMode,
        textAlign: "left",
        opacity: 0.92,
        includeFontPadding: false,
    },
    subtitleTextSmall: {
        fontSize: 10,
        lineHeight: LINE_HEIGHT,
    },
    infoText: {
        fontSize: 12,
        lineHeight: LINE_HEIGHT,
        fontWeight: "600",
        fontFamily: FontFamily.sFProText,
        color: Color.colorLightMode,
        textAlign: "left",
        flexShrink: 1,
        includeFontPadding: false,
    },
    infoTextSmall: {
        fontSize: 11,
        lineHeight: LINE_HEIGHT,
    },
    placeText: {
        fontSize: 12,
        lineHeight: 16,
        fontWeight: "600",
        fontFamily: FontFamily.sFProText,
        color: Color.colorLightMode,
        textAlign: "left",
        includeFontPadding: false,
        width: '100%',
        height: TEXT_BLOCK_HEIGHT,
        textAlignVertical: 'center',
    },
    placeTextSmall: {
        fontSize: 11,
        lineHeight: 15,
    },
    view: {
        flex: 1,
        flexShrink: 1,
        minWidth: 0,
        justifyContent: 'center',
    },
    tickerViewport: {
        height: TEXT_BLOCK_HEIGHT,
        overflow: 'hidden',
        justifyContent: 'center',
    },
    tickerContent: {
        minHeight: TEXT_BLOCK_HEIGHT,
        justifyContent: 'center',
    },
});

export default Instance;
