import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    TextInput,
    Switch,
    ScrollView,
    KeyboardAvoidingView,
    Platform} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { useWarehouses } from '@entities/warehouse/hooks/useWarehouses';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

// Компонент для указания количества коробок и цены на склад
const WarehouseQuantityInput = React.memo(({ warehouse, quantity, warehousePrice, stopPrice, onQuantityChange, onPriceChange, onStopPriceChange, onRemove, basePrice, isAdmin = false }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    // Используем ref для хранения текущих значений без ререндера
    const quantityRef = React.useRef(null);
    const priceRef = React.useRef(null);
    const stopPriceRef = React.useRef(null);
    
    const currentQuantityValue = React.useRef(quantity.toString());
    const currentPriceValue = React.useRef(warehousePrice ? warehousePrice.toString() : '');
    const currentStopPriceValue = React.useRef(stopPrice ? stopPrice.toString() : '');

    const handleQuantityChange = (text) => {
        currentQuantityValue.current = text;
        if (text === '') {
            onQuantityChange(warehouse.id, 0);
            return;
        }
        const numValue = parseInt(text, 10);
        if (!isNaN(numValue)) {
            onQuantityChange(warehouse.id, numValue);
        }
    };

    const handleQuantityBlur = (e) => {
        const text = e.nativeEvent.text || currentQuantityValue.current;
        if (text === '' || text === '0') {
            if (quantityRef.current) {
                quantityRef.current.setNativeProps({ text: '1' });
            }
            currentQuantityValue.current = '1';
            onQuantityChange(warehouse.id, 1);
        } else {
            const numValue = parseInt(text);
            if (!isNaN(numValue) && numValue > 0) {
                onQuantityChange(warehouse.id, numValue);
            }
        }
    };

    const handlePriceChange = (text) => {
        currentPriceValue.current = text;
        if (text === '' || text === null) {
            onPriceChange(warehouse.id, null);
            return;
        }
        const numValue = parseFloat(text.replace(',', '.'));
        if (!isNaN(numValue)) {
            onPriceChange(warehouse.id, numValue);
        }
    };

    const handlePriceBlur = (e) => {
        const text = e.nativeEvent.text || currentPriceValue.current;
        if (text === '' || text === null) {
            onPriceChange(warehouse.id, null);
        } else {
            const numValue = parseFloat(text.replace(',', '.'));
            if (!isNaN(numValue) && numValue > 0) {
                onPriceChange(warehouse.id, numValue);
            }
        }
    };

    const handleStopPriceChange = (text) => {
        currentStopPriceValue.current = text;
        if (text === '' || text === null) {
            onStopPriceChange(warehouse.id, null);
            return;
        }
        const numValue = parseFloat(text.replace(',', '.'));
        if (!isNaN(numValue)) {
            onStopPriceChange(warehouse.id, numValue);
        }
    };

    const handleStopPriceBlur = (e) => {
        const text = e.nativeEvent.text || currentStopPriceValue.current;
        if (text === '' || text === null) {
            onStopPriceChange(warehouse.id, null);
        } else {
            const numValue = parseFloat(text.replace(',', '.'));
            if (!isNaN(numValue) && numValue > 0) {
                onStopPriceChange(warehouse.id, numValue);
            }
        }
    };

    return (
        <View style={styles.quantityItem}>
            <View style={styles.quantityHeaderRow}>
                <View style={styles.quantityInfo}>
                    <Text style={styles.quantityWarehouseName}>{warehouse.name}</Text>
                    {warehouse.address && (
                        <Text style={styles.quantityWarehouseAddress}>{warehouse.address}</Text>
                    )}
                </View>
                <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => onRemove(warehouse.id)}
                >
                    <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.quantityControls}>
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Кол-во</Text>
                    <TextInput
                        ref={quantityRef}
                        style={styles.quantityInput}
                        defaultValue={quantity.toString()}
                        onChangeText={handleQuantityChange}
                        onBlur={handleQuantityBlur}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={isDark ? colors.textTertiary : '#999'}
                        maxLength={5}
                        returnKeyType="done"
                    />
                </View>
                {isAdmin && (
                    <>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Склад (₽)</Text>
                            <TextInput
                                ref={priceRef}
                                style={styles.priceInput}
                                defaultValue={warehousePrice ? warehousePrice.toString() : ''}
                                onChangeText={handlePriceChange}
                                onBlur={handlePriceBlur}
                                keyboardType="decimal-pad"
                                placeholder={basePrice ? basePrice.toString() : "Авто"}
                                placeholderTextColor={isDark ? colors.textTertiary : '#999'}
                                maxLength={10}
                                returnKeyType="done"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Фургон (₽)</Text>
                            <TextInput
                                ref={stopPriceRef}
                                style={styles.priceInput}
                                defaultValue={stopPrice ? stopPrice.toString() : ''}
                                onChangeText={handleStopPriceChange}
                                onBlur={handleStopPriceBlur}
                                keyboardType="decimal-pad"
                                placeholder={basePrice ? basePrice.toString() : "Авто"}
                                placeholderTextColor={isDark ? colors.textTertiary : '#999'}
                                maxLength={10}
                                returnKeyType="done"
                            />
                        </View>
                    </>
                )}
            </View>
        </View>
    );
}, (prevProps, nextProps) => {
    // Кастомная функция сравнения - перерендериваем только если изменились данные склада
    return (
        prevProps.warehouse.id === nextProps.warehouse.id &&
        prevProps.warehouse.name === nextProps.warehouse.name &&
        prevProps.isAdmin === nextProps.isAdmin &&
        prevProps.basePrice === nextProps.basePrice
        // НЕ сравниваем quantity, warehousePrice, stopPrice - используем defaultValue
    );
});

export const WarehouseSelectionScreen = ({ navigation: navigationProp, route: routeProp } = {}) => {
    const navigation = navigationProp || useNavigation();
    const route = routeProp || useRoute();
    const { warehouses, loading: loadingWarehouses } = useWarehouses({ autoLoad: true });
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const {
        selectedWarehouseQuantities = [],
        basePrice = null,
        isAdmin = false,
        onSelectWarehouseQuantities
    } = route.params || {};

    const [searchText, setSearchText] = useState('');
    const [filteredWarehouses, setFilteredWarehouses] = useState(warehouses);
    const [tempSelectedWarehouses, setTempSelectedWarehouses] = useState([]);
    const [warehouseQuantities, setWarehouseQuantities] = useState({});
    const [warehousePrices, setWarehousePrices] = useState({});
    const [stopPrices, setStopPrices] = useState({});
    const [selectAll, setSelectAll] = useState(false);
    const [commonWarehousePrice, setCommonWarehousePrice] = useState('');
    const [commonStopPrice, setCommonStopPrice] = useState('');

    // Инициализация при открытии экрана
    useEffect(() => {
        const selectedIds = selectedWarehouseQuantities.map(item => item.warehouseId);
        setTempSelectedWarehouses(selectedIds);

        const quantitiesMap = {};
        const pricesMap = {};
        const stopPricesMap = {};
        selectedWarehouseQuantities.forEach(item => {
            quantitiesMap[item.warehouseId] = item.quantity;
            if (item.warehousePrice !== undefined && item.warehousePrice !== null) {
                pricesMap[item.warehouseId] = item.warehousePrice;
            }
            if (item.stopPrice !== undefined && item.stopPrice !== null) {
                stopPricesMap[item.warehouseId] = item.stopPrice;
            }
        });
        setWarehouseQuantities(quantitiesMap);
        setWarehousePrices(pricesMap);
        setStopPrices(stopPricesMap);
    }, []);

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

    const handleWarehouseToggle = React.useCallback((warehouseId) => {
        setTempSelectedWarehouses(prev => {
            if (prev.includes(warehouseId)) {
                return prev.filter(id => id !== warehouseId);
            } else {
                const newSelected = [...prev, warehouseId];
                setWarehouseQuantities(prevQ => {
                    if (!prevQ[warehouseId]) {
                        return { ...prevQ, [warehouseId]: 1 };
                    }
                    return prevQ;
                });
                return newSelected;
            }
        });
    }, []);

    const handleQuantityChange = React.useCallback((warehouseId, quantity) => {
        setWarehouseQuantities(prev => ({ ...prev, [warehouseId]: quantity }));
    }, []);

    const handlePriceChange = React.useCallback((warehouseId, price) => {
        setWarehousePrices(prev => ({ ...prev, [warehouseId]: price }));
    }, []);

    const handleStopPriceChange = React.useCallback((warehouseId, price) => {
        setStopPrices(prev => ({ ...prev, [warehouseId]: price }));
    }, []);

    const handleRemoveWarehouse = React.useCallback((warehouseId) => {
        setTempSelectedWarehouses(prev => prev.filter(id => id !== warehouseId));
        setWarehouseQuantities(prev => {
            const newQuantities = { ...prev };
            delete newQuantities[warehouseId];
            return newQuantities;
        });
        setWarehousePrices(prev => {
            const newPrices = { ...prev };
            delete newPrices[warehouseId];
            return newPrices;
        });
        setStopPrices(prev => {
            const newStopPrices = { ...prev };
            delete newStopPrices[warehouseId];
            return newStopPrices;
        });
    }, []);

    const handleSelectAll = React.useCallback(() => {
        if (selectAll || tempSelectedWarehouses.length === warehouses.length) {
            setTempSelectedWarehouses([]);
            setSelectAll(false);
        } else {
            const allIds = warehouses.map(w => w.id);
            setTempSelectedWarehouses(allIds);
            const allQuantities = {};
            warehouses.forEach(w => {
                allQuantities[w.id] = 1;
            });
            setWarehouseQuantities(allQuantities);
            setSelectAll(true);
        }
    }, [selectAll, tempSelectedWarehouses.length, warehouses]);

    const handleApply = React.useCallback(() => {
        const result = tempSelectedWarehouses
            .filter(id => warehouseQuantities[id] > 0)
            .map(warehouseId => {
                const item = {
                    warehouseId,
                    quantity: warehouseQuantities[warehouseId] || 1
                };
                if (warehousePrices[warehouseId] !== undefined && warehousePrices[warehouseId] !== null) {
                    item.warehousePrice = warehousePrices[warehouseId];
                }
                if (stopPrices[warehouseId] !== undefined && stopPrices[warehouseId] !== null) {
                    item.stopPrice = stopPrices[warehouseId];
                }
                return item;
            });

        if (onSelectWarehouseQuantities) {
            onSelectWarehouseQuantities(result);
        }

        navigation.goBack();
    }, [tempSelectedWarehouses, warehouseQuantities, warehousePrices, stopPrices, onSelectWarehouseQuantities, navigation]);

    const handleCancel = React.useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const handleApplyCommonPrices = React.useCallback(() => {
        const warehousePriceNum = commonWarehousePrice.trim() ? parseFloat(commonWarehousePrice.replace(',', '.')) : null;
        const stopPriceNum = commonStopPrice.trim() ? parseFloat(commonStopPrice.replace(',', '.')) : null;
        
        if (warehousePriceNum !== null && !isNaN(warehousePriceNum) && warehousePriceNum > 0) {
            const newPrices = {};
            tempSelectedWarehouses.forEach(id => {
                newPrices[id] = warehousePriceNum;
            });
            setWarehousePrices(prev => ({ ...prev, ...newPrices }));
        } else if (commonWarehousePrice.trim() === '') {
            setWarehousePrices(prev => {
                const updated = { ...prev };
                tempSelectedWarehouses.forEach(id => {
                    updated[id] = null;
                });
                return updated;
            });
        }
        
        if (stopPriceNum !== null && !isNaN(stopPriceNum) && stopPriceNum > 0) {
            const newStopPrices = {};
            tempSelectedWarehouses.forEach(id => {
                newStopPrices[id] = stopPriceNum;
            });
            setStopPrices(prev => ({ ...prev, ...newStopPrices }));
        } else if (commonStopPrice.trim() === '') {
            setStopPrices(prev => {
                const updated = { ...prev };
                tempSelectedWarehouses.forEach(id => {
                    updated[id] = null;
                });
                return updated;
            });
        }
    }, [commonWarehousePrice, commonStopPrice, tempSelectedWarehouses]);

    const selectedWarehousesData = useMemo(() => 
        tempSelectedWarehouses
            .map(id => warehouses.find(w => w.id === id))
            .filter(Boolean),
        [tempSelectedWarehouses, warehouses]
    );

    const renderWarehousesList = React.useCallback(() => (
        <>
            {filteredWarehouses.map((item) => {
                const isSelected = tempSelectedWarehouses.includes(item.id);
                return (
                    <TouchableOpacity
                        key={item.id.toString()}
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
                        </View>
                        <View style={styles.checkboxContainer}>
                            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                {isSelected && <Text style={styles.checkmark}>✓</Text>}
                            </View>
                        </View>
                    </TouchableOpacity>
                );
            })}
            {filteredWarehouses.length === 0 && (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                        {loadingWarehouses ? 'Загрузка складов...' : searchText ? 'Склады не найдены' : 'Список складов пуст'}
                    </Text>
                </View>
            )}
        </>
    ), [filteredWarehouses, tempSelectedWarehouses, handleWarehouseToggle, loadingWarehouses, searchText]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={handleCancel}
                >
                    <Text style={styles.closeButtonText}>Отмена</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Выберите склады и укажите количества</Text>
                <View style={styles.placeholder} />
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <ScrollView 
                    style={styles.scrollContent}
                    contentContainerStyle={styles.scrollContentContainer}
                    showsVerticalScrollIndicator={true}
                    keyboardShouldPersistTaps="handled"
                >
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Поиск склада..."
                        value={searchText}
                        onChangeText={setSearchText}
                        placeholderTextColor={isDark ? colors.textTertiary : '#999'}
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

                {renderWarehousesList()}

                {/* Секция для установки общих цен (только для админов) */}
                {selectedWarehousesData.length > 0 && isAdmin && (
                    <View style={styles.commonPricesSection}>
                        <Text style={styles.commonPricesTitle}>Общие цены для всех выбранных складов:</Text>
                        <View style={styles.commonPricesRow}>
                            <View style={styles.commonPriceInputContainer}>
                                <Text style={styles.commonPriceLabel}>Цена склада (₽)</Text>
                                <TextInput
                                    style={styles.commonPriceInput}
                                    value={commonWarehousePrice}
                                    onChangeText={setCommonWarehousePrice}
                                    placeholder={basePrice ? basePrice.toString() : "Авто"}
                                    keyboardType="numeric"
                                    placeholderTextColor={isDark ? colors.textTertiary : '#999'}
                                />
                            </View>
                            <View style={styles.commonPriceInputContainer}>
                                <Text style={styles.commonPriceLabel}>Цена фургона (₽)</Text>
                                <TextInput
                                    style={styles.commonPriceInput}
                                    value={commonStopPrice}
                                    onChangeText={setCommonStopPrice}
                                    placeholder={basePrice ? basePrice.toString() : "Авто"}
                                    keyboardType="numeric"
                                    placeholderTextColor={isDark ? colors.textTertiary : '#999'}
                                />
                            </View>
                            <TouchableOpacity
                                style={styles.applyCommonPriceButton}
                                onPress={handleApplyCommonPrices}
                            >
                                <Text style={styles.applyCommonPriceButtonText}>Применить</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Секция для указания количеств и цен выбранных складов */}
                {selectedWarehousesData.length > 0 && (
                    <View style={styles.quantitiesSection}>
                        <Text style={styles.quantitiesTitle}>
                            {isAdmin ? 'Укажите количество коробок и цены (склад/фургон):' : 'Укажите количество коробок:'}
                        </Text>
                        <View style={styles.quantitiesList}>
                            {selectedWarehousesData.map(warehouse => {
                                const warehouseId = warehouse.id;
                                return (
                                    <WarehouseQuantityInput
                                        key={warehouseId}
                                        warehouse={warehouse}
                                        quantity={warehouseQuantities[warehouseId] || 1}
                                        warehousePrice={warehousePrices[warehouseId]}
                                        stopPrice={stopPrices[warehouseId]}
                                        basePrice={basePrice}
                                        onQuantityChange={handleQuantityChange}
                                        onPriceChange={handlePriceChange}
                                        onStopPriceChange={handleStopPriceChange}
                                        onRemove={handleRemoveWarehouse}
                                        isAdmin={isAdmin}
                                    />
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Отступ для кнопки */}
                <View style={styles.bottomSpacer} />
                </ScrollView>
            </KeyboardAvoidingView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.footerButton, styles.applyButton]}
                    onPress={handleApply}
                >
                    <Text style={styles.applyButtonText}>Применить</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export const WarehouseSelectionInline = ({
    selectedWarehouseQuantities = [],
    basePrice = null,
    isAdmin = false,
    onSelectWarehouseQuantities
}) => {
    const { warehouses, loading: loadingWarehouses } = useWarehouses({ autoLoad: true });
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const [searchText, setSearchText] = useState('');
    const [filteredWarehouses, setFilteredWarehouses] = useState(warehouses);
    const [tempSelectedWarehouses, setTempSelectedWarehouses] = useState([]);
    const [warehouseQuantities, setWarehouseQuantities] = useState({});
    const [warehousePrices, setWarehousePrices] = useState({});
    const [stopPrices, setStopPrices] = useState({});
    const [selectAll, setSelectAll] = useState(false);
    const [commonWarehousePrice, setCommonWarehousePrice] = useState('');
    const [commonStopPrice, setCommonStopPrice] = useState('');

    useEffect(() => {
        const selectedIds = selectedWarehouseQuantities.map(item => item.warehouseId);
        setTempSelectedWarehouses(selectedIds);

        const quantitiesMap = {};
        const pricesMap = {};
        const stopPricesMap = {};
        selectedWarehouseQuantities.forEach(item => {
            quantitiesMap[item.warehouseId] = item.quantity;
            if (item.warehousePrice !== undefined && item.warehousePrice !== null) {
                pricesMap[item.warehouseId] = item.warehousePrice;
            }
            if (item.stopPrice !== undefined && item.stopPrice !== null) {
                stopPricesMap[item.warehouseId] = item.stopPrice;
            }
        });
        setWarehouseQuantities(quantitiesMap);
        setWarehousePrices(pricesMap);
        setStopPrices(stopPricesMap);
    }, [selectedWarehouseQuantities]);

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

    useEffect(() => {
        if (!warehouses || !warehouses.length) {
            setSelectAll(false);
            return;
        }
        setSelectAll(tempSelectedWarehouses.length === warehouses.length);
    }, [tempSelectedWarehouses.length, warehouses]);

    const handleWarehouseToggle = React.useCallback((warehouseId) => {
        setTempSelectedWarehouses(prev => {
            if (prev.includes(warehouseId)) {
                return prev.filter(id => id !== warehouseId);
            }
            const newSelected = [...prev, warehouseId];
            setWarehouseQuantities(prevQ => {
                if (!prevQ[warehouseId]) {
                    return { ...prevQ, [warehouseId]: 1 };
                }
                return prevQ;
            });
            return newSelected;
        });
    }, []);

    const handleQuantityChange = React.useCallback((warehouseId, quantity) => {
        setWarehouseQuantities(prev => ({ ...prev, [warehouseId]: quantity }));
    }, []);

    const handlePriceChange = React.useCallback((warehouseId, price) => {
        setWarehousePrices(prev => ({ ...prev, [warehouseId]: price }));
    }, []);

    const handleStopPriceChange = React.useCallback((warehouseId, price) => {
        setStopPrices(prev => ({ ...prev, [warehouseId]: price }));
    }, []);

    const handleRemoveWarehouse = React.useCallback((warehouseId) => {
        setTempSelectedWarehouses(prev => prev.filter(id => id !== warehouseId));
        setWarehouseQuantities(prev => {
            const newQuantities = { ...prev };
            delete newQuantities[warehouseId];
            return newQuantities;
        });
        setWarehousePrices(prev => {
            const newPrices = { ...prev };
            delete newPrices[warehouseId];
            return newPrices;
        });
        setStopPrices(prev => {
            const newStopPrices = { ...prev };
            delete newStopPrices[warehouseId];
            return newStopPrices;
        });
    }, []);

    const handleSelectAll = React.useCallback(() => {
        if (selectAll || tempSelectedWarehouses.length === warehouses.length) {
            setTempSelectedWarehouses([]);
            setSelectAll(false);
        } else {
            const allIds = warehouses.map(w => w.id);
            setTempSelectedWarehouses(allIds);
            const allQuantities = {};
            warehouses.forEach(w => {
                allQuantities[w.id] = 1;
            });
            setWarehouseQuantities(allQuantities);
            setSelectAll(true);
        }
    }, [selectAll, tempSelectedWarehouses.length, warehouses]);

    const handleApply = React.useCallback(() => {
        const result = tempSelectedWarehouses
            .filter(id => warehouseQuantities[id] > 0)
            .map(warehouseId => {
                const item = {
                    warehouseId,
                    quantity: warehouseQuantities[warehouseId] || 1
                };
                if (warehousePrices[warehouseId] !== undefined && warehousePrices[warehouseId] !== null) {
                    item.warehousePrice = warehousePrices[warehouseId];
                }
                if (stopPrices[warehouseId] !== undefined && stopPrices[warehouseId] !== null) {
                    item.stopPrice = stopPrices[warehouseId];
                }
                return item;
            });

        if (onSelectWarehouseQuantities) {
            onSelectWarehouseQuantities(result);
        }
    }, [tempSelectedWarehouses, warehouseQuantities, warehousePrices, stopPrices, onSelectWarehouseQuantities]);

    const handleApplyCommonPrices = React.useCallback(() => {
        const warehousePriceNum = commonWarehousePrice.trim() ? parseFloat(commonWarehousePrice.replace(',', '.')) : null;
        const stopPriceNum = commonStopPrice.trim() ? parseFloat(commonStopPrice.replace(',', '.')) : null;

        if (warehousePriceNum !== null && !isNaN(warehousePriceNum) && warehousePriceNum > 0) {
            const newPrices = {};
            tempSelectedWarehouses.forEach(id => {
                newPrices[id] = warehousePriceNum;
            });
            setWarehousePrices(prev => ({ ...prev, ...newPrices }));
        } else if (commonWarehousePrice.trim() === '') {
            setWarehousePrices(prev => {
                const updated = { ...prev };
                tempSelectedWarehouses.forEach(id => {
                    updated[id] = null;
                });
                return updated;
            });
        }

        if (stopPriceNum !== null && !isNaN(stopPriceNum) && stopPriceNum > 0) {
            const newStopPrices = {};
            tempSelectedWarehouses.forEach(id => {
                newStopPrices[id] = stopPriceNum;
            });
            setStopPrices(prev => ({ ...prev, ...newStopPrices }));
        } else if (commonStopPrice.trim() === '') {
            setStopPrices(prev => {
                const updated = { ...prev };
                tempSelectedWarehouses.forEach(id => {
                    updated[id] = null;
                });
                return updated;
            });
        }
    }, [commonWarehousePrice, commonStopPrice, tempSelectedWarehouses]);

    const selectedWarehousesData = useMemo(() =>
        tempSelectedWarehouses
            .map(id => warehouses.find(w => w.id === id))
            .filter(Boolean),
        [tempSelectedWarehouses, warehouses]
    );

    const renderWarehousesList = React.useCallback(() => (
        <>
            {filteredWarehouses.map((item) => {
                const isSelected = tempSelectedWarehouses.includes(item.id);
                return (
                    <TouchableOpacity
                        key={item.id.toString()}
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
                        </View>
                        <View style={styles.checkboxContainer}>
                            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                {isSelected && <Text style={styles.checkmark}>✓</Text>}
                            </View>
                        </View>
                    </TouchableOpacity>
                );
            })}
            {filteredWarehouses.length === 0 && (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                        {loadingWarehouses ? 'Загрузка складов...' : searchText ? 'Склады не найдены' : 'Список складов пуст'}
                    </Text>
                </View>
            )}
        </>
    ), [filteredWarehouses, tempSelectedWarehouses, handleWarehouseToggle, loadingWarehouses, searchText]);

    return (
        <View style={styles.inlineContainer}>
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Поиск склада..."
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholderTextColor={isDark ? colors.textTertiary : '#999'}
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

            {renderWarehousesList()}

            {selectedWarehousesData.length > 0 && isAdmin && (
                <View style={styles.commonPricesSection}>
                    <Text style={styles.commonPricesTitle}>Общие цены для всех выбранных складов:</Text>
                    <View style={styles.commonPricesRow}>
                        <View style={styles.commonPriceInputContainer}>
                            <Text style={styles.commonPriceLabel}>Цена склада (₽)</Text>
                            <TextInput
                                style={styles.commonPriceInput}
                                value={commonWarehousePrice}
                                onChangeText={setCommonWarehousePrice}
                                placeholder={basePrice ? basePrice.toString() : "Авто"}
                                keyboardType="numeric"
                                placeholderTextColor={isDark ? colors.textTertiary : '#999'}
                            />
                        </View>
                        <View style={styles.commonPriceInputContainer}>
                            <Text style={styles.commonPriceLabel}>Цена фургона (₽)</Text>
                            <TextInput
                                style={styles.commonPriceInput}
                                value={commonStopPrice}
                                onChangeText={setCommonStopPrice}
                                placeholder={basePrice ? basePrice.toString() : "Авто"}
                                keyboardType="numeric"
                                placeholderTextColor={isDark ? colors.textTertiary : '#999'}
                            />
                        </View>
                        <TouchableOpacity
                            style={styles.applyCommonPriceButton}
                            onPress={handleApplyCommonPrices}
                        >
                            <Text style={styles.applyCommonPriceButtonText}>Применить</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {selectedWarehousesData.length > 0 && (
                <View style={styles.quantitiesSection}>
                    <Text style={styles.quantitiesTitle}>
                        {isAdmin ? 'Укажите количество коробок и цены (склад/фургон):' : 'Укажите количество коробок:'}
                    </Text>
                    <View style={styles.quantitiesList}>
                        {selectedWarehousesData.map(warehouse => {
                            const warehouseId = warehouse.id;
                            return (
                                <WarehouseQuantityInput
                                    key={warehouseId}
                                    warehouse={warehouse}
                                    quantity={warehouseQuantities[warehouseId] || 1}
                                    warehousePrice={warehousePrices[warehouseId]}
                                    stopPrice={stopPrices[warehouseId]}
                                    basePrice={basePrice}
                                    onQuantityChange={handleQuantityChange}
                                    onPriceChange={handlePriceChange}
                                    onStopPriceChange={handleStopPriceChange}
                                    onRemove={handleRemoveWarehouse}
                                    isAdmin={isAdmin}
                                />
                            );
                        })}
                    </View>
                </View>
            )}

            <View style={styles.inlineFooter}>
                <TouchableOpacity
                    style={[styles.footerButton, styles.applyButton]}
                    onPress={handleApply}
                >
                    <Text style={styles.applyButtonText}>Применить</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: isDark ? colors.background : Color.colorLightMode,
    },
    inlineContainer: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: Border.radius.medium,
        backgroundColor: isDark ? colors.surface : Color.colorLightMode,
        overflow: 'hidden',
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollContent: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingBottom: normalize(100),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: normalize(16),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: isDark ? colors.surface : Color.colorLightMode,
    },
    closeButton: {
        padding: normalize(8),
    },
    closeButtonText: {
        fontSize: normalizeFont(16),
        color: isDark ? colors.primary : Color.blue2,
        fontFamily: FontFamily.sFProText,
    },
    modalTitle: {
        fontSize: normalizeFont(18),
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProDisplay,
        flex: 1,
        textAlign: 'center',
    },
    placeholder: {
        width: 60,
    },
    searchContainer: {
        padding: normalize(16),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: isDark ? colors.surface : Color.colorLightMode,
    },
    searchInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: Border.radius.small,
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(12),
        fontSize: normalizeFont(16),
        fontFamily: FontFamily.sFProText,
        backgroundColor: isDark ? colors.surfaceElevated : Color.colorLightMode,
        color: colors.textPrimary,
    },
    selectAllContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: normalize(16),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: isDark ? colors.surface : Color.colorLightMode,
    },
    selectAllText: {
        fontSize: normalizeFont(16),
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
    },
    warehouseItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: normalize(16),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: isDark ? colors.surface : Color.colorLightMode,
    },
    selectedItem: {
        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.18)' : '#E8F0FE',
    },
    warehouseInfo: {
        flex: 1,
    },
    warehouseName: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProDisplay,
        marginBottom: normalize(4),
    },
    selectedItemText: {
        color: isDark ? colors.primary : '#3B43A2',
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
        borderColor: isDark ? colors.border : '#C0C0C0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: isDark ? colors.primary : '#3B43A2',
        borderColor: isDark ? colors.primary : '#3B43A2',
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
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
    },
    commonPricesSection: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        padding: normalize(16),
        backgroundColor: isDark ? colors.surfaceElevated : (Color.backgroundLight || '#F8F8F8'),
        marginTop: normalize(16),
    },
    commonPricesTitle: {
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: colors.textPrimary,
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
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(4),
    },
    commonPriceInput: {
        width: '100%',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(8),
        textAlign: 'center',
        fontSize: normalizeFont(12),
        fontFamily: FontFamily.sFProText,
        backgroundColor: isDark ? colors.surface : Color.colorLightMode,
        color: colors.textPrimary,
    },
    applyCommonPriceButton: {
        backgroundColor: isDark ? colors.primary : '#3B43A2',
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
        borderTopColor: colors.border,
        backgroundColor: isDark ? colors.surface : Color.colorLightMode,
        marginTop: normalize(16),
        paddingBottom: normalize(16),
    },
    quantitiesTitle: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProDisplay,
        padding: normalize(16),
        paddingBottom: normalize(10),
    },
    quantitiesList: {
        paddingHorizontal: normalize(16),
    },
    bottomSpacer: {
        height: normalize(100),
    },
    quantityItem: {
        paddingVertical: normalize(10),
        paddingHorizontal: normalize(12),
        backgroundColor: isDark ? colors.surfaceElevated : (Color.backgroundLight || '#F8F8F8'),
        borderRadius: 8,
        marginBottom: normalize(8),
        borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    quantityHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: normalize(8),
    },
    quantityInfo: {
        flex: 1,
    },
    quantityWarehouseName: {
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(2),
    },
    quantityWarehouseAddress: {
        fontSize: normalizeFont(12),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: normalize(8),
        flexWrap: 'wrap',
        marginTop: normalize(8),
    },
    inputGroup: {
        alignItems: 'center',
    },
    inputLabel: {
        fontSize: normalizeFont(10),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(4),
    },
    quantityInput: {
        width: 65,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        paddingHorizontal: normalize(4),
        paddingVertical: normalize(6),
        minHeight: normalize(28),
        textAlign: 'center',
        fontSize: normalizeFont(11),
        fontFamily: FontFamily.sFProText,
        backgroundColor: isDark ? colors.surface : Color.colorLightMode,
        color: colors.textPrimary,
    },
    priceInput: {
        width: 65,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        paddingHorizontal: normalize(4),
        paddingVertical: normalize(6),
        minHeight: normalize(28),
        textAlign: 'center',
        fontSize: normalizeFont(11),
        fontFamily: FontFamily.sFProText,
        backgroundColor: isDark ? colors.surface : Color.colorLightMode,
        color: colors.textPrimary,
    },
    removeButton: {
        padding: normalize(8),
        marginLeft: normalize(8),
    },
    removeButtonText: {
        fontSize: normalizeFont(20),
        color: colors.error,
        fontFamily: FontFamily.sFProText,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        padding: normalize(16),
        backgroundColor: isDark ? colors.surface : Color.colorLightMode,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: isDark ? 0 : 0.1,
        shadowRadius: 4,
        elevation: isDark ? 0 : 5,
    },
    inlineFooter: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        padding: normalize(12),
        backgroundColor: isDark ? colors.surface : Color.colorLightMode,
    },
    footerButton: {
        paddingVertical: normalize(14),
        borderRadius: Border.radius.medium,
        alignItems: 'center',
    },
    applyButton: {
        backgroundColor: isDark ? colors.primary : Color.blue2,
    },
    applyButtonText: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: '#FFFFFF',
        fontFamily: FontFamily.sFProText,
    },
});

export default WarehouseSelectionScreen;

