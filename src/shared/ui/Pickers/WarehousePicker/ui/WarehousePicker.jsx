import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    FlatList,
    StyleSheet,
    TextInput,
    Animated
} from 'react-native';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { logData } from '@shared/lib/logger';
import { normalize, normalizeFont } from '@shared/lib/normalize';

export const WarehousePicker = ({
    warehouses,
    selectedWarehouse,
    setSelectedWarehouse,
    showWarehousePicker,
    setShowWarehousePicker,
    error,
    disabled = false
}) => {
    const [searchText, setSearchText] = useState('');
    const [filteredWarehouses, setFilteredWarehouses] = useState(warehouses);
    const [modalVisible, setModalVisible] = useState(false);
    const slideAnimation = useRef(new Animated.Value(0)).current;

    // Handle modal visibility with animation
    useEffect(() => {
        if (showWarehousePicker) {
            setModalVisible(true);
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
    }, [showWarehousePicker]);

    // Calculate animation values
    const translateY = slideAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [300, 0]
    });

    // Обновление списка складов при изменении поиска или списка складов
    useEffect(() => {
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
    }, [searchText, warehouses]);

    // Найти название выбранного склада
    const selectedWarehouseName = React.useMemo(() => {
        if (!selectedWarehouse) return 'Выберите склад работы';
        const warehouse = warehouses.find(w => w.id === selectedWarehouse);
        return warehouse ? warehouse.name : 'Выберите склад работы';
    }, [selectedWarehouse, warehouses]);

    // Обработчик выбора склада
    const handleSelect = (warehouseId) => {
        setSelectedWarehouse(warehouseId);
        setShowWarehousePicker(false);
        setSearchText('');
        logData('Выбран склад', { warehouseId });
    };

    // Обработчик очистки выбора
    const handleClear = () => {
        setSelectedWarehouse(null);
        setShowWarehousePicker(false);
        setSearchText('');
        logData('Склад не выбран');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Склад работы *</Text>
            <TouchableOpacity
                style={[
                    styles.pickerButton,
                    error ? styles.pickerButtonError : null,
                    disabled ? styles.pickerButtonDisabled : null
                ]}
                onPress={() => !disabled && setShowWarehousePicker(true)}
                disabled={disabled}
            >
                <Text style={[
                    styles.pickerButtonText,
                    error ? styles.pickerButtonTextError : null,
                    selectedWarehouse ? styles.selectedText : null,
                    disabled ? styles.pickerButtonTextDisabled : null
                ]}>
                    {selectedWarehouseName}
                </Text>
            </TouchableOpacity>
            <View style={[styles.inputUnderline, error ? styles.underlineError : null]} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="none"
                onRequestClose={() => setShowWarehousePicker(false)}
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
                        onPress={() => setShowWarehousePicker(false)}
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
                            <Text style={styles.modalTitle}>Выберите склад</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setShowWarehousePicker(false)}
                            >
                                <Text style={styles.closeButtonText}>Закрыть</Text>
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

                        {/* Кнопка очистки выбора */}
                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={handleClear}
                        >
                            <Text style={styles.clearButtonText}>Не назначать склад</Text>
                        </TouchableOpacity>

                        <FlatList
                            data={filteredWarehouses}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.warehouseItem,
                                        selectedWarehouse === item.id && styles.selectedItem
                                    ]}
                                    onPress={() => handleSelect(item.id)}
                                >
                                    <View style={styles.warehouseInfo}>
                                        <Text style={[
                                            styles.warehouseName,
                                            selectedWarehouse === item.id && styles.selectedItemText
                                        ]}>
                                            {item.name}
                                        </Text>
                                        {item.address && (
                                            <Text style={[
                                                styles.warehouseAddress,
                                                selectedWarehouse === item.id && styles.selectedItemText
                                            ]}>
                                                {item.address}
                                            </Text>
                                        )}
                                        {item.district && (
                                            <Text style={[
                                                styles.warehouseDistrict,
                                                selectedWarehouse === item.id && styles.selectedItemText
                                            ]}>
                                                Район: {item.district.name}
                                            </Text>
                                        )}
                                        {item._count && item._count.employees !== undefined && (
                                            <Text style={[
                                                styles.warehouseEmployees,
                                                selectedWarehouse === item.id && styles.selectedItemText
                                            ]}>
                                                Сотрудников: {item._count.employees}
                                            </Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={() => (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>
                                        {searchText ? 'Склады не найдены' : 'Список складов пуст'}
                                    </Text>
                                </View>
                            )}
                        />
                    </Animated.View>
                </Animated.View>
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
        fontSize: normalizeFont(15),
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
        fontSize: normalizeFont(FontSize.size_md),
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
        color: 'red',
    },
    inputUnderline: {
        height: 1,
        backgroundColor: Color.border,
        marginTop: normalize(5),
    },
    underlineError: {
        backgroundColor: 'red',
    },
    errorText: {
        fontSize: normalizeFont(FontSize.size_xs),
        color: 'red',
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
        borderTopLeftRadius: Border.radius.large,
        borderTopRightRadius: Border.radius.large,
        maxHeight: '80%',
        paddingBottom: normalize(20),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: normalize(20),
        borderBottomWidth: 1,
        borderBottomColor: Color.border,
    },
    modalTitle: {
        fontSize: normalizeFont(FontSize.size_lg),
        fontWeight: '600',
        color: Color.textPrimary,
        fontFamily: FontFamily.sFProDisplay,
    },
    closeButton: {
        padding: normalize(5),
    },
    closeButtonText: {
        fontSize: normalizeFont(FontSize.size_md),
        color: Color.blue2,
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
    searchContainer: {
        paddingHorizontal: normalize(20),
        paddingBottom: normalize(10),
    },
    searchInput: {
        backgroundColor: Color.backgroundLight,
        borderRadius: Border.radius.small,
        paddingHorizontal: normalize(15),
        paddingVertical: normalize(12),
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProText,
        color: Color.textPrimary,
        borderWidth: 1,
        borderColor: Color.border,
    },
    clearButton: {
        marginHorizontal: normalize(20),
        marginBottom: normalize(10),
        paddingVertical: normalize(12),
        paddingHorizontal: normalize(15),
        backgroundColor: Color.backgroundLight,
        borderRadius: Border.radius.small,
        borderWidth: 1,
        borderColor: Color.border,
        alignItems: 'center',
    },
    clearButtonText: {
        fontSize: normalizeFont(FontSize.size_md),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
    warehouseItem: {
        paddingVertical: normalize(15),
        paddingHorizontal: normalize(20),
        borderBottomWidth: 1,
        borderBottomColor: Color.border,
    },
    selectedItem: {
        backgroundColor: Color.blue2,
    },
    warehouseInfo: {
        flex: 1,
    },
    warehouseName: {
        fontSize: normalizeFont(FontSize.size_md),
        fontWeight: '600',
        color: Color.textPrimary,
        fontFamily: FontFamily.sFProDisplay,
        marginBottom: normalize(4),
    },
    warehouseAddress: {
        fontSize: normalizeFont(FontSize.size_sm),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(2),
    },
    warehouseDistrict: {
        fontSize: normalizeFont(FontSize.size_sm),
        color: Color.blue2,
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
        marginBottom: normalize(2),
    },
    warehouseEmployees: {
        fontSize: normalizeFont(FontSize.size_xs),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    selectedItemText: {
        color: Color.colorLightMode,
    },
    emptyContainer: {
        padding: normalize(40),
        alignItems: 'center',
    },
    emptyText: {
        fontSize: normalizeFont(FontSize.size_md),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
    },
});

export default WarehousePicker;