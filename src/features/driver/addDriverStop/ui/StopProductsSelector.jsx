import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useSelector } from 'react-redux';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import WarehouseService from '@entities/warehouse/api/warehouseApi';
import { logData } from '@shared/lib/logger';
import { selectUser } from '@entities/auth/model/selectors';

export const StopProductsSelector = ({
    warehouseId,
    districtId,
    selectedProducts = [],
    onProductsChange,
    onWarehouseChange,
    showAlertWarning,
    showAlertError,
    priceValidationErrors = {},
    onPriceErrorClear
}) => {
    const user = useSelector(selectUser);
    const isAdmin = user?.role === 'ADMIN';
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [loadingWarehouses, setLoadingWarehouses] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [showProductSelector, setShowProductSelector] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);

    // Загрузка складов при выборе района
    useEffect(() => {
        if (districtId) {
            loadWarehouses();
        } else {
            setWarehouses([]);
            setSelectedWarehouse(null);
            onWarehouseChange(null);
        }
    }, [districtId]);

    // Загрузка товаров при выборе склада
    useEffect(() => {
        if (warehouseId) {
            // Очищаем предыдущие товары перед загрузкой новых
            setProducts([]);
            // Очищаем выбранные товары при смене склада
            onProductsChange([]);
            // Находим выбранный склад
            const warehouse = warehouses.find(w => w.id === warehouseId);
            setSelectedWarehouse(warehouse);
            // Загружаем товары для выбранного склада
            loadProducts();
        } else {
            setProducts([]);
            setSelectedWarehouse(null);
            // Очищаем выбранные товары если склад не выбран
            onProductsChange([]);
        }
    }, [warehouseId]);

    const loadWarehouses = async () => {
        if (!districtId) return;

        setLoadingWarehouses(true);
        try {
            const response = await WarehouseService.getWarehousesByDistrict(districtId);
            const warehousesList = response.data?.warehouses || response.data || [];
            setWarehouses(warehousesList.filter(w => w.isActive));

            // Если склад уже выбран, проверяем его наличие в списке
            if (warehouseId) {
                const warehouse = warehousesList.find(w => w.id === warehouseId && w.isActive);
                if (warehouse) {
                    setSelectedWarehouse(warehouse);
                } else {
                    // Если выбранный склад не найден, сбрасываем выбор
                    onWarehouseChange(null);
                }
            }
        } catch (error) {
            logData('Ошибка загрузки складов', error);
            if (showAlertError) {
                showAlertError('Ошибка', 'Не удалось загрузить список складов', [{ text: 'OK' }]);
            } else {
                Alert.alert('Ошибка', 'Не удалось загрузить список складов');
            }
        } finally {
            setLoadingWarehouses(false);
        }
    };

    const loadProducts = async () => {
        if (!warehouseId) return;

        setLoadingProducts(true);
        try {
            const response = await WarehouseService.getWarehouseProducts(warehouseId, {
                limit: 1000
            });
            // getWarehouseProducts возвращает массив ProductStock с включенным product
            const productStocks = response.data?.products || [];
            // Фильтруем только товары в наличии (quantity > 0) и активные товары
            const productsList = productStocks
                .filter(ps => ps.quantity > 0 && ps.product?.isActive)
                .map(ps => ({
                    id: ps.product.id,
                    name: ps.product.name,
                    description: ps.product.description,
                    price: ps.product.price,
                    images: ps.product.images || [],
                    stockQuantity: ps.quantity, // Количество на складе
                    isActive: ps.product.isActive
                }));
            setProducts(productsList);
        } catch (error) {
            logData('Ошибка загрузки товаров', error);
            if (showAlertError) {
                showAlertError('Ошибка', 'Не удалось загрузить товары склада', [{ text: 'OK' }]);
            } else {
                Alert.alert('Ошибка', 'Не удалось загрузить товары склада');
            }
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleWarehouseSelect = (warehouse) => {
        // Очищаем товары и выбранные товары перед сменой склада
        setProducts([]);
        onProductsChange([]);
        setShowProductSelector(false);
        // Устанавливаем новый склад
        setSelectedWarehouse(warehouse);
        onWarehouseChange(warehouse.id);
        // Товары загрузятся автоматически через useEffect при изменении warehouseId
    };

    const handleProductToggle = (product) => {
        const existingIndex = selectedProducts.findIndex(p => p.productId === product.id);
        let newProducts;

        if (existingIndex >= 0) {
            // Удаляем товар из списка
            newProducts = selectedProducts.filter((_, index) => index !== existingIndex);
        } else {
            // Добавляем товар с количеством 1 (stopPrice будет null по умолчанию)
            newProducts = [...selectedProducts, {
                productId: product.id,
                productName: product.name, // Сохраняем название для отображения в ошибках
                quantity: 1,
                stopPrice: null // Цена для фургона (опционально)
            }];
        }

        onProductsChange(newProducts);
    };

    const handleQuantityChange = (productId, quantity) => {
        let quantityNum = parseInt(quantity) || 0;
        if (quantityNum < 1) {
            // Если количество меньше 1, удаляем товар из списка
            const newProducts = selectedProducts.filter(p => p.productId !== productId);
            onProductsChange(newProducts);
            return;
        }

        // Получаем доступное количество товара
        const availableStock = getProductStock(productId);
        
        // Валидация: количество не должно превышать доступное
        if (quantityNum > availableStock) {
            if (showAlertWarning) {
                showAlertWarning(
                    'Превышено доступное количество',
                    `Доступно только ${availableStock} коробок. Количество автоматически уменьшено до ${availableStock}.`,
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert(
                    'Превышено доступное количество',
                    `Доступно только ${availableStock} коробок. Количество автоматически уменьшено до ${availableStock}.`,
                    [{ text: 'OK' }]
                );
            }
            quantityNum = availableStock;
        }

        const newProducts = selectedProducts.map(p =>
            p.productId === productId
                ? { ...p, quantity: quantityNum }
                : p
        );

        onProductsChange(newProducts);
    };

    const handleStopPriceChange = (productId, price) => {
        // Очищаем ошибку валидации при изменении цены
        if (onPriceErrorClear && priceValidationErrors[productId]) {
            onPriceErrorClear(productId);
        }
        
        const priceNum = price === '' || price === null ? null : parseFloat(price);
        
        // Если цена пустая, устанавливаем null
        if (price === '' || price === null || isNaN(priceNum)) {
            const newProducts = selectedProducts.map(p =>
                p.productId === productId
                    ? { ...p, stopPrice: null }
                    : p
            );
            onProductsChange(newProducts);
            return;
        }

        // Валидация: цена должна быть положительной
        if (priceNum <= 0) {
            if (showAlertError) {
                showAlertError('Ошибка', 'Цена должна быть положительным числом', [{ text: 'OK' }]);
            } else {
                Alert.alert('Ошибка', 'Цена должна быть положительным числом');
            }
            return;
        }

        // Получаем информацию о товаре для валидации цены
        const product = products.find(p => p.id === productId);
        if (product) {
            // Базовая валидация: цена не должна быть слишком высокой (более чем в 3 раза от базовой)
            const basePrice = product.boxPrice || (product.price * (product.itemsPerBox || 1));
            if (basePrice && priceNum > basePrice * 3) {
                const handleConfirm = () => {
                    const newProducts = selectedProducts.map(p =>
                        p.productId === productId
                            ? { ...p, stopPrice: priceNum }
                            : p
                    );
                    onProductsChange(newProducts);
                };
                
                if (showAlertWarning) {
                    showAlertWarning(
                        'Предупреждение',
                        `Цена ${priceNum.toFixed(0)} ₽ значительно превышает базовую цену ${basePrice.toFixed(0)} ₽. Продолжить?`,
                        [
                            { text: 'Отмена', style: 'cancel' },
                            {
                                text: 'Продолжить',
                                onPress: handleConfirm
                            }
                        ]
                    );
                } else {
                    Alert.alert(
                        'Предупреждение',
                        `Цена ${priceNum.toFixed(0)} ₽ значительно превышает базовую цену ${basePrice.toFixed(0)} ₽. Продолжить?`,
                        [
                            { text: 'Отмена', style: 'cancel' },
                            {
                                text: 'Продолжить',
                                onPress: handleConfirm
                            }
                        ]
                    );
                }
                return;
            }
        }

        const newProducts = selectedProducts.map(p =>
            p.productId === productId
                ? { ...p, stopPrice: priceNum }
                : p
        );

        onProductsChange(newProducts);
    };

    const getProductStock = (productId) => {
        // Находим товар в списке и получаем его остаток
        const product = products.find(p => p.id === productId);
        return product?.stockQuantity || 0;
    };

    const isProductSelected = (productId) => {
        return selectedProducts.some(p => p.productId === productId);
    };

    const getSelectedProductQuantity = (productId) => {
        const selected = selectedProducts.find(p => p.productId === productId);
        return selected?.quantity || 0;
    };

    if (!districtId) {
        return (
            <View style={styles.container}>
                <Text style={styles.hint}>
                    Выберите район для загрузки складов
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Склад *</Text>
            {loadingWarehouses ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={Color.blue2} />
                    <Text style={styles.loadingText}>Загрузка складов...</Text>
                </View>
            ) : warehouses.length === 0 ? (
                <Text style={styles.hint}>Нет доступных складов в выбранном районе</Text>
            ) : (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.warehousesScroll}
                >
                    {warehouses.map(warehouse => (
                        <TouchableOpacity
                            key={warehouse.id}
                            style={[
                                styles.warehouseButton,
                                selectedWarehouse?.id === warehouse.id && styles.warehouseButtonSelected
                            ]}
                            onPress={() => handleWarehouseSelect(warehouse)}
                        >
                            <Text
                                style={[
                                    styles.warehouseButtonText,
                                    selectedWarehouse?.id === warehouse.id && styles.warehouseButtonTextSelected
                                ]}
                            >
                                {warehouse.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            {selectedWarehouse && (
                <View style={styles.productsSection}>
                    <View style={styles.productsHeader}>
                        <View style={styles.labelContainer}>
                            <Text style={styles.label}>Товары</Text>
                            <Text style={styles.warehouseHint}>
                                Склад: {selectedWarehouse.name}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.toggleButton}
                            onPress={() => setShowProductSelector(!showProductSelector)}
                        >
                            <Text style={styles.toggleButtonText}>
                                {showProductSelector ? 'Скрыть' : 'Выбрать товары'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {showProductSelector && (
                        <View style={styles.productsContainer}>
                            {loadingProducts ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="small" color={Color.blue2} />
                                    <Text style={styles.loadingText}>Загрузка товаров...</Text>
                                </View>
                            ) : products.length === 0 ? (
                                <View style={styles.emptyProductsContainer}>
                                    <Text style={styles.hint}>
                                        На складе "{selectedWarehouse.name}" нет товаров в наличии
                                    </Text>
                                </View>
                            ) : (
                                <ScrollView 
                                    style={styles.productsList}
                                    nestedScrollEnabled={true}
                                    showsVerticalScrollIndicator={true}
                                    bounces={true}
                                    scrollEnabled={true}
                                >
                                    {products.map(product => {
                                        const isSelected = isProductSelected(product.id);
                                        const stockQuantity = getProductStock(product.id);
                                        const selectedQuantity = getSelectedProductQuantity(product.id);

                                        return (
                                            <View
                                                key={product.id}
                                                style={[
                                                    styles.productItem,
                                                    isSelected && styles.productItemSelected
                                                ]}
                                            >
                                                <TouchableOpacity
                                                    style={styles.productInfo}
                                                    onPress={() => handleProductToggle(product)}
                                                >
                                                    <View style={styles.productDetails}>
                                                        <Text style={styles.productName}>
                                                            {product.name}
                                                        </Text>
                                                        <Text style={styles.productStock}>
                                                            В наличии: {stockQuantity} коробок
                                                        </Text>
                                                    </View>
                                                    <View style={styles.checkbox}>
                                                        {isSelected && (
                                                            <View style={styles.checkboxInner} />
                                                        )}
                                                    </View>
                                                </TouchableOpacity>

                                                {isSelected && (
                                                    <View style={styles.quantityContainer}>
                                                        <Text style={styles.quantityLabel}>
                                                            Количество (коробок):
                                                        </Text>
                                                        <TextInput
                                                            style={styles.quantityInput}
                                                            value={selectedQuantity.toString()}
                                                            onChangeText={(text) =>
                                                                handleQuantityChange(product.id, text)
                                                            }
                                                            keyboardType="numeric"
                                                            placeholder="1"
                                                            maxLength={4}
                                                        />
                                                        <Text style={styles.quantityHint}>
                                                            Макс: {stockQuantity} {stockQuantity === 0 && '(товар отсутствует на складе)'}
                                                        </Text>
                                                        {selectedQuantity > stockQuantity && (
                                                            <Text style={styles.quantityWarning}>
                                                                ⚠️ Превышено доступное количество!
                                                            </Text>
                                                        )}
                                                        
                                                        {/* Поле для цены фургона (только для админов) */}
                                                        {isAdmin && (
                                                            <>
                                                                <Text style={styles.priceLabel}>
                                                                    Цена для фургона (₽, опционально):
                                                                </Text>
                                                                <TextInput
                                                                    style={[
                                                                        styles.priceInput,
                                                                        priceValidationErrors[product.id] && styles.priceInputError
                                                                    ]}
                                                                    value={
                                                                        selectedProducts.find(p => p.productId === product.id)?.stopPrice?.toString() || ''
                                                                    }
                                                                    onChangeText={(text) =>
                                                                        handleStopPriceChange(product.id, text)
                                                                    }
                                                                    keyboardType="decimal-pad"
                                                                    placeholder="Автоматически"
                                                                    maxLength={10}
                                                                />
                                                                {priceValidationErrors[product.id] ? (
                                                                    <Text style={styles.priceError}>
                                                                        {priceValidationErrors[product.id]}
                                                                    </Text>
                                                                ) : (
                                                                    <Text style={styles.priceHint}>
                                                                        Если не указана, будет использована цена склада или базовая цена
                                                                    </Text>
                                                                )}
                                                            </>
                                                        )}
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </View>
                    )}

                    {selectedProducts.length > 0 && (
                        <View style={styles.selectedProductsSummary}>
                            <Text style={styles.summaryTitle}>
                                Выбрано товаров: {selectedProducts.length}
                            </Text>
                            {selectedProducts.map(selected => {
                                const product = products.find(p => p.id === selected.productId);
                                return (
                                    <Text key={selected.productId} style={styles.summaryItem}>
                                        • {product?.name || `Товар #${selected.productId}`}: {selected.quantity} коробок
                                    </Text>
                                );
                            })}
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: normalize(20),
    },
    label: {
        fontSize: normalizeFont(16),
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.dark,
        marginBottom: normalize(8),
    },
    hint: {
        fontSize: normalizeFont(14),
        fontFamily: FontFamily.sFProText,
        color: Color.gray,
        fontStyle: 'italic',
        marginTop: normalize(8),
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: normalize(12),
    },
    loadingText: {
        marginLeft: normalize(8),
        fontSize: normalizeFont(14),
        fontFamily: FontFamily.sFProText,
        color: Color.gray,
    },
    warehousesScroll: {
        marginBottom: normalize(16),
    },
    warehouseButton: {
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(10),
        borderRadius: Border.br_3xs,
        backgroundColor: Color.colorLightMode,
        borderWidth: 1,
        borderColor: Color.grayLight,
        marginRight: normalize(8),
    },
    warehouseButtonSelected: {
        backgroundColor: Color.blue2,
        borderColor: Color.blue2,
    },
    warehouseButtonText: {
        fontSize: normalizeFont(14),
        fontFamily: FontFamily.sFProText,
        color: Color.dark,
    },
    warehouseButtonTextSelected: {
        color: Color.colorLightMode,
        fontWeight: '600',
    },
    productsSection: {
        marginTop: normalize(16),
    },
    productsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: normalize(8),
    },
    labelContainer: {
        flex: 1,
        marginRight: normalize(8),
    },
    warehouseHint: {
        fontSize: normalizeFont(12),
        fontFamily: FontFamily.sFProText,
        color: Color.gray,
        marginTop: normalize(2),
        fontStyle: 'italic',
    },
    emptyProductsContainer: {
        padding: normalize(16),
        alignItems: 'center',
    },
    toggleButton: {
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(6),
        borderRadius: Border.br_3xs,
        backgroundColor: Color.blue2,
    },
    toggleButtonText: {
        fontSize: normalizeFont(12),
        fontFamily: FontFamily.sFProText,
        color: Color.colorLightMode,
        fontWeight: '600',
    },
    productsContainer: {
        maxHeight: normalize(400),
        borderWidth: 1,
        borderColor: Color.grayLight,
        borderRadius: Border.br_3xs,
        backgroundColor: Color.colorLightMode,
        overflow: 'hidden',
    },
    productsList: {
        padding: normalize(8),
        flexGrow: 0,
    },
    productItem: {
        marginBottom: normalize(8),
        borderWidth: 1,
        borderColor: Color.grayLight,
        borderRadius: Border.br_3xs,
        backgroundColor: Color.colorLightMode,
    },
    productItemSelected: {
        borderColor: Color.blue2,
        backgroundColor: Color.blueLight,
    },
    productInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: normalize(12),
    },
    productDetails: {
        flex: 1,
    },
    productName: {
        fontSize: normalizeFont(14),
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.dark,
        marginBottom: normalize(4),
    },
    productStock: {
        fontSize: normalizeFont(12),
        fontFamily: FontFamily.sFProText,
        color: Color.gray,
    },
    checkbox: {
        width: normalize(24),
        height: normalize(24),
        borderWidth: 2,
        borderColor: Color.blue2,
        borderRadius: normalize(12), // Половина от width/height для идеального круга
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: normalize(12),
    },
    checkboxInner: {
        width: normalize(14),
        height: normalize(14),
        backgroundColor: Color.blue2,
        borderRadius: normalize(7), // Половина от width/height для идеального круга
    },
    quantityContainer: {
        padding: normalize(12),
        paddingTop: 0,
        borderTopWidth: 1,
        borderTopColor: Color.grayLight,
    },
    quantityLabel: {
        fontSize: normalizeFont(12),
        fontFamily: FontFamily.sFProText,
        color: Color.dark,
        marginBottom: normalize(4),
    },
    quantityInput: {
        borderWidth: 1,
        borderColor: Color.grayLight,
        borderRadius: Border.br_3xs,
        padding: normalize(8),
        fontSize: normalizeFont(14),
        fontFamily: FontFamily.sFProText,
        color: Color.dark,
        backgroundColor: Color.colorLightMode,
    },
    quantityHint: {
        fontSize: normalizeFont(10),
        fontFamily: FontFamily.sFProText,
        color: Color.gray,
        marginTop: normalize(4),
    },
    priceLabel: {
        fontSize: normalizeFont(12),
        fontFamily: FontFamily.sFProText,
        color: Color.dark,
        marginTop: normalize(12),
        marginBottom: normalize(4),
    },
    priceInput: {
        borderWidth: 1,
        borderColor: Color.grayLight,
        borderRadius: Border.br_3xs,
        padding: normalize(8),
        fontSize: normalizeFont(14),
        fontFamily: FontFamily.sFProText,
        color: Color.dark,
        backgroundColor: Color.colorLightMode,
    },
    priceInputError: {
        borderColor: '#FF3B30',
        borderWidth: 1.5,
        backgroundColor: '#FFF5F5',
    },
    priceHint: {
        fontSize: normalizeFont(10),
        fontFamily: FontFamily.sFProText,
        color: Color.gray,
        marginTop: normalize(4),
        fontStyle: 'italic',
    },
    priceError: {
        fontSize: normalizeFont(11),
        fontFamily: FontFamily.sFProText,
        color: '#FF3B30',
        marginTop: normalize(4),
        fontWeight: '500',
    },
    quantityWarning: {
        fontSize: normalizeFont(11),
        fontFamily: FontFamily.sFProText,
        color: '#FF6B6B',
        marginTop: normalize(4),
        fontWeight: '600',
    },
    selectedProductsSummary: {
        marginTop: normalize(12),
        padding: normalize(12),
        backgroundColor: Color.blueLight,
        borderRadius: Border.br_3xs,
    },
    summaryTitle: {
        fontSize: normalizeFont(14),
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.dark,
        marginBottom: normalize(4),
    },
    summaryItem: {
        fontSize: normalizeFont(12),
        fontFamily: FontFamily.sFProText,
        color: Color.dark,
        marginTop: normalize(2),
    },
});

