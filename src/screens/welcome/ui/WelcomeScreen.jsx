import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Platform, Dimensions } from 'react-native';
import Text from '@shared/ui/Text/Text';
import LinesIceCream from './assets/LinesIceCream.png';
import { SafeFonts, getSafePlatformFont } from '@shared/lib/fontUtils';

const { width, height } = Dimensions.get('window');

const isSmallDevice = height < 700;
const isLargeDevice = height > 800;

const adaptiveSize = (baseSize) => {
    if (isSmallDevice) return baseSize * 0.8;
    if (isLargeDevice) return baseSize * 1.1;
    return baseSize;
};

export const WelcomeScreen = ({ navigation }) => {
    const handleStart = () => {
        navigation.navigate('Main');
    };

    const borderRadius = adaptiveSize(220);
    const topMargin = adaptiveSize(isSmallDevice ? 170 : 220);
    const buttonTop = adaptiveSize(isSmallDevice ? 350 : 385);
    const imageHeight = height * 0.7;
    const buttonWidth = Math.min(width * 0.8, adaptiveSize(314));
    const subtitleWidth = width * 0.8;

    return (
        <View style={[styles.container, {
            marginTop: topMargin,
            borderTopRightRadius: borderRadius,
            borderTopLeftRadius: borderRadius,
        }]}>
            <Image
                source={LinesIceCream}
                style={[styles.icon, { height: imageHeight }]}
                resizeMode="cover"
            />

            <View style={[styles.textContainer, {
                top: isSmallDevice ? '45%' : '50%',
                marginTop: adaptiveSize(-100),
            }]}>
                <Text style={[styles.title, {
                    fontSize: adaptiveSize(26),
                    lineHeight: adaptiveSize(41),
                    marginBottom: adaptiveSize(30),
                }]}>
                    Мороженое для всех
                </Text>

                <Text style={[styles.subtitle, {
                    fontSize: adaptiveSize(16),
                    lineHeight: adaptiveSize(25),
                    width: subtitleWidth,
                }]}>
                    Свежесть, качество и радость в каждом заказе.
                </Text>
            </View>

            <TouchableOpacity
                style={[styles.button, {
                    top: buttonTop,
                    width: buttonWidth,
                    height: adaptiveSize(70),
                    borderRadius: adaptiveSize(35),
                }]}
                onPress={handleStart}
            >
                <Text style={[styles.buttonText, {
                    fontSize: adaptiveSize(17),
                    lineHeight: adaptiveSize(17),
                }]}>
                    начать
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#738aff',
        elevation: 10,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        width: '71%',
        marginTop: 130,
    },
    textContainer: {
        position: 'absolute',
        width: "100%",
        alignSelf: 'center',
        alignItems: 'center',
    },
    title: {
        fontFamily: SafeFonts.BezierSans,
        color: '#fff',
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: SafeFonts.BezierSans,
        fontWeight: '500',
        color: '#fff',
        textAlign: 'center',
    },
    button: {
        position: 'absolute',
        alignSelf: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#fff',
        elevation: 6,
        shadowColor: 'rgba(51, 57, 176, 0.05)',
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6,
        shadowOpacity: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        fontFamily: getSafePlatformFont('SFProText'),
        fontWeight: '500',
        textTransform: 'uppercase',
        color: '#3339B0',
        textAlign: 'center',
    },
});