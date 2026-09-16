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

const buildWarehouseSelectionPayload = (selectedIds, quantities, prices, reservedMap = {}, warehouses = []) => {
    return selectedIds.map((warehouseId) => {
        const warehouse = warehouses.find((w) => w.id === warehouseId);
        const reserved = reservedMap[warehouseId] || 0;
        const quantity = Math.max(quantities[warehouseId] || 0, reserved);
        const item = {
            warehouseId,
            quantity,
            reserved,
            isMain: Boolean(warehouse?.isMain)
        };
        if (prices[warehouseId] !== undefined && prices[warehouseId] !== null) {
            item.warehousePrice = prices[warehouseId];
        }
        return item;
    }).filter((item) => item.quantity > 0 || item.reserved > 0);
};

const WarehouseQuantityInput = React.memo(({ warehouse, quantity, warehousePrice, reserved = 0, onQuantityChange, onPriceChange, onRemove, basePrice, canSetWarehousePrice = false }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const quantityRef = React.useRef(null);
    const priceRef = React.useRef(null);
    const minQuantity = Math.max(0, reserved || 0);

    const currentQuantityValue = React.useRef(quantity.toString());
    const currentPriceValue = React.useRef(warehousePrice ? warehousePrice.toString() : '');

    const handleQuantityChange = (text) => {
        currentQuantityValue.current = text;
        if (text === '') {
            onQuantityChange(warehouse.id, minQuantity);
            return;
        }
        const numValue = parseInt(text, 10);
        if (!isNaN(numValue)) {
            onQuantityChange(warehouse.id, Math.max(numValue, minQuantity));
        }
    };

    const handleQuantityBlur = (e) => {
        const text = e.nativeEvent.text || currentQuantityValue.current;
        const numValue = parseInt(text, 10);
        const nextValue = Number.isNaN(numValue) ? minQuantity : Math.max(numValue, minQuantity);
        currentQuantityValue.current = String(nextValue);
        if (quantityRef.current) {
            quantityRef.current.setNativeProps({ text: String(nextValue) });
        }
        onQuantityChange(warehouse.id, nextValue);
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

    const handleRemove = () => {
        if (minQuantity > 0) {
            return;
        }
        onRemove(warehouse.id);
    };

    return (
        <View style={styles.quantityItem}>
            <View style={styles.quantityHeaderRow}>
                <View style={styles.quantityInfo}>
                    <Text style={styles.quantityWarehouseName}>
                        {warehouse.name}{warehouse.isMain ? ' · главный' : ' · филиал'}
                    </Text>
                    {warehouse.address && (
                        <Text style={styles.quantityWarehouseAddress}>{warehouse.address}</Text>
                    )}
                    {minQuantity > 0 ? (
                        <Text style={styles.quantityWarehouseAddress}>Резерв: {minQuantity} кор.</Text>
                    ) : null}
                </View>
                {minQuantity === 0 ? (
                    <TouchableOpacity
                        style={styles.removeButton}
                        onPress={handleRemove}
                    >
                        <Text style={styles.removeButtonText}>✕</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
            <View style={styles.quantityControls}>
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Коробок</Text>
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
                {canSetWarehousePrice && (
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
                )}
            </View>
        </View>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.warehouse.id === nextProps.warehouse.id &&
        prevProps.warehouse.name === nextProps.warehouse.name &&
        prevProps.warehouse.isMain === nextProps.warehouse.isMain &&
        prevProps.canSetWarehousePrice === nextProps.canSetWarehousePrice &&
        prevProps.basePrice === nextProps.basePrice &&
        prevProps.reserved === nextProps.reserved
    );
});

export const WarehouseSelectionScreen = ({ navigation: navigationProp, route: routeProp } = {}) => {
    const navigation = navigationProp || useNavigation();
    const route = routeProp || useRoute();
    const { warehouses: allWarehouses, loading: loadingWarehouses } = useWarehouses({ autoLoad: true });
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const {
        selectedWarehouseQuantities = [],
        basePrice = null,
        isAdmin = false,
        canSetWarehousePrice = isAdmin,
        allowedWarehouseIds = null,
        onSelectWarehouseQuantities
    } = route.params || {};

    const warehouses = useMemo(() => {
        if (!allowedWarehouseIds?.length) return allWarehouses;
        return (allWarehouses || []).filter((w) => allowedWarehouseIds.includes(w.id));
    }, [allWarehouses, allowedWarehouseIds]);

    const [searchText, setSearchText] = useState('');
    const [filteredWarehouses, setFilteredWarehouses] = useState(warehouses);
    const [tempSelectedWarehouses, setTempSelectedWarehouses] = useState([]);
    const [warehouseQuantities, setWarehouseQuantities] = useState({});
    const [warehousePrices, setWarehousePrices] = useState({});
    const [reservedMap, setReservedMap] = useState({});
    const [selectAll, setSelectAll] = useState(false);
    const [commonWarehousePrice, setCommonWarehousePrice] = useState('');

    useEffect(() => {
        const selectedIds = selectedWarehouseQuantities.map(item => item.warehouseId);
        setTempSelectedWarehouses(selectedIds);

        const quantitiesMap = {};
        const pricesMap = {};
        const nextReserved = {};
        selectedWarehouseQuantities.forEach(item => {
            quantitiesMap[item.warehouseId] = item.quantity;
            nextReserved[item.warehouseId] = item.reserved || 0;
            if (item.warehousePrice !== undefined && item.warehousePrice !== null) {
                pricesMap[item.warehouseId] = item.warehousePrice;
            }
        });
        setWarehouseQuantities(quantitiesMap);
        setWarehousePrices(pricesMap);
        setReservedMap(nextReserved);
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
                if ((reservedMap[warehouseId] || 0) > 0) {
                    return prev;
                }
                return prev.filter(id => id !== warehouseId);
            }
            const newSelected = [...prev, warehouseId];
            setWarehouseQuantities(prevQ => {
                if (prevQ[warehouseId] === undefined) {
                    return { ...prevQ, [warehouseId]: 0 };
                }
                return prevQ;
            });
            return newSelected;
        });
    }, [reservedMap]);

    const handleQuantityChange = React.useCallback((warehouseId, quantity) => {
        setWarehouseQuantities(prev => ({ ...prev, [warehouseId]: quantity }));
    }, []);

    const handlePriceChange = React.useCallback((warehouseId, price) => {
        setWarehousePrices(prev => ({ ...prev, [warehouseId]: price }));
    }, []);

    const handleRemoveWarehouse = React.useCallback((warehouseId) => {
        if ((reservedMap[warehouseId] || 0) > 0) return;
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
    }, [reservedMap]);

    const handleSelectAll = React.useCallback(() => {
        if (selectAll || tempSelectedWarehouses.length === warehouses.length) {
            setTempSelectedWarehouses((prev) => prev.filter((id) => (reservedMap[id] || 0) > 0));
            setSelectAll(false);
        } else {
            const allIds = warehouses.map(w => w.id);
            setTempSelectedWarehouses(allIds);
            setWarehouseQuantities((prev) => {
                const allQuantities = { ...prev };
                warehouses.forEach(w => {
                    if (allQuantities[w.id] === undefined) {
                        allQuantities[w.id] = 0;
                    }
                });
                return allQuantities;
            });
            setSelectAll(true);
        }
    }, [selectAll, tempSelectedWarehouses.length, warehouses, reservedMap]);

    const handleApply = React.useCallback(() => {
        const result = buildWarehouseSelectionPayload(
            tempSelectedWarehouses,
            warehouseQuantities,
            warehousePrices,
            reservedMap,
            warehouses
        );
        if (onSelectWarehouseQuantities) {
            onSelectWarehouseQuantities(result);
        }
        navigation.goBack();
    }, [tempSelectedWarehouses, warehouseQuantities, warehousePrices, reservedMap, warehouses, onSelectWarehouseQuantities, navigation]);

    const handleCancel = React.useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const handleApplyCommonPrices = React.useCallback(() => {
        const warehousePriceNum = commonWarehousePrice.trim() ? parseFloat(commonWarehousePrice.replace(',', '.')) : null;

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
    }, [commonWarehousePrice, tempSelectedWarehouses]);

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
                                {item.name}{item.isMain ? ' · главный' : ' · филиал'}
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

                {selectedWarehousesData.length > 0 && canSetWarehousePrice && (
                    <View style={styles.commonPricesSection}>
                        <Text style={styles.commonPricesTitle}>Общая цена склада для выбранных:</Text>
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
                            {canSetWarehousePrice ? 'Укажите количество коробок и закупочную цену склада:' : 'Укажите количество коробок:'}
                        </Text>
                        <View style={styles.quantitiesList}>
                            {selectedWarehousesData.map(warehouse => {
                                const warehouseId = warehouse.id;
                                return (
                                    <WarehouseQuantityInput
                                        key={warehouseId}
                                        warehouse={warehouse}
                                        quantity={warehouseQuantities[warehouseId] || 0}
                                        warehousePrice={warehousePrices[warehouseId]}
                                        reserved={reservedMap[warehouseId] || 0}
                                        basePrice={basePrice}
                                        onQuantityChange={handleQuantityChange}
                                        onPriceChange={handlePriceChange}
                                        onRemove={handleRemoveWarehouse}
                                        canSetWarehousePrice={canSetWarehousePrice}
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
    canSetWarehousePrice = isAdmin,
    allowedWarehouseIds = null,
    onSelectWarehouseQuantities
}) => {
    const { warehouses: allWarehouses, loading: loadingWarehouses } = useWarehouses({ autoLoad: true });
    const warehouses = useMemo(() => {
        if (!allowedWarehouseIds?.length) return allWarehouses;
        return (allWarehouses || []).filter((w) => allowedWarehouseIds.includes(w.id));
    }, [allWarehouses, allowedWarehouseIds]);
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const [searchText, setSearchText] = useState('');
    const [filteredWarehouses, setFilteredWarehouses] = useState(warehouses);
    const [tempSelectedWarehouses, setTempSelectedWarehouses] = useState([]);
    const [warehouseQuantities, setWarehouseQuantities] = useState({});
    const [warehousePrices, setWarehousePrices] = useState({});
    const [reservedMap, setReservedMap] = useState({});
    const [selectAll, setSelectAll] = useState(false);
    const [commonWarehousePrice, setCommonWarehousePrice] = useState('');
    const lastEmittedRef = React.useRef('');

    const emitSelection = React.useCallback((ids, quantities, prices, reserved) => {
        const result = buildWarehouseSelectionPayload(ids, quantities, prices, reserved, warehouses);
        lastEmittedRef.current = JSON.stringify(result);
        onSelectWarehouseQuantities?.(result);
    }, [onSelectWarehouseQuantities, warehouses]);

    useEffect(() => {
        const incoming = JSON.stringify(selectedWarehouseQuantities || []);
        if (incoming === lastEmittedRef.current) return;
        lastEmittedRef.current = incoming;

        const selectedIds = selectedWarehouseQuantities.map(item => item.warehouseId);
        setTempSelectedWarehouses(selectedIds);

        const quantitiesMap = {};
        const pricesMap = {};
        const nextReserved = {};
        selectedWarehouseQuantities.forEach(item => {
            quantitiesMap[item.warehouseId] = item.quantity;
            nextReserved[item.warehouseId] = item.reserved || 0;
            if (item.warehousePrice !== undefined && item.warehousePrice !== null) {
                pricesMap[item.warehouseId] = item.warehousePrice;
            }
        });
        setWarehouseQuantities(quantitiesMap);
        setWarehousePrices(pricesMap);
        setReservedMap(nextReserved);
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
            let next;
            let nextQuantities = warehouseQuantities;
            if (prev.includes(warehouseId)) {
                if ((reservedMap[warehouseId] || 0) > 0) return prev;
                next = prev.filter(id => id !== warehouseId);
            } else {
                next = [...prev, warehouseId];
                if (warehouseQuantities[warehouseId] === undefined) {
                    nextQuantities = { ...warehouseQuantities, [warehouseId]: 0 };
                    setWarehouseQuantities(nextQuantities);
                }
            }
            emitSelection(next, nextQuantities, warehousePrices, reservedMap);
            return next;
        });
    }, [emitSelection, warehouseQuantities, warehousePrices, reservedMap]);

    const handleQuantityChange = React.useCallback((warehouseId, quantity) => {
        setWarehouseQuantities(prev => {
            const next = { ...prev, [warehouseId]: quantity };
            emitSelection(tempSelectedWarehouses, next, warehousePrices, reservedMap);
            return next;
        });
    }, [emitSelection, tempSelectedWarehouses, warehousePrices, reservedMap]);

    const handlePriceChange = React.useCallback((warehouseId, price) => {
        setWarehousePrices(prev => {
            const next = { ...prev, [warehouseId]: price };
            emitSelection(tempSelectedWarehouses, warehouseQuantities, next, reservedMap);
            return next;
        });
    }, [emitSelection, tempSelectedWarehouses, warehouseQuantities, reservedMap]);

    const handleRemoveWarehouse = React.useCallback((warehouseId) => {
        if ((reservedMap[warehouseId] || 0) > 0) return;
        const nextIds = tempSelectedWarehouses.filter(id => id !== warehouseId);
        const nextQuantities = { ...warehouseQuantities };
        delete nextQuantities[warehouseId];
        const nextPrices = { ...warehousePrices };
        delete nextPrices[warehouseId];
        setTempSelectedWarehouses(nextIds);
        setWarehouseQuantities(nextQuantities);
        setWarehousePrices(nextPrices);
        emitSelection(nextIds, nextQuantities, nextPrices, reservedMap);
    }, [emitSelection, reservedMap, tempSelectedWarehouses, warehouseQuantities, warehousePrices]);

    const handleSelectAll = React.useCallback(() => {
        if (selectAll || tempSelectedWarehouses.length === warehouses.length) {
            const nextIds = tempSelectedWarehouses.filter((id) => (reservedMap[id] || 0) > 0);
            setTempSelectedWarehouses(nextIds);
            setSelectAll(false);
            emitSelection(nextIds, warehouseQuantities, warehousePrices, reservedMap);
        } else {
            const allIds = warehouses.map(w => w.id);
            const allQuantities = { ...warehouseQuantities };
            warehouses.forEach(w => {
                if (allQuantities[w.id] === undefined) {
                    allQuantities[w.id] = 0;
                }
            });
            setTempSelectedWarehouses(allIds);
            setWarehouseQuantities(allQuantities);
            setSelectAll(true);
            emitSelection(allIds, allQuantities, warehousePrices, reservedMap);
        }
    }, [selectAll, tempSelectedWarehouses, warehouses, reservedMap, warehouseQuantities, warehousePrices, emitSelection]);

    const handleApplyCommonPrices = React.useCallback(() => {
        const warehousePriceNum = commonWarehousePrice.trim() ? parseFloat(commonWarehousePrice.replace(',', '.')) : null;
        const nextPrices = { ...warehousePrices };
        if (warehousePriceNum !== null && !isNaN(warehousePriceNum) && warehousePriceNum > 0) {
            tempSelectedWarehouses.forEach(id => {
                nextPrices[id] = warehousePriceNum;
            });
        } else if (commonWarehousePrice.trim() === '') {
            tempSelectedWarehouses.forEach(id => {
                nextPrices[id] = null;
            });
        }
        setWarehousePrices(nextPrices);
        emitSelection(tempSelectedWarehouses, warehouseQuantities, nextPrices, reservedMap);
    }, [commonWarehousePrice, tempSelectedWarehouses, warehousePrices, warehouseQuantities, reservedMap, emitSelection]);

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
                                {item.name}{item.isMain ? ' · главный' : ' · филиал'}
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
    ), [filteredWarehouses, tempSelectedWarehouses, handleWarehouseToggle, loadingWarehouses, searchText, styles]);

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

            {warehouses.length > 1 ? (
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
            ) : null}

            {renderWarehousesList()}

            {selectedWarehousesData.length > 0 && canSetWarehousePrice && (
                <View style={styles.commonPricesSection}>
                    <Text style={styles.commonPricesTitle}>Общая цена склада для выбранных:</Text>
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
                        {canSetWarehousePrice ? 'Укажите количество коробок и закупочную цену склада:' : 'Укажите количество коробок:'}
                    </Text>
                    <View style={styles.quantitiesList}>
                        {selectedWarehousesData.map(warehouse => {
                            const warehouseId = warehouse.id;
                            return (
                                <WarehouseQuantityInput
                                    key={warehouseId}
                                    warehouse={warehouse}
                                    quantity={warehouseQuantities[warehouseId] || 0}
                                    warehousePrice={warehousePrices[warehouseId]}
                                    reserved={reservedMap[warehouseId] || 0}
                                    basePrice={basePrice}
                                    onQuantityChange={handleQuantityChange}
                                    onPriceChange={handlePriceChange}
                                    onRemove={handleRemoveWarehouse}
                                    canSetWarehousePrice={canSetWarehousePrice}
                                />
                            );
                        })}
                    </View>
                </View>
            )}
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

