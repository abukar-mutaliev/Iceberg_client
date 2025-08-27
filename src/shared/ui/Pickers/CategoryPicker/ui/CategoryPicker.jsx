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

export const CategoryPicker = ({ 
    selectedCategory, 
    onSelectCategory, 
    selectedCategories, 
    onSelectCategories, 
    error, 
    allowMultiple = false 
}) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedCategoryName, setSelectedCategoryName] = useState('');
    const categories = useSelector(selectCategories) || [];
    const isLoading = useSelector(selectCategoriesLoading) || false;
    const dispatch = useDispatch();

    // Определяем, используем ли мы множественный выбор
    const isMultiple = allowMultiple && selectedCategories !== undefined && onSelectCategories !== undefined;
    const currentSelectedIds = isMultiple ? (selectedCategories || []) : (selectedCategory ? [selectedCategory] : []);

    useEffect(() => {
        if (categories.length === 0 && !isLoading) {
            dispatch(fetchCategories());
        }
    }, []);

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

    useEffect(() => {
        if (!categories || categories.length === 0) return;

        if (isMultiple) {
            // Множественный выбор
            if (currentSelectedIds.length === 0) {
                setSelectedCategoryName('');
            } else if (currentSelectedIds.length === 1) {
                const foundCategory = categories.find(cat => {
                    const catId = normalizeCategoryId(cat.id);
                    const selectedId = normalizeCategoryId(currentSelectedIds[0]);
                    return catId === selectedId || String(catId) === String(selectedId);
                });
                setSelectedCategoryName(foundCategory ? foundCategory.name : `${currentSelectedIds[0]}`);
            } else {
                setSelectedCategoryName(`Выбрано: ${currentSelectedIds.length}`);
            }
        } else {
            // Одиночный выбор
            const normalizedSelectedId = normalizeCategoryId(selectedCategory);

            if (normalizedSelectedId !== null && normalizedSelectedId !== undefined) {
                const foundCategory = categories.find(cat => {
                    const catId = normalizeCategoryId(cat.id);
                    const isMatch = catId === normalizedSelectedId ||
                        String(catId) === String(normalizedSelectedId);
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
        }
    }, [selectedCategory, selectedCategories, categories, normalizeCategoryId, isMultiple, currentSelectedIds]);

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

    const handleSelectCategory = (categoryId) => {
        const normalizedId = normalizeCategoryId(categoryId);

        if (isMultiple) {
            // Множественный выбор
            const currentIds = currentSelectedIds.map(id => normalizeCategoryId(id));
            let newSelectedIds;
            
            if (currentIds.includes(normalizedId)) {
                // Убираем из выбранных
                newSelectedIds = currentIds.filter(id => id !== normalizedId);
            } else {
                // Добавляем к выбранным
                newSelectedIds = [...currentIds, normalizedId];
            }
            
            onSelectCategories(newSelectedIds);
            // Не закрываем dropdown при множественном выборе
        } else {
            // Одиночный выбор
            const categoryObj = categories.find(c => normalizeCategoryId(c.id) === normalizedId);

            if (categoryObj) {
                setSelectedCategoryName(categoryObj.name);
            } else {
                console.warn('Категория не найдена в списке:', normalizedId);
            }

            onSelectCategory(normalizedId);
            setShowDropdown(false);
        }
    };

    // Вычисляем оптимальную высоту для dropdown
    const getDropdownHeight = () => {
        if (isLoading || !categories || categories.length === 0) {
            return 60; // минимальная высота для сообщений
        }
        
        const itemHeight = 44;
        const doneButtonHeight = isMultiple ? 50 : 0;
        const padding = 10;
        const maxVisibleItems = 6; // максимум видимых элементов без прокрутки
        
        const visibleItems = Math.min(categories.length, maxVisibleItems);
        const scrollViewHeight = visibleItems * itemHeight;
        
        return scrollViewHeight + doneButtonHeight + padding;
    };

    const renderCategories = () => {
        if (isLoading) {
            return <ActivityIndicator size="small" color="#3B43A2" style={styles.loadingIndicator} />;
        }

        if (!categories || categories.length === 0) {
            return <Text style={styles.noDataText}>Нет доступных категорий</Text>;
        }

        const normalizedSelectedIds = currentSelectedIds.map(id => normalizeCategoryId(id));

        return categories.map(item => {
            const normalizedItemId = normalizeCategoryId(item.id);
            const isSelected = normalizedSelectedIds.includes(normalizedItemId);

            return (
                <TouchableOpacity
                    key={String(item.id)}
                    style={[
                        styles.dropdownItem,
                        isSelected && styles.selectedDropdownItem
                    ]}
                    onPress={() => handleSelectCategory(item.id)}
                >
                    <View style={styles.dropdownItemContent}>
                        {isMultiple && (
                            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                {isSelected && <Text style={styles.checkmark}>✓</Text>}
                            </View>
                        )}
                        <Text style={[
                            styles.dropdownItemText,
                            isSelected && styles.selectedItem,
                            isMultiple && styles.dropdownItemTextMultiple
                        ]}>
                            {item.name}
                        </Text>
                    </View>
                </TouchableOpacity>
            );
        });
    };

    return (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>
                {isMultiple ? 'Выберите категории *' : 'Выберите категорию *'}
            </Text>
            <TouchableOpacity
                style={[styles.pickerContainer, error ? styles.inputError : null]}
                onPress={() => setShowDropdown(!showDropdown)}
            >
                <Text style={[
                    styles.pickerText,
                    !selectedCategoryName && styles.placeholderText
                ]}>
                    {selectedCategoryName || (isMultiple ? 'Выберите категории' : 'Выберите категорию')}
                </Text>
                <Feather name={showDropdown ? "chevron-up" : "chevron-down"} size={13} color="#888" />
            </TouchableOpacity>
            <View style={[styles.inputUnderline, error ? styles.underlineError : null]} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {showDropdown && (
                <View style={[
                    styles.dropdownContainer,
                    { height: getDropdownHeight() }
                ]}>
                    <ScrollView
                        style={styles.dropdownList}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={categories.length > 6}
                    >
                        {renderCategories()}
                    </ScrollView>
                    {isMultiple && (
                        <TouchableOpacity
                            style={styles.doneButton}
                            onPress={() => setShowDropdown(false)}
                        >
                            <Text style={styles.doneButtonText}>Готово</Text>
                        </TouchableOpacity>
                    )}
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
        // убираем фиксированную maxHeight - теперь она динамическая
    },
    dropdownList: {
        flex: 1, // занимает доступное пространство в контейнере
    },
    dropdownItem: {
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#EBEBF0',
        minHeight: 44, // фиксированная минимальная высота для точного расчета
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
    dropdownItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dropdownItemTextMultiple: {
        marginLeft: 8,
    },
    checkbox: {
        width: 16,
        height: 16,
        borderWidth: 1,
        borderColor: '#CCCCCC',
        borderRadius: 3,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
    },
    checkboxSelected: {
        backgroundColor: '#3B43A2',
        borderColor: '#3B43A2',
    },
    checkmark: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    doneButton: {
        backgroundColor: '#3B43A2',
        padding: 10,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#EBEBF0',
    },
    doneButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
        fontFamily: FontFamily.sFProText,
    },
});