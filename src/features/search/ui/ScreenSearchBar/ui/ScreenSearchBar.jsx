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
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { AndroidShadow } from '@shared/ui/Shadow';

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
                styles.searchBarFullWidth
            ]}>
                {Platform.OS === 'android' ? (
                    <AndroidShadow
                        style={{ width: '100%', height: 44 }}
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
                        <View style={[styles.inputContainer, styles.androidInputContainer]}>
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
                    <TouchableOpacity 
                        style={styles.iosSearchBar}
                        activeOpacity={1}
                        onPress={handlePressInput}
                    >
                        <View style={styles.inputContainer} pointerEvents="box-none">
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
                    </TouchableOpacity>
                )}
            </View>

            {/* Отмена скрыта по запросу */}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flex: 1,
        width: '100%',
        minWidth: 0,
        height: 44,
    },
    searchBarWrapper: {
        height: 44,
        marginRight: 10,
    },
    searchBarDefault: {
        flex: 1,
        minWidth: 0,
    },
    searchBarFullWidth: {
        flex: 1,
        marginRight: 0,
        minWidth: 0,
    },
    iosSearchBar: {
        width: '100%',
        height: 44,
        borderRadius: 10,
        backgroundColor: Color.colorLightMode,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        shadowColor: "rgba(81, 90, 134, 0.2)",
        shadowOffset: {
            width: 0,
            height: 1
        },
        shadowRadius: 4,
        shadowOpacity: 1,
        justifyContent: 'center',
    },
    androidInputContainer: {
        height: 44,
        backgroundColor: Color.colorLightMode,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
    },
    iosInputContainer: {
        height: 44,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        minHeight: 44,
    },
    input: {
        fontFamily: FontFamily.sFPro,
        fontSize: normalizeFont(FontSize.size_sm),
        lineHeight: normalize(20),
        letterSpacing: 0,
        color: Color.dark,
        height: '100%',
        minHeight: 44,
        paddingHorizontal: normalize(24),
        paddingVertical: 0,
        flex: 1,
        textAlignVertical: 'center',
        ...Platform.select({
            android: {
                includeFontPadding: false,
            },
            ios: {
                paddingTop: 0,
                paddingBottom: 0,
                height: 44,
            },
        }),
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
    // cancelButton/cancelText removed
});