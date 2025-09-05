import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    FlatList,
    StyleSheet,
    TextInput,
    Switch,
    ScrollView
} from 'react-native';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { useWarehouses } from '@entities/warehouse/hooks/useWarehouses';
import { normalize, normalizeFont } from '@shared/lib/normalize';

// Компонент для указания количества коробок на склад
const WarehouseQuantityInput = ({ warehouse, quantity, onQuantityChange, onRemove }) => {
    const [inputValue, setInputValue] = useState(quantity.toString());

    useEffect(() => {
        setInputValue(quantity.toString());
    }, [quantity]);

    const handleQuantityChange = (text) => {
        setInputValue(text);
        const numValue = parseInt(text);
        if (!isNaN(numValue) && numValue >= 0) {
            onQuantityChange(warehouse.id, numValue);
        }
    };

    return (
        <View style={styles.quantityItem}>
            <View style={styles.quantityInfo}>
                <Text style={styles.quantityWarehouseName}>{warehouse.name}</Text>
                {warehouse.address && (
                    <Text style={styles.quantityWarehouseAddress}>{warehouse.address}</Text>
                )}
            </View>
            <View style={styles.quantityControls}>
                <TextInput
                    style={styles.quantityInput}
                    value={inputValue}
                    onChangeText={handleQuantityChange}
                    keyboardType="numeric"
                    placeholder="0"
                    maxLength={4}
                />
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
    selectedWarehouseQuantities = [], // [{warehouseId, quantity}, ...]
    onSelectWarehouseQuantities,
    error,
    isWarning = false,
    disabled = false
}) => {
    const { warehouses, loading: loadingWarehouses } = useWarehouses({ autoLoad: true });
    const [modalVisible, setModalVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [filteredWarehouses, setFilteredWarehouses] = useState(warehouses);
    const [tempSelectedWarehouses, setTempSelectedWarehouses] = useState([]);
    const [warehouseQuantities, setWarehouseQuantities] = useState({}); // {warehouseId: quantity}
    const [selectAll, setSelectAll] = useState(false);

    // Инициализация при открытии модального окна
    useEffect(() => {
        if (modalVisible) {
            const selectedIds = selectedWarehouseQuantities.map(item => item.warehouseId);
            setTempSelectedWarehouses(selectedIds);

            // Инициализируем количества
            const quantitiesMap = {};
            selectedWarehouseQuantities.forEach(item => {
                quantitiesMap[item.warehouseId] = item.quantity;
            });
            setWarehouseQuantities(quantitiesMap);
        }
    }, [modalVisible, selectedWarehouseQuantities]);

    // Обновление списка складов при изменении поиска
    useEffect(() => {
        if (!warehouses || loadingWarehouses) {
            setFilteredWarehouses([]);
            return;
        }

        if (!searchText) {
            setFilteredWarehouses(warehouses);
            return;
        }

        const filtered = warehouses.filter(warehouse =>
            warehouse.name.toLowerCase().includes(searchText.toLowerCase()) ||
            (warehouse.address && warehouse.address.toLowerCase().includes(searchText.toLowerCase())) ||
            (warehouse.district && warehouse.district.name && warehouse.district.name.toLowerCase().includes(searchText.toLowerCase()))
        );
        setFilteredWarehouses(filtered);
    }, [searchText, warehouses, loadingWarehouses]);

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

    // Обработчик выбора склада
    const handleWarehouseToggle = (warehouseId) => {
        setTempSelectedWarehouses(prev => {
            if (prev.includes(warehouseId)) {
                // Удаляем склад и его количество
                const newSelected = prev.filter(id => id !== warehouseId);
                setWarehouseQuantities(current => {
                    const updated = {...current};
                    delete updated[warehouseId];
                    return updated;
                });
                return newSelected;
            } else {
                // Добавляем склад с количеством 1 по умолчанию
                setWarehouseQuantities(current => ({
                    ...current,
                    [warehouseId]: 1
                }));
                return [...prev, warehouseId];
            }
        });
    };

    // Обработчик изменения количества
    const handleQuantityChange = (warehouseId, quantity) => {
        setWarehouseQuantities(prev => ({
            ...prev,
            [warehouseId]: quantity
        }));
    };

    // Обработчик удаления склада
    const handleRemoveWarehouse = (warehouseId) => {
        setTempSelectedWarehouses(prev => prev.filter(id => id !== warehouseId));
        setWarehouseQuantities(current => {
            const updated = {...current};
            delete updated[warehouseId];
            return updated;
        });
    };

    // Обработчик "Выбрать все"
    const handleSelectAll = () => {
        if (selectAll) {
            setTempSelectedWarehouses([]);
            setWarehouseQuantities({});
            setSelectAll(false);
        } else {
            const allIds = warehouses.map(w => w.id);
            setTempSelectedWarehouses(allIds);
            const allQuantities = {};
            warehouses.forEach(w => {
                allQuantities[w.id] = 1; // По умолчанию 1 коробка
            });
            setWarehouseQuantities(allQuantities);
            setSelectAll(true);
        }
    };

    // Обработчик применения выбора
    const handleApply = () => {
        const result = tempSelectedWarehouses
            .filter(id => warehouseQuantities[id] > 0) // Только склады с количеством > 0
            .map(warehouseId => ({
                warehouseId,
                quantity: warehouseQuantities[warehouseId] || 1
            }));

        onSelectWarehouseQuantities(result);
        setModalVisible(false);
        setSearchText('');
    };

    // Обработчик отмены
    const handleCancel = () => {
        setModalVisible(false);
        setSearchText('');
    };

    // Получаем выбранные склады с их данными для отображения количеств
    const selectedWarehousesData = tempSelectedWarehouses
        .map(id => warehouses.find(w => w.id === id))
        .filter(Boolean);

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Склады и количества коробок *</Text>
            <TouchableOpacity
                style={[
                    styles.pickerButton,
                    error && !isWarning ? styles.pickerButtonError : null,
                    disabled || loadingWarehouses ? styles.pickerButtonDisabled : null
                ]}
                onPress={() => !disabled && !loadingWarehouses && setModalVisible(true)}
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

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={handleCancel}
            >
                <View style={styles.modalBackdrop}>
                    <TouchableOpacity
                        style={styles.backdropTouchable}
                        activeOpacity={1}
                        onPress={handleCancel}
                    />

                    <View style={styles.modalContent}>
                        <View style={styles.header}>
                            <Text style={styles.modalTitle}>Выберите склады и укажите количества</Text>
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
                                placeholder="Поиск склада..."
                                value={searchText}
                                onChangeText={setSearchText}
                                placeholderTextColor="#999"
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.selectAllContainer}
                            onPress={handleSelectAll}
                        >
                            <Text style={styles.selectAllText}>
                                {selectAll ? 'Снять выделение' : 'Выбрать все'}
                            </Text>
                            <Switch
                                value={selectAll || (tempSelectedWarehouses.length === warehouses.length && warehouses.length > 0)}
                                onValueChange={handleSelectAll}
                            />
                        </TouchableOpacity>

                        <FlatList
                            data={filteredWarehouses}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => {
                                const isSelected = tempSelectedWarehouses.includes(item.id);
                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.warehouseItem,
                                            isSelected && styles.selectedItem
                                        ]}
                                        onPress={() => handleWarehouseToggle(item.id)}
                                    >
                                        <View style={styles.warehouseInfo}>
                                            <Text style={[
                                                styles.warehouseName,
                                                isSelected && styles.selectedItemText
                                            ]}>
                                                {item.name}
                                            </Text>
                                            {item.address && (
                                                <Text style={[
                                                    styles.warehouseAddress,
                                                    isSelected && styles.selectedItemText
                                                ]}>
                                                    {item.address}
                                                </Text>
                                            )}
                                            {item.district && (
                                                <Text style={[
                                                    styles.warehouseDistrict,
                                                    isSelected && styles.selectedItemText
                                                ]}>
                                                    Район: {item.district.name}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={styles.checkboxContainer}>
                                            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                                {isSelected && <Text style={styles.checkmark}>✓</Text>}
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={() => (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>
                                        {loadingWarehouses ? 'Загрузка складов...' : searchText ? 'Склады не найдены' : 'Список складов пуст'}
                                    </Text>
                                </View>
                            )}
                        />

                        {/* Секция для указания количеств выбранных складов */}
                        {selectedWarehousesData.length > 0 && (
                            <View style={styles.quantitiesSection}>
                                <Text style={styles.quantitiesTitle}>Укажите количество коробок:</Text>
                                <ScrollView style={styles.quantitiesList} showsVerticalScrollIndicator={false}>
                                    {selectedWarehousesData.map(warehouse => (
                                        <WarehouseQuantityInput
                                            key={warehouse.id}
                                            warehouse={warehouse}
                                            quantity={warehouseQuantities[warehouse.id] || 1}
                                            onQuantityChange={handleQuantityChange}
                                            onRemove={handleRemoveWarehouse}
                                        />
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={[styles.footerButton, styles.applyButton]}
                                onPress={handleApply}
                            >
                                <Text style={styles.applyButtonText}>Применить</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        maxHeight: '90%',
        paddingBottom: normalize(20),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: normalize(20),
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
        paddingBottom: normalize(10),
        paddingTop: normalize(10),
    },
    searchInput: {
        backgroundColor: Color.backgroundLight || '#F5F5F5',
        borderRadius: 8,
        paddingHorizontal: normalize(15),
        paddingVertical: normalize(12),
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
        paddingVertical: normalize(10),
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
        paddingVertical: normalize(15),
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
    warehouseAddress: {
        fontSize: normalizeFont(14),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(2),
    },
    warehouseDistrict: {
        fontSize: normalizeFont(14),
        color: Color.blue2 || '#007AFF',
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
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
    quantitiesSection: {
        borderTopWidth: 1,
        borderTopColor: Color.border || '#E0E0E0',
        maxHeight: 200,
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
        paddingVertical: normalize(10),
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
        alignItems: 'center',
        gap: normalize(10),
    },
    quantityInput: {
        width: 60,
        height: 35,
        borderWidth: 1,
        borderColor: Color.border || '#E0E0E0',
        borderRadius: 4,
        paddingHorizontal: normalize(8),
        textAlign: 'center',
        fontSize: normalizeFont(14),
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
