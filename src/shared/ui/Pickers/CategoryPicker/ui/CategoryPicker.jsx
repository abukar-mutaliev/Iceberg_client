// Обновленный код для CategoryPicker.js

import React, {useCallback, useEffect, useState} from "react";
import {useSelector, useDispatch} from "react-redux";
import {selectCategories, selectCategoriesLoading, fetchCategories} from "@entities/category";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Keyboard
} from "react-native";
import {Feather} from '@expo/vector-icons';
import {Color, FontFamily} from "@app/styles/GlobalStyles";

export const CategoryPicker = ({ selectedCategory, onSelectCategory, error }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedCategoryName, setSelectedCategoryName] = useState('');
    const categories = useSelector(selectCategories) || [];
    const isLoading = useSelector(selectCategoriesLoading) || false;
    const dispatch = useDispatch();

    // Загружаем категории при инициализации
    useEffect(() => {
        if (categories.length === 0 && !isLoading) {
            dispatch(fetchCategories());
        }
    }, []);

    // Приведение ID категории к стандартному формату (число если возможно, иначе строка)
    const normalizeCategoryId = useCallback((id) => {
        if (id === null || id === undefined) return null;

        if (typeof id === 'number') return id;

        if (typeof id === 'string') {
            const parsed = parseInt(id, 10);
            return !isNaN(parsed) ? parsed : id;
        }

        if (typeof id === 'object' && id !== null && 'id' in id) {
            return normalizeCategoryId(id.id);
        }

        return id;
    }, []);

    // Обновление отображаемого имени категории при изменении selectedCategory или categories
    useEffect(() => {
        if (!categories || categories.length === 0) return;

        const normalizedSelectedId = normalizeCategoryId(selectedCategory);
        console.log('Нормализованный ID категории:', normalizedSelectedId, 'Тип:', typeof normalizedSelectedId);

        if (normalizedSelectedId !== null && normalizedSelectedId !== undefined) {
            // Ищем категорию в списке по ID
            const foundCategory = categories.find(cat => {
                const catId = normalizeCategoryId(cat.id);
                const isMatch = catId === normalizedSelectedId ||
                    String(catId) === String(normalizedSelectedId);

                if (isMatch) {
                    console.log('Найдена категория:', cat.name, 'с ID:', catId);
                }
                return isMatch;
            });

            if (foundCategory) {
                setSelectedCategoryName(foundCategory.name);
            } else {
                console.log('Категория с ID', normalizedSelectedId, 'не найдена в списке');
                setSelectedCategoryName(`${normalizedSelectedId}`);
            }
        } else {
            setSelectedCategoryName('');
        }
    }, [selectedCategory, categories, normalizeCategoryId]);

    // Закрываем дропдаун при показе клавиатуры
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                setShowDropdown(false);
            }
        );

        return () => {
            keyboardDidShowListener.remove();
        };
    }, []);

    // Обработчик выбора категории
    const handleSelectCategory = (categoryId) => {
        // Нормализуем ID перед использованием
        const normalizedId = normalizeCategoryId(categoryId);
        console.log('Выбрана категория с ID:', normalizedId, 'Тип:', typeof normalizedId);

        // Находим категорию в списке
        const categoryObj = categories.find(c => normalizeCategoryId(c.id) === normalizedId);

        if (categoryObj) {
            console.log('Выбрана категория:', categoryObj.name, 'с ID:', normalizedId);
            setSelectedCategoryName(categoryObj.name);
        } else {
            console.warn('Категория не найдена в списке:', normalizedId);
        }

        // ВАЖНО: Передаем нормализованное значение ID родительскому компоненту
        onSelectCategory(normalizedId);

        // Закрываем дропдаун
        setShowDropdown(false);
    };

    // Рендер списка категорий
    const renderCategories = () => {
        if (isLoading) {
            return <ActivityIndicator size="small" color="#3B43A2" style={styles.loadingIndicator} />;
        }

        if (!categories || categories.length === 0) {
            return <Text style={styles.noDataText}>Нет доступных категорий</Text>;
        }

        const normalizedSelectedId = normalizeCategoryId(selectedCategory);

        return categories.map(item => {
            const normalizedItemId = normalizeCategoryId(item.id);
            const isSelected = normalizedItemId === normalizedSelectedId;

            return (
                <TouchableOpacity
                    key={String(item.id)}
                    style={[
                        styles.dropdownItem,
                        isSelected && styles.selectedDropdownItem
                    ]}
                    onPress={() => handleSelectCategory(item.id)}
                >
                    <Text style={[
                        styles.dropdownItemText,
                        isSelected && styles.selectedItem
                    ]}>
                        {item.name}
                    </Text>
                </TouchableOpacity>
            );
        });
    };

    return (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>Выберите категорию *</Text>
            <TouchableOpacity
                style={[styles.pickerContainer, error ? styles.inputError : null]}
                onPress={() => setShowDropdown(!showDropdown)}
            >
                <Text style={[
                    styles.pickerText,
                    !selectedCategoryName && styles.placeholderText
                ]}>
                    {selectedCategoryName || 'Выберите категорию'}
                </Text>
                <Feather name={showDropdown ? "chevron-up" : "chevron-down"} size={13} color="#888" />
            </TouchableOpacity>
            <View style={[styles.inputUnderline, error ? styles.underlineError : null]} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {showDropdown && (
                <View style={styles.dropdownContainer}>
                    <ScrollView
                        style={styles.dropdownList}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled={true}
                    >
                        {renderCategories()}
                    </ScrollView>
                </View>
            )}
        </View>
    );
};


const styles = StyleSheet.create({
    inputGroup: {
        marginBottom: 10,
        position: 'relative',
        zIndex: 1, // Добавлено для обеспечения правильного отображения дропдауна
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Color.dark,
        opacity: 0.4,
        marginBottom: 0,
        fontFamily: FontFamily.sFProText,
    },
    inputError: {
        color: '#FF3B30',
    },
    inputUnderline: {
        height: 1,
        backgroundColor: '#000',
        marginTop: 0,
    },
    underlineError: {
        backgroundColor: '#FF3B30',
        height: 1.5,
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 12,
        marginTop: 5,
        fontFamily: FontFamily.sFProText,
    },
    pickerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 30,
        paddingVertical: 5,
    },
    pickerText: {
        fontSize: 13,
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    placeholderText: {
        color: '#888',
    },
    dropdownContainer: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#EBEBF0',
        borderRadius: 4,
        zIndex: 100,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 2,
        maxHeight: 150,
    },
    dropdownList: {
        maxHeight: 150,
    },
    dropdownItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#EBEBF0',
    },
    selectedDropdownItem: {
        backgroundColor: 'rgba(59, 67, 162, 0.1)',
    },
    dropdownItemText: {
        fontSize: 14,
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    selectedItem: {
        fontWeight: 'bold',
        color: '#3B43A2',
    },
    noDataText: {
        padding: 10,
        textAlign: 'center',
        color: '#888',
        fontFamily: FontFamily.sFProText,
    },
    loadingIndicator: {
        padding: 10,
    },
});