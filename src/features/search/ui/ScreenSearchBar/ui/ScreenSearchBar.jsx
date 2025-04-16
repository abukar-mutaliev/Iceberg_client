import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {
    View,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Text,
    Dimensions,
    PixelRatio,
    Keyboard,
    Platform,
    Pressable
} from 'react-native';
import { X } from 'lucide-react-native';
import { Color, FontFamily, FontSize, Border } from '@/app/styles/GlobalStyles';
import { AndroidShadow } from '@/shared/ui/Shadow';

// Настройка масштабирования для адаптивности
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 440;

const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const normalizeFont = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const ScreenSearchBar = forwardRef(({
                                               value,
                                               onChangeText,
                                               onClear,
                                               onFocus,
                                               onBlur,
                                               onCancel,
                                               onSubmitEditing,
                                               placeholder = 'Запрос',
                                               showFullWidth = false,
                                               historyMode = false
                                           }, ref) => {
    const inputRef = useRef(null);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const componentMountedRef = useRef(true);

    // Экспортируем методы для родительского компонента
    useImperativeHandle(ref, () => ({
        focus: () => {
            if (!inputRef.current || !componentMountedRef.current) return;

            try {
                inputRef.current.focus();
                setIsInputFocused(true);
            } catch (e) {
                console.warn('Ошибка при установке фокуса', e);
            }
        },
        blur: () => {
            if (inputRef.current) {
                inputRef.current.blur();
                setIsInputFocused(false);
            }
        },
        isFocused: () => isInputFocused
    }));

    // Очистка при размонтировании
    useEffect(() => {
        componentMountedRef.current = true;

        return () => {
            componentMountedRef.current = false;
        };
    }, []);

    const handleBlur = () => {
        setIsInputFocused(false);
        if (onBlur) {
            onBlur();
        }
    };

    const handleFocus = () => {
        setIsInputFocused(true);
        if (onFocus) {
            onFocus();
        }
    };

    const handleClear = () => {
        onClear?.();

        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const handlePressInput = () => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    return (
        <View style={styles.container}>
            <View style={[
                styles.searchBarWrapper,
                { width: showFullWidth ? "100%" : "75%" }
            ]}>
                {Platform.OS === 'android' ? (
                    <AndroidShadow
                        style={{ width: '100%', height: 36 }}
                        shadowColor="rgba(81, 90, 134, 0.2)"
                        shadowConfig={{
                            offsetX: 0,
                            offsetY: 1,
                            elevation: 4,
                            radius: 4,
                            opacity: 1
                        }}
                        borderRadius={10}
                    >
                        <View style={styles.inputContainer}>
                            <TextInput
                                ref={inputRef}
                                style={styles.input}
                                placeholder={placeholder}
                                value={value}
                                onChangeText={onChangeText}
                                placeholderTextColor={Color.dark}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                                returnKeyType="search"
                                blurOnSubmit={false}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardShouldPersistTaps="handled"
                                showSoftInputOnFocus={true}
                                spellCheck={false}
                                disableFullscreenUI={true}
                                onSubmitEditing={onSubmitEditing}
                            />
                            {value ? (
                                <TouchableOpacity
                                    onPress={handleClear}
                                    style={styles.clearButton}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.clearButtonContainer}>
                                        <X size={normalize(14)} color="#FFFFFF" />
                                    </View>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    </AndroidShadow>
                ) : (
                    <Pressable
                        style={styles.iosSearchBar}
                        onPress={handlePressInput}
                    >
                        <View style={styles.inputContainer}>
                            <TextInput
                                ref={inputRef}
                                style={styles.input}
                                placeholder={placeholder}
                                value={value}
                                onChangeText={onChangeText}
                                placeholderTextColor={Color.dark}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                                returnKeyType="search"
                                blurOnSubmit={false}
                                autoCapitalize="none"
                                autoCorrect={false}
                                onSubmitEditing={onSubmitEditing}
                            />
                            {value ? (
                                <TouchableOpacity
                                    onPress={handleClear}
                                    style={styles.clearButton}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.clearButtonContainer}>
                                        <X size={normalize(14)} color="#FFFFFF" />
                                    </View>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    </Pressable>
                )}
            </View>

            {!showFullWidth && !historyMode && (
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onCancel}
                    activeOpacity={0.7}
                >
                    <Text style={styles.cancelText}>Отмена</Text>
                </TouchableOpacity>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '95%',
        height: 36,
    },
    searchBarWrapper: {
        height: 36,
        marginRight: 10,
    },
    iosSearchBar: {
        height: '100%',
        borderRadius: 10,
        backgroundColor: Color.colorLightMode,
        shadowColor: "rgba(81, 90, 134, 0.2)",
        shadowOffset: {
            width: 0,
            height: 1
        },
        shadowRadius: 4,
        shadowOpacity: 1,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        height: '100%',
    },
    input: {
        fontFamily: FontFamily.sFPro,
        fontSize: normalizeFont(FontSize.size_sm),
        lineHeight: normalize(22),
        letterSpacing: 0,
        color: Color.dark,
        height: '100%',
        paddingHorizontal: normalize(24),
        flex: 1,
    },
    clearButton: {
        marginRight: normalize(8),
        padding: normalize(5),
    },
    clearButtonContainer: {
        width: normalize(20),
        height: normalize(20),
        borderRadius: normalize(12),
        backgroundColor: '#4248CD',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        paddingVertical: 7,
        paddingHorizontal: 15,
    },
    cancelText: {
        fontFamily: FontFamily.sFPro,
        lineHeight: normalize(22),
        letterSpacing: 0,
        fontSize: normalizeFont(FontSize.size_sm),
        color: Color.blue2,
        textAlign: "center",
    },
});