import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, TextInput, Animated } from 'react-native';
import { FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { logData } from '@shared/lib/logger';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const MultiDistrictPicker = ({
    districts,
    selectedDistricts = [],
    setSelectedDistricts,
    showDistrictPicker,
    setShowDistrictPicker,
    error,
    disabled = false
}) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const [searchText, setSearchText] = useState('');
    const [filteredDistricts, setFilteredDistricts] = useState(districts);
    const [modalVisible, setModalVisible] = useState(false);
    const [tempSelectedDistricts, setTempSelectedDistricts] = useState([]);
    const slideAnimation = useRef(new Animated.Value(0)).current;

    // Handle modal visibility with animation
    useEffect(() => {
        if (showDistrictPicker) {
            setModalVisible(true);
            setTempSelectedDistricts([...selectedDistricts]);
            Animated.timing(slideAnimation, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true
            }).start();
        } else {
            Animated.timing(slideAnimation, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true
            }).start(() => {
                setModalVisible(false);
            });
        }
    }, [showDistrictPicker]);

    // Calculate animation values
    const translateY = slideAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [300, 0]
    });

    // Обновление списка районов при изменении поиска или списка районов
    useEffect(() => {
        if (!searchText) {
            setFilteredDistricts(districts);
            return;
        }

        const filtered = districts.filter(district =>
            district.name.toLowerCase().includes(searchText.toLowerCase()) ||
            (district.description && district.description.toLowerCase().includes(searchText.toLowerCase()))
        );
        setFilteredDistricts(filtered);
    }, [searchText, districts]);

    // Найти названия выбранных районов
    const selectedDistrictsText = React.useMemo(() => {
        if (selectedDistricts.length === 0) {
            return 'Выберите районы обслуживания';
        }

        const selectedNames = districts
            .filter(d => selectedDistricts.includes(d.id))
            .map(d => d.name);

        if (selectedNames.length === 1) {
            return selectedNames[0];
        } else if (selectedNames.length <= 3) {
            return selectedNames.join(', ');
        } else {
            return `${selectedNames[0]} и еще ${selectedNames.length - 1}`;
        }
    }, [selectedDistricts, districts]);

    // Обработчик выбора/снятия выбора района
    const handleToggleDistrict = (districtId) => {
        setTempSelectedDistricts(prev => {
            if (prev.includes(districtId)) {
                return prev.filter(id => id !== districtId);
            } else {
                return [...prev, districtId];
            }
        });
    };

    // Обработчик "Выбрать все"
    const handleSelectAll = () => {
        if (tempSelectedDistricts.length === districts.length) {
            setTempSelectedDistricts([]);
        } else {
            setTempSelectedDistricts(districts.map(d => d.id));
        }
    };

    // Обработчик подтверждения выбора
    const handleConfirm = () => {
        setSelectedDistricts(tempSelectedDistricts);
        setShowDistrictPicker(false);
        setSearchText('');
        logData('Выбраны районы для сотрудника', { districts: tempSelectedDistricts });
    };

    // Обработчик отмены
    const handleCancel = () => {
        setTempSelectedDistricts([...selectedDistricts]);
        setShowDistrictPicker(false);
        setSearchText('');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Районы обслуживания *</Text>
            <TouchableOpacity
                style={[
                    styles.pickerButton,
                    error ? styles.pickerButtonError : null,
                    disabled ? styles.pickerButtonDisabled : null
                ]}
                onPress={() => !disabled && setShowDistrictPicker(true)}
                disabled={disabled}
            >
                <Text style={[
                    styles.pickerButtonText,
                    error ? styles.pickerButtonTextError : null,
                    selectedDistricts.length > 0 ? styles.selectedText : null,
                    disabled ? styles.pickerButtonTextDisabled : null
                ]}>
                    {selectedDistrictsText}
                </Text>
            </TouchableOpacity>
            <View style={[styles.inputUnderline, error ? styles.underlineError : null]} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="none"
                onRequestClose={handleCancel}
            >
                <Animated.View
                    style={[
                        styles.modalBackdrop,
                        {
                            opacity: slideAnimation
                        }
                    ]}
                >
                    <TouchableOpacity
                        style={styles.backdropTouchable}
                        activeOpacity={1}
                        onPress={handleCancel}
                    />

                    <Animated.View
                        style={[
                            styles.modalContent,
                            {
                                transform: [{ translateY: translateY }]
                            }
                        ]}
                    >
                        <View style={styles.header}>
                            <Text style={styles.modalTitle}>Выберите районы</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={handleCancel}
                            >
                                <Text style={styles.closeButtonText}>Отмена</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchContainer}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Поиск района..."
                                value={searchText}
                                onChangeText={setSearchText}
                                placeholderTextColor={colors.textTertiary}
                                keyboardAppearance={colors.keyboardAppearance}
                            />
                        </View>

                        {/* Кнопки управления выбором */}
                        <View style={styles.controlsContainer}>
                            <TouchableOpacity
                                style={styles.selectAllButton}
                                onPress={handleSelectAll}
                            >
                                <Text style={styles.selectAllButtonText}>
                                    {tempSelectedDistricts.length === districts.length 
                                        ? 'Снять выбор со всех' 
                                        : 'Выбрать все'
                                    }
                                </Text>
                            </TouchableOpacity>
                            
                            <Text style={styles.selectedCount}>
                                Выбрано: {tempSelectedDistricts.length}
                            </Text>
                        </View>

                        <FlatList
                            data={filteredDistricts}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => {
                                const isSelected = tempSelectedDistricts.includes(item.id);
                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.districtItem,
                                            isSelected && styles.selectedItem
                                        ]}
                                        onPress={() => handleToggleDistrict(item.id)}
                                    >
                                        <View style={styles.districtInfo}>
                                            <Text style={[
                                                styles.districtName,
                                                isSelected && styles.selectedItemText
                                            ]}>
                                                {item.name}
                                            </Text>
                                            {item.description && (
                                                <Text style={[
                                                    styles.districtDescription,
                                                    isSelected && styles.selectedItemText
                                                ]}>
                                                    {item.description}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={[
                                            styles.checkbox,
                                            isSelected && styles.checkboxSelected
                                        ]}>
                                            {isSelected && <Text style={styles.checkmark}>✓</Text>}
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={() => (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>
                                        {searchText ? 'Районы не найдены' : 'Список районов пуст'}
                                    </Text>
                                </View>
                            )}
                        />

                        {/* Кнопки действий */}
                        <View style={styles.actionsContainer}>
                            <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={handleConfirm}
                            >
                                <Text style={styles.confirmButtonText}>
                                    Подтвердить ({tempSelectedDistricts.length})
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </Animated.View>
            </Modal>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        marginBottom: normalize(20),
        width: '100%',
    },
    label: {
        fontSize: normalizeFont(15),
        fontWeight: '600',
        color: colors.textPrimary,
        opacity: isDark ? 0.85 : 0.4,
        marginBottom: 0,
        fontFamily: FontFamily.sFProText,
    },
    pickerButton: {
        height: normalize(30),
        justifyContent: 'center',
        paddingHorizontal: 0,
        backgroundColor: 'transparent',
    },
    pickerButtonDisabled: {
        opacity: 0.5,
    },
    pickerButtonText: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProText,
        color: colors.textSecondary,
    },
    pickerButtonTextDisabled: {
        color: colors.textSecondary,
        opacity: 0.5,
    },
    selectedText: {
        color: colors.textPrimary,
        fontWeight: '500',
    },
    pickerButtonError: {
        // Стили для ошибки
    },
    pickerButtonTextError: {
        color: colors.error,
    },
    inputUnderline: {
        height: 1,
        backgroundColor: colors.inputBorder,
        marginTop: normalize(5),
    },
    underlineError: {
        backgroundColor: colors.error,
    },
    errorText: {
        fontSize: normalizeFont(FontSize.size_xs),
        color: colors.error,
        marginTop: normalize(5),
        fontFamily: FontFamily.sFProText,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: colors.modalOverlay,
        justifyContent: 'flex-end',
    },
    backdropTouchable: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: colors.cardBackground,
        borderTopLeftRadius: Border.radius.large,
        borderTopRightRadius: Border.radius.large,
        maxHeight: '85%',
        paddingBottom: normalize(20),
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: normalize(20),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: normalizeFont(FontSize.size_lg),
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProDisplay,
    },
    closeButton: {
        padding: normalize(5),
    },
    closeButtonText: {
        fontSize: normalizeFont(FontSize.size_md),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
    searchContainer: {
        paddingHorizontal: normalize(20),
        paddingBottom: normalize(10),
    },
    searchInput: {
        backgroundColor: colors.inputBackground,
        borderRadius: Border.radius.small,
        paddingHorizontal: normalize(15),
        paddingVertical: normalize(12),
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProText,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.inputBorder,
    },
    controlsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: normalize(20),
        paddingBottom: normalize(10),
    },
    selectAllButton: {
        paddingVertical: normalize(8),
        paddingHorizontal: normalize(12),
        backgroundColor: colors.surfaceSecondary,
        borderRadius: Border.radius.small,
        borderWidth: 1,
        borderColor: colors.border,
    },
    selectAllButtonText: {
        fontSize: normalizeFont(FontSize.size_sm),
        color: colors.primary,
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
    selectedCount: {
        fontSize: normalizeFont(FontSize.size_sm),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    districtItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: normalize(15),
        paddingHorizontal: normalize(20),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    selectedItem: {
        backgroundColor: colors.primary,
    },
    districtInfo: {
        flex: 1,
    },
    districtName: {
        fontSize: normalizeFont(FontSize.size_md),
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProDisplay,
        marginBottom: normalize(2),
    },
    districtDescription: {
        fontSize: normalizeFont(FontSize.size_sm),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    selectedItemText: {
        color: colors.textInverse,
    },
    checkbox: {
        width: normalize(24),
        height: normalize(24),
        borderRadius: normalize(4),
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: normalize(10),
        backgroundColor: colors.cardBackground,
    },
    checkboxSelected: {
        backgroundColor: colors.textInverse,
        borderColor: colors.textInverse,
    },
    checkmark: {
        color: colors.primary,
        fontSize: normalizeFont(16),
        fontWeight: 'bold',
    },
    emptyContainer: {
        padding: normalize(40),
        alignItems: 'center',
    },
    emptyText: {
        fontSize: normalizeFont(FontSize.size_md),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
    },
    actionsContainer: {
        paddingHorizontal: normalize(20),
        paddingTop: normalize(10),
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    confirmButton: {
        backgroundColor: colors.primary,
        paddingVertical: normalize(12),
        borderRadius: Border.radius.medium,
        alignItems: 'center',
    },
    confirmButtonText: {
        fontSize: normalizeFont(FontSize.size_md),
        color: colors.textInverse,
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
    },
});

export default MultiDistrictPicker; 