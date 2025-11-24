import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { useWarehouses } from '@entities/warehouse/hooks/useWarehouses';
import { normalize, normalizeFont } from '@shared/lib/normalize';

// Компонент для указания количества коробок и цены на склад
const WarehouseQuantityInput = ({ warehouse, quantity, warehousePrice, stopPrice, onQuantityChange, onPriceChange, onStopPriceChange, onRemove, basePrice, isAdmin = false }) => {
    const [inputValue, setInputValue] = useState(quantity.toString());
    const [priceValue, setPriceValue] = useState(warehousePrice ? warehousePrice.toString() : '');
    const [stopPriceValue, setStopPriceValue] = useState(stopPrice ? stopPrice.toString() : '');

    useEffect(() => {
        setInputValue(quantity.toString());
    }, [quantity]);

    useEffect(() => {
        setPriceValue(warehousePrice ? warehousePrice.toString() : '');
    }, [warehousePrice]);

    useEffect(() => {
        setStopPriceValue(stopPrice ? stopPrice.toString() : '');
    }, [stopPrice]);

    const handleQuantityChange = (text) => {
        setInputValue(text);
        const numValue = parseInt(text);
        if (!isNaN(numValue) && numValue >= 0) {
            onQuantityChange(warehouse.id, numValue);
        }
    };

    const handlePriceChange = (text) => {
        setPriceValue(text);
        const numValue = parseFloat(text.replace(',', '.'));
        if (text === '' || text === null) {
            onPriceChange(warehouse.id, null);
        } else if (!isNaN(numValue) && numValue > 0) {
            onPriceChange(warehouse.id, numValue);
        }
    };

    const handleStopPriceChange = (text) => {
        setStopPriceValue(text);
        const numValue = parseFloat(text.replace(',', '.'));
        if (text === '' || text === null) {
            onStopPriceChange(warehouse.id, null);
        } else if (!isNaN(numValue) && numValue > 0) {
            onStopPriceChange(warehouse.id, numValue);
        }
    };

    return (
        <View style={styles.quantityItem}>
            <View style={styles.quantityInfo}>
                <Text style={styles.quantityWarehouseName}>{warehouse.name}</Text>
            </View>
            <View style={styles.quantityControls}>
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Кол-во коробок</Text>
                    <TextInput
                        style={styles.quantityInput}
                        value={inputValue}
                        onChangeText={handleQuantityChange}
                        keyboardType="numeric"
                        placeholder="0"
                        maxLength={4}
                    />
                </View>
                {isAdmin && (
                    <View style={styles.pricesRow}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Цена склада (₽)</Text>
                            <TextInput
                                style={styles.priceInput}
                                value={priceValue}
                                onChangeText={handlePriceChange}
                                keyboardType="decimal-pad"
                                placeholder={basePrice ? basePrice.toString() : "Авто"}
                                maxLength={10}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Цена фургона (₽)</Text>
                            <TextInput
                                style={styles.priceInput}
                                value={stopPriceValue}
                                onChangeText={handleStopPriceChange}
                                keyboardType="decimal-pad"
                                placeholder={basePrice ? basePrice.toString() : "Авто"}
                                maxLength={10}
                            />
                        </View>
                    </View>
                )}
                <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => onRemove(warehouse.id)}
                >
                    <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export const WarehouseQuantityPicker = ({
    selectedWarehouseQuantities = [], // [{warehouseId, quantity, warehousePrice?, stopPrice?}, ...]
    onSelectWarehouseQuantities,
    error,
    isWarning = false,
    disabled = false,
    basePrice = null, // Базовая цена за коробку для подсказки
    isAdmin = false // Флаг, разрешено ли устанавливать цены
}) => {
    const navigation = useNavigation();
    const { warehouses, loading: loadingWarehouses } = useWarehouses({ autoLoad: true });

    // Обработчик открытия экрана выбора складов
    const handleOpenSelection = () => {
        navigation.navigate('WarehouseSelection', {
            selectedWarehouseQuantities,
            basePrice,
            isAdmin,
            onSelectWarehouseQuantities: (result) => {
                onSelectWarehouseQuantities(result);
            }
        });
    };

    // Определяем текст для кнопки
    const getButtonText = () => {
        if (loadingWarehouses) {
            return 'Загрузка складов...';
        }
        if (!selectedWarehouseQuantities || selectedWarehouseQuantities.length === 0) {
            return 'Выберите склады и укажите количества';
        }
        if (selectedWarehouseQuantities.length === 1) {
            const warehouse = warehouses.find(w => w.id === selectedWarehouseQuantities[0].warehouseId);
            return warehouse ? `${warehouse.name}: ${selectedWarehouseQuantities[0].quantity} коробок` : 'Выбран 1 склад';
        }
        const totalBoxes = selectedWarehouseQuantities.reduce((sum, item) => sum + item.quantity, 0);
        return `${selectedWarehouseQuantities.length} складов, ${totalBoxes} коробок`;
    };


    return (
        <View style={styles.container}>
            <Text style={styles.label}>Склады и количества коробок *</Text>
            <TouchableOpacity
                style={[
                    styles.pickerButton,
                    error && !isWarning ? styles.pickerButtonError : null,
                    disabled || loadingWarehouses ? styles.pickerButtonDisabled : null
                ]}
                onPress={() => !disabled && !loadingWarehouses && handleOpenSelection()}
                disabled={disabled || loadingWarehouses}
            >
                <Text style={[
                    styles.pickerButtonText,
                    error && !isWarning ? styles.pickerButtonTextError : null,
                    selectedWarehouseQuantities && selectedWarehouseQuantities.length > 0 ? styles.selectedText : null,
                    disabled || loadingWarehouses ? styles.pickerButtonTextDisabled : null
                ]}>
                    {getButtonText()}
                </Text>
            </TouchableOpacity>
            <View style={[styles.inputUnderline, error && !isWarning ? styles.underlineError : null]} />
            {error ? (
                <Text style={isWarning ? styles.warningText : styles.errorText}>{error}</Text>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: normalize(20),
        width: '100%',
    },
    label: {
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: Color.dark,
        opacity: 0.4,
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
        fontSize: normalizeFont(13),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
    },
    pickerButtonTextDisabled: {
        color: Color.textSecondary,
        opacity: 0.5,
    },
    selectedText: {
        color: Color.textPrimary,
        fontWeight: '500',
    },
    pickerButtonError: {
        // Стили для ошибки
    },
    pickerButtonTextError: {
        color: '#FF3B30',
    },
    inputUnderline: {
        height: 1,
        backgroundColor: '#000',
        marginTop: normalize(5),
    },
    underlineError: {
        backgroundColor: '#FF3B30',
        height: 1.5,
    },
    errorText: {
        fontSize: normalizeFont(12),
        color: '#FF3B30',
        marginTop: normalize(5),
        fontFamily: FontFamily.sFProText,
    },
    warningText: {
        fontSize: normalizeFont(12),
        color: '#FF9500',
        marginTop: normalize(5),
        fontFamily: FontFamily.sFProText,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    backdropTouchable: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: Color.colorLightMode,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '95%',
        paddingBottom: normalize(20),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: normalize(12),
        borderBottomWidth: 1,
        borderBottomColor: Color.border || '#E0E0E0',
    },
    modalTitle: {
        fontSize: normalizeFont(18),
        fontWeight: '600',
        color: Color.textPrimary,
        fontFamily: FontFamily.sFProDisplay,
        flex: 1,
    },
    closeButton: {
        padding: normalize(5),
    },
    closeButtonText: {
        fontSize: normalizeFont(16),
        color: Color.blue2 || '#007AFF',
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
    searchContainer: {
        paddingHorizontal: normalize(20),
        paddingBottom: normalize(5),
        paddingTop: normalize(5),
    },
    searchInput: {
        backgroundColor: Color.backgroundLight || '#F5F5F5',
        borderRadius: 8,
        paddingHorizontal: normalize(15),
        paddingVertical: normalize(5),
        fontSize: normalizeFont(16),
        fontFamily: FontFamily.sFProText,
        color: Color.textPrimary,
        borderWidth: 1,
        borderColor: Color.border || '#E0E0E0',
    },
    selectAllContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: normalize(20),
        borderBottomWidth: 1,
        borderBottomColor: Color.border || '#E0E0E0',
    },
    selectAllText: {
        fontSize: normalizeFont(16),
        color: Color.textPrimary,
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
    warehouseItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: normalize(5),
        paddingHorizontal: normalize(20),
        borderBottomWidth: 1,
        borderBottomColor: Color.border || '#E0E0E0',
    },
    selectedItem: {
        backgroundColor: 'rgba(59, 67, 162, 0.1)',
    },
    warehouseInfo: {
        flex: 1,
    },
    warehouseName: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: Color.textPrimary,
        fontFamily: FontFamily.sFProDisplay,
        marginBottom: normalize(4),
    },
    selectedItemText: {
        color: '#3B43A2',
    },
    checkboxContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: normalize(10),
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#C0C0C0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#3B43A2',
        borderColor: '#3B43A2',
    },
    checkmark: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyContainer: {
        padding: normalize(40),
        alignItems: 'center',
    },
    emptyText: {
        fontSize: normalizeFont(16),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
    },
    commonPricesSection: {
        borderTopWidth: 1,
        borderTopColor: Color.border || '#E0E0E0',
        padding: normalize(20),
        backgroundColor: Color.backgroundLight || '#F8F8F8',
    },
    commonPricesTitle: {
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: Color.textPrimary,
        fontFamily: FontFamily.sFProDisplay,
        marginBottom: normalize(12),
    },
    commonPricesRow: {
        flexDirection: 'row',
        gap: normalize(8),
        alignItems: 'flex-end',
    },
    commonPriceInputContainer: {
        flex: 1,
    },
    commonPriceLabel: {
        fontSize: normalizeFont(10),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(4),
    },
    commonPriceInput: {
        width: '100%',
        borderWidth: 1,
        borderColor: Color.border || '#E0E0E0',
        borderRadius: 4,
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(8),
        textAlign: 'center',
        fontSize: normalizeFont(12),
        fontFamily: FontFamily.sFProText,
        backgroundColor: Color.colorLightMode,
    },
    applyCommonPriceButton: {
        backgroundColor: '#3B43A2',
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(10),
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 80,
    },
    applyCommonPriceButtonText: {
        color: '#FFFFFF',
        fontSize: normalizeFont(12),
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
    },
    quantitiesSection: {
        borderTopWidth: 1,
        borderTopColor: Color.border || '#E0E0E0',
        maxHeight: 400,
    },
    quantitiesTitle: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: Color.textPrimary,
        fontFamily: FontFamily.sFProDisplay,
        padding: normalize(20),
        paddingBottom: normalize(10),
    },
    quantitiesList: {
        paddingHorizontal: normalize(20),
        paddingBottom: normalize(10),
    },
    quantityItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: normalize(5),
        paddingHorizontal: normalize(15),
        backgroundColor: Color.backgroundLight || '#F8F8F8',
        borderRadius: 8,
        marginBottom: normalize(8),
    },
    quantityInfo: {
        flex: 1,
    },
    quantityWarehouseName: {
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: Color.textPrimary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(2),
    },
    quantityWarehouseAddress: {
        fontSize: normalizeFont(12),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: normalize(8),
        flexWrap: 'wrap',
    },
    pricesRow: {
        flexDirection: 'row',
        gap: normalize(8),
    },
    inputGroup: {
        alignItems: 'center',
    },
    inputLabel: {
        fontSize: normalizeFont(10),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(4),
    },
    quantityInput: {
        width: 65,
        borderWidth: 1,
        borderColor: Color.border || '#E0E0E0',
        borderRadius: 4,
        paddingHorizontal: normalize(4),
        textAlign: 'center',
        fontSize: normalizeFont(11),
        fontFamily: FontFamily.sFProText,
        backgroundColor: Color.colorLightMode,
    },
    priceInput: {
        width: 65,
        borderWidth: 1,
        borderColor: Color.border || '#E0E0E0',
        borderRadius: 4,
        paddingHorizontal: normalize(4),
        textAlign: 'center',
        fontSize: normalizeFont(11),
        fontFamily: FontFamily.sFProText,
        backgroundColor: Color.colorLightMode,
    },
    removeButton: {
        width: 25,
        height: 25,
        borderRadius: 12.5,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingHorizontal: normalize(20),
        paddingTop: normalize(15),
        borderTopWidth: 1,
        borderTopColor: Color.border || '#E0E0E0',
    },
    footerButton: {
        flex: 1,
        paddingVertical: normalize(12),
        borderRadius: 8,
        alignItems: 'center',
    },
    applyButton: {
        backgroundColor: '#3B43A2',
    },
    applyButtonText: {
        color: '#FFFFFF',
        fontSize: normalizeFont(16),
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
    },
});

export default WarehouseQuantityPicker;
