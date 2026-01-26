import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
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


        try {
            // Используем replace вместо navigate, чтобы удалить WelcomeScreen из стека навигации
            // Это предотвратит возможность вернуться назад на экран приветствия
            navigation.replace('Main');
        } catch (error) {
            console.error('❌ Navigation error in WelcomeScreen:', error);
        }
    };

    const borderRadius = adaptiveSize(220);
    const topMargin = adaptiveSize(isSmallDevice ? 170 : 220);
    const imageHeight = height * 0.7;
    const buttonWidth = Math.min(width * 0.8, adaptiveSize(314));
    const subtitleWidth = width * 0.8;
    
    // Позиция кнопки - используем адаптивные значения близкие к оригиналу
    const buttonHeight = adaptiveSize(70);
    const buttonTop = adaptiveSize(isSmallDevice ? 350 : 395);
    
    // Позиция текста - используем процент от полной высоты экрана
    // Вычитаем topMargin чтобы получить позицию относительно контейнера
    const textTopPercent = isSmallDevice ? 0.40 : 0.60; // Процент от полной высоты
    const textTopFromScreen = height * textTopPercent;
    const textTop = textTopFromScreen - topMargin - adaptiveSize(100); // Смещаем вверх
    
    // Проверяем, что текст не заходит под кнопку (минимальный отступ 25px)
    const minSpacing = adaptiveSize(25);
    const textBlockHeight = adaptiveSize(120); // Примерная высота текстового блока
    const maxTextTop = buttonTop - textBlockHeight - minSpacing;
    
    // Используем минимальное значение для гарантии отступа
    const finalTextTop = Math.min(textTop, maxTextTop);

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
                top: finalTextTop,
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
                    height: buttonHeight,
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