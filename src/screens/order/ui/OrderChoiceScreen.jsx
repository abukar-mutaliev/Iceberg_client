import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    Modal,
    Image,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import { useOrderChoice } from '@entities/order';
import {
    OrderAlternativesApi,
    ALTERNATIVE_TYPE_LABELS,
    ALTERNATIVE_TYPE_ICONS,
    ALTERNATIVE_TYPE_COLORS,
    CHOICE_TYPE_LABELS
} from '@entities/order';
import { getImageUrl } from '@shared/api/api';
import { fetchCart } from '@entities/cart';
import { useCustomAlert } from '@shared/ui/CustomAlert';

const normalize = (size) => {
    const scale = 375 / 375;
    return Math.round(size * scale);
};

const { width, height } = Dimensions.get('window');

// Форматирование суммы
const formatAmount = (amount, currency = 'RUB') => {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency
    }).format(amount || 0);
};

// Форматирование номера заказа
const formatOrderNumber = (orderNumber) => {
    if (!orderNumber) return '';
    if (orderNumber.startsWith('ORD-')) {
        return orderNumber;
    }
    return `№${orderNumber}`;
};

export const OrderChoiceScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const { choiceId, orderId, allChoices } = route.params || {};

    // Хуки
    const {
        choiceDetails,
        loading,
        error,
        loadChoiceDetails,
        clearError
    } = useOrderChoice(choiceId);
    
    // Custom Alert (используем глобальный через Provider)
    const { showAlert, showError, showConfirm, hideAlert } = useCustomAlert();

    // Локальное состояние
    const [selectedAlternativeId, setSelectedAlternativeId] = useState(null);
    const [responding, setResponding] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showProductsModal, setShowProductsModal] = useState(false);
    const [availableProducts, setAvailableProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [selectedProductQuantity, setSelectedProductQuantity] = useState(1);
    const [selectedProducts, setSelectedProducts] = useState({}); // {productId: {product, quantity}}
    const [selectedProductsToRemove, setSelectedProductsToRemove] = useState(new Set()); // ID товаров для удаления
    const [isChoiceProcessed, setIsChoiceProcessed] = useState(false); // Флаг обработанного предложения
    const [isDeletionRequestSent, setIsDeletionRequestSent] = useState(false); // Флаг отправленного запроса на удаление

    // Проверяем срок действия предложения
    const isExpired = choiceDetails?.expiresAt && new Date(choiceDetails.expiresAt) < new Date();
    const timeLeft = choiceDetails?.expiresAt ? 
        Math.max(0, new Date(choiceDetails.expiresAt) - new Date()) : 0;
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    /**
     * Получение информации о товаре из заказа
     */
    const getProductInfo = useCallback(() => {
        if (!choiceDetails?.order) return null;

        // Пытаемся найти товар в orderItems
        if (choiceDetails.order.orderItems && choiceDetails.order.orderItems.length > 0) {
            const orderItem = choiceDetails.order.orderItems[0];
            if (orderItem.product) {
                return {
                    name: orderItem.product.name,
                    image: orderItem.product.images?.[0] || orderItem.product.image || orderItem.product.imageUrl,
                    price: orderItem.product.price,
                    boxPrice: orderItem.product.boxPrice
                };
            }
        }

        // Пытаемся найти товар в items
        if (choiceDetails.order.items && choiceDetails.order.items.length > 0) {
            const orderItem = choiceDetails.order.items[0];
            if (orderItem.product) {
                return {
                    name: orderItem.product.name,
                    image: orderItem.product.images?.[0] || orderItem.product.image || orderItem.product.imageUrl,
                    price: orderItem.product.price,
                    boxPrice: orderItem.product.boxPrice
                };
            }
        }

        return null;
    }, [choiceDetails]);

    /**
     * Подсчет общего количества товаров (штук) в заказе
     */
    const getTotalItemsCount = useCallback(() => {
        if (!choiceDetails?.order) return 0;

        // Пытаемся подсчитать из orderItems
        if (choiceDetails.order.orderItems && choiceDetails.order.orderItems.length > 0) {
            return choiceDetails.order.orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
        }

        // Пытаемся подсчитать из items
        if (choiceDetails.order.items && choiceDetails.order.items.length > 0) {
            return choiceDetails.order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        }

        return 0;
    }, [choiceDetails]);

    /**
     * Подсчет количества коробов (уникальных позиций) в заказе
     */
    const getTotalBoxesCount = useCallback(() => {
        if (!choiceDetails?.order) return 0;

        // Пытаемся подсчитать из orderItems
        if (choiceDetails.order.orderItems && choiceDetails.order.orderItems.length > 0) {
            return choiceDetails.order.orderItems.length;
        }

        // Пытаемся подсчитать из items
        if (choiceDetails.order.items && choiceDetails.order.items.length > 0) {
            return choiceDetails.order.items.length;
        }

        return 0;
    }, [choiceDetails]);

    /**
     * Получение изображения товара с правильным URL
     */
    const getProductImage = useCallback((imageUrl) => {
        if (!imageUrl) {
            return null;
        }
        
        // Если уже полный URL
        if (imageUrl.startsWith('http') || imageUrl.startsWith('https')) {
            return { uri: imageUrl };
        }
        
        // Нормализуем путь: заменяем обратные слеши на прямые
        const normalizedPath = imageUrl.replace(/\\/g, '/');
        
        const fullUrl = getImageUrl(normalizedPath);
        return { uri: fullUrl };
    }, []);

    /**
     * Обработка выбора альтернативы
     */
    const handleAlternativeSelect = useCallback((alternativeId, autoSelect = false) => {
        setSelectedAlternativeId(alternativeId);
        
        // Очищаем выбранные товары при выборе других альтернатив
        setSelectedProducts({});
        
        // Если выбрана альтернатива REMOVE_UNAVAILABLE и это НЕ автоматический выбор, 
        // автоматически выбираем все недоступные товары
        const selectedAlternative = choiceDetails?.alternatives?.find(alt => alt.id === alternativeId);
        if (selectedAlternative?.alternativeType === 'REMOVE_UNAVAILABLE' && !autoSelect && choiceDetails?.unavailableItems) {
            const allUnavailableIds = new Set(choiceDetails.unavailableItems.map(item => item.productId));
            setSelectedProductsToRemove(allUnavailableIds);
        } else if (selectedAlternative?.alternativeType !== 'REMOVE_UNAVAILABLE') {
            // Очищаем выбранные товары только если выбрана другая альтернатива
            setSelectedProductsToRemove(new Set());
        }
    }, [choiceDetails]);
    
    /**
     * Переключение выбора товара для удаления
     */
    const handleToggleProductToRemove = useCallback((productId) => {
        setSelectedProductsToRemove(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) {
                newSet.delete(productId);
            } else {
                newSet.add(productId);
            }
            return newSet;
        });
    }, []);

    /**
     * Быстрое удаление недоступных товаров и продолжение оформления
     */
    const handleQuickRemoveAndContinue = useCallback(async () => {
        // Проверяем, не обработано ли уже предложение
        if (isChoiceProcessed) {
            console.log('⚠️ Предложение уже обработано, игнорируем повторный запрос');
            showError('Ошибка', 'Это предложение уже было обработано');
            return;
        }

        // Проверяем, не был ли уже отправлен запрос на удаление
        if (isDeletionRequestSent) {
            console.log('⚠️ Запрос на удаление уже был отправлен. Выберите товары на замену или вернитесь к корзине.');
            showError('Товары уже удалены', 'Товары уже были удалены из заказа. Выберите похожие товары на замену или вернитесь к корзине.');
            return;
        }

        // Проверяем, не выполняется ли уже запрос
        if (responding) {
            console.log('⚠️ Запрос уже выполняется, игнорируем повторное нажатие');
            return;
        }

        try {
            setResponding(true);

            console.log('🗑️ handleQuickRemoveAndContinue: Начало удаления', {
                choiceDetails: !!choiceDetails,
                alternativesCount: choiceDetails?.alternatives?.length,
                alternatives: choiceDetails?.alternatives?.map(alt => ({
                    id: alt.id,
                    type: alt.alternativeType,
                    description: alt.description
                }))
            });

            // Определяем товары для удаления
            let productsToRemove = Array.from(selectedProductsToRemove);
            
            // Если не выбрано ни одного товара - удаляем все недоступные
            if (productsToRemove.length === 0) {
                if (!choiceDetails?.unavailableItems || choiceDetails.unavailableItems.length === 0) {
                    showError('Ошибка', 'Нет товаров для удаления');
                    setResponding(false);
                    return;
                }
                productsToRemove = choiceDetails.unavailableItems.map(item => item.productId);
            }

            // Находим альтернативу REMOVE_UNAVAILABLE
            const removeAlternative = choiceDetails?.alternatives?.find(
                alt => alt.alternativeType === 'REMOVE_UNAVAILABLE'
            );

            console.log('🔍 Поиск альтернативы REMOVE_UNAVAILABLE:', {
                found: !!removeAlternative,
                removeAlternative: removeAlternative ? {
                    id: removeAlternative.id,
                    type: removeAlternative.alternativeType,
                    description: removeAlternative.description
                } : null,
                allAlternativeTypes: choiceDetails?.alternatives?.map(alt => alt.alternativeType)
            });

            if (!removeAlternative) {
                console.error('❌ Альтернатива REMOVE_UNAVAILABLE не найдена!', {
                    availableAlternatives: choiceDetails?.alternatives?.map(alt => ({
                        id: alt.id,
                        type: alt.alternativeType,
                        description: alt.description
                    }))
                });
                showError(
                    'Ошибка',
                    'Опция удаления товаров недоступна. Возможно, не применена миграция БД на сервере.\n\nДоступные альтернативы:\n' + 
                    (choiceDetails?.alternatives?.map(alt => `- ${alt.alternativeType}`).join('\n') || 'нет')
                );
                setResponding(false);
                return;
            }

            console.log('🗑️ Быстрое удаление товаров:', {
                productsToRemove,
                alternativeId: removeAlternative.id
            });

            // ПРОВЕРЯЕМ ЗАРАНЕЕ: приведет ли удаление к пустому заказу?
            // Получаем все товары из заказа (проверяем и orderItems и items)
            const allOrderItems = choiceDetails?.order?.orderItems || choiceDetails?.order?.items || [];
            const currentItemsCount = allOrderItems.length;
            const availableItemsCount = allOrderItems.filter(
                item => !productsToRemove.includes(item.productId)
            ).length || 0;
            
            const willBeEmpty = availableItemsCount === 0;
            
            console.log('🔍 Проверка перед удалением:', {
                currentItemsCount,
                productsToRemoveCount: productsToRemove.length,
                availableItemsCount,
                allOrderItemsCount: allOrderItems.length,
                allOrderItemsIds: allOrderItems.map(i => i.productId),
                productsToRemove,
                willBeEmpty
            });

            // Если заказ станет пустым - сначала спросим что делать
            if (willBeEmpty) {
                console.log('⚠️ Удаление приведет к пустому заказу - спрашиваем что делать');
                
                // Проверяем, есть ли альтернативные товары для замены или ожидание
                const hasSubstituteAlternatives = choiceDetails?.alternatives?.some(
                    alt => alt.alternativeType === 'SUBSTITUTE'
                );
                const hasWaitStockAlternative = choiceDetails?.alternatives?.some(
                    alt => alt.alternativeType === 'WAIT_STOCK'
                );
                
                setResponding(false);
                
                if (hasSubstituteAlternatives || hasWaitStockAlternative) {
                    // Есть альтернативы - предлагаем выбрать
                    // Порядок кнопок: основные действия вверху, деструктивное внизу
                    const buttons = [];
                    
                    if (hasSubstituteAlternatives) {
                        buttons.push({
                            text: 'Выбрать похожие товары',
                            style: 'primary',
                            icon: 'swap-horiz',
                            onPress: () => {
                                handleShowAlternativeProducts();
                            }
                        });
                    }
                    
                    if (hasWaitStockAlternative) {
                        buttons.push({
                            text: 'Подождать поступления',
                            style: 'primary',
                            icon: 'schedule',
                            onPress: () => {
                                console.log('🕐 Пользователь выбрал "Подождать поступления" из Alert');
                                // Автоматически выбираем альтернативу WAIT_STOCK
                                const waitStockAlt = choiceDetails?.alternatives?.find(
                                    alt => alt.alternativeType === 'WAIT_STOCK'
                                );
                                if (waitStockAlt) {
                                    console.log('✅ Найдена альтернатива WAIT_STOCK:', {
                                        id: waitStockAlt.id,
                                        description: waitStockAlt.description
                                    });
                                    setSelectedAlternativeId(waitStockAlt.id);
                                    // Небольшая задержка для корректного обновления состояния
                                    setTimeout(() => {
                                        setShowConfirmModal(true);
                                    }, 100);
                                } else {
                                    console.error('❌ Альтернатива WAIT_STOCK не найдена!');
                                    showError('Ошибка', 'Опция ожидания не найдена');
                                }
                            }
                        });
                    }
                    
                    // Деструктивное действие в конце
                    buttons.push({
                        text: 'Удалить и вернуться',
                        style: 'destructive',
                        icon: 'delete',
                        onPress: async () => {
                            // Теперь удаляем товары и возвращаемся к корзине
                            setResponding(true);
                            try {
                                const deleteResult = await OrderAlternativesApi.respondToChoice(
                                    choiceId,
                                    'ACCEPTED',
                                    removeAlternative.id,
                                    {
                                        selectedAlternativeId: removeAlternative.id,
                                        unavailableProductIds: productsToRemove
                                    }
                                );
                                
                                if (deleteResult.success) {
                                    setIsChoiceProcessed(true);
                                    setIsDeletionRequestSent(true);
                                    navigation.navigate('Main', { 
                                        screen: 'Cart'
                                    });
                                }
                            } catch (err) {
                                console.error('❌ Ошибка удаления:', err);
                                showError('Ошибка', err.message || 'Не удалось удалить товары');
                            } finally {
                                setResponding(false);
                            }
                        }
                    });
                    
                    showAlert({
                        type: 'warning',
                        title: 'В заказе не останется товаров',
                        message: `После удаления ${productsToRemove.length} недоступных товаров в заказе не останется товаров для оплаты.\n\nВыберите действие:`,
                        buttons: buttons
                    });
                } else {
                    // Нет альтернатив - только удаление и возврат к корзине
                    showAlert({
                        type: 'warning',
                        title: 'В заказе не останется товаров',
                        message: 'После удаления недоступных товаров в заказе не останется товаров для оплаты.',
                        buttons: [
                            {
                                text: 'Удалить и вернуться к корзине',
                                style: 'primary',
                                icon: 'shopping-cart',
                                onPress: async () => {
                                    setResponding(true);
                                    try {
                                        const deleteResult = await OrderAlternativesApi.respondToChoice(
                                            choiceId,
                                            'ACCEPTED',
                                            removeAlternative.id,
                                            {
                                                selectedAlternativeId: removeAlternative.id,
                                                unavailableProductIds: productsToRemove
                                            }
                                        );
                                        
                                        if (deleteResult.success) {
                                            setIsChoiceProcessed(true);
                                            setIsDeletionRequestSent(true);
                                            navigation.navigate('Main', { 
                                                screen: 'Cart'
                                            });
                                        }
                                    } catch (err) {
                                        console.error('❌ Ошибка удаления:', err);
                                        showError('Ошибка', err.message || 'Не удалось удалить товары');
                                    } finally {
                                        setResponding(false);
                                    }
                                }
                            }
                        ]
                    });
                }
                
                return; // НЕ отправляем запрос на удаление
            }

            // Если товары останутся - удаляем как обычно
            const result = await OrderAlternativesApi.respondToChoice(
                choiceId,
                'ACCEPTED',
                removeAlternative.id,
                {
                    selectedAlternativeId: removeAlternative.id,
                    unavailableProductIds: productsToRemove
                }
            );

            if (result.success) {
                // Помечаем предложение как обработанное и запрос на удаление как отправленный
                setIsChoiceProcessed(true);
                setIsDeletionRequestSent(true);
                
                const orderIdToUse = choiceDetails?.order?.id || orderId;
                const orderNumberToUse = choiceDetails?.order?.orderNumber || choiceDetails?.orderNumber;
                const totalAmountToUse = result.data?.newTotalAmount || result.newTotalAmount || choiceDetails?.order?.totalAmount;
                
                if (!orderIdToUse) {
                    console.error('❌ Ошибка: orderId не найден ни в choiceDetails, ни в route.params');
                    showError('Ошибка', 'Не удалось определить ID заказа для оплаты');
                    setResponding(false);
                    return;
                }
                
                // Переход к оплате оставшихся товаров
                navigation.navigate('PaymentScreen', {
                    orderId: orderIdToUse,
                    orderNumber: orderNumberToUse,
                    totalAmount: totalAmountToUse,
                    usePreauthorization: false,
                    returnScreen: 'MyOrders'
                });
            } else {
                throw new Error(result.error || 'Не удалось удалить товары');
            }
        } catch (err) {
            console.error('❌ Ошибка быстрого удаления:', err);
            
            // Проверяем, не обработано ли уже предложение
            if (err.message && err.message.includes('Предложение уже обработано')) {
                console.log('⚠️ Получена ошибка "Предложение уже обработано", устанавливаем флаг');
                setIsChoiceProcessed(true);
                showError(
                    'Предложение обработано',
                    'Это предложение уже было обработано ранее. Пожалуйста, обновите список заказов.',
                    [
                        {
                            text: 'Вернуться к заказам',
                            style: 'primary',
                            icon: 'arrow-back',
                            onPress: () => {
                                navigation.navigate('MyOrders');
                            }
                        }
                    ]
                );
            } else if (err.isCriticalOperation) {
                // Специальная обработка для критичных операций (истек токен)
                showAlert({
                    type: 'error',
                    title: 'Сессия истекла',
                    message: 'Ваша сессия истекла. Пожалуйста, войдите снова для продолжения оформления заказа.',
                    buttons: [
                        {
                            text: 'Отмена',
                            style: 'cancel'
                        },
                        {
                            text: 'Войти',
                            style: 'primary',
                            icon: 'login',
                            onPress: () => {
                                navigation.navigate('Auth');
                            }
                        }
                    ]
                });
            } else {
                showError('Ошибка', err.message || 'Не удалось удалить товары');
            }
        } finally {
            setResponding(false);
        }
    }, [choiceId, orderId, choiceDetails, selectedProductsToRemove, navigation, showAlert, showError, handleShowAlternativeProducts, isChoiceProcessed, responding, isDeletionRequestSent]);

    /**
     * Подтверждение выбора
     */
    const handleConfirmChoice = useCallback(async () => {
        // Проверяем, не обработано ли уже предложение
        if (isChoiceProcessed) {
            console.log('⚠️ Предложение уже обработано, игнорируем повторный запрос');
            showError('Ошибка', 'Это предложение уже было обработано');
            return;
        }

        // Проверяем, не выполняется ли уже запрос
        if (responding) {
            console.log('⚠️ Запрос уже выполняется, игнорируем повторное нажатие');
            return;
        }

        // Проверяем, что выбран хотя бы один вариант
        if (!selectedAlternativeId) {
            showError('Ошибка', 'Выберите один из предложенных вариантов');
            return;
        }

        // Для SUBSTITUTE альтернатив проверяем, что выбраны товары
        const selectedAlternative = choiceDetails?.alternatives?.find(
            alt => alt.id === selectedAlternativeId
        );

        if (selectedAlternative?.alternativeType === 'SUBSTITUTE' && Object.keys(selectedProducts).length === 0) {
            showError('Ошибка', 'Выберите товары для замены');
            return;
        }

        try {
            setResponding(true);

            console.log('🔍 Отладка выбора альтернативы:', {
                selectedAlternativeId,
                alternativeType: selectedAlternative?.alternativeType,
                selectedProducts: Object.keys(selectedProducts),
                alternatives: choiceDetails?.alternatives?.map(alt => ({
                    id: alt.id,
                    productId: alt.productId,
                    alternativeType: alt.alternativeType
                }))
            });
            
            console.log('🔍 Найденная альтернатива:', selectedAlternative);
            
            // Подготавливаем данные для ответа
            let responseData = {
                selectedAlternativeId: selectedAlternative?.id
            };
            
            if (selectedAlternative?.alternativeType === 'SUBSTITUTE') {
                // Подготавливаем данные для замены товаров
                const substitutedItems = [];
                const unavailableItems = choiceDetails?.unavailableItems || [];
                
                // Если есть выбранные товары в модальном окне
                if (Object.keys(selectedProducts).length > 0) {
                    console.log('🔍 Отладка замены товаров:', {
                        selectedProducts,
                        unavailableItems,
                        availableProducts: availableProducts.map(alt => ({
                            id: alt.id,
                            productId: alt.productId,
                            description: alt.description
                        }))
                    });
                    
                    // Используем выбранные товары из модального окна
                    for (const [alternativeId, productData] of Object.entries(selectedProducts)) {
                        // alternativeId здесь - это ID альтернативы
                        // productData.alternative содержит всю информацию об альтернативе
                        const substituteAlternative = productData.alternative;
                        
                        if (substituteAlternative) {
                            console.log('🔍 Найдена альтернатива:', {
                                alternativeId,
                                substituteAlternative: {
                                    id: substituteAlternative.id,
                                    productId: substituteAlternative.productId,
                                    originalProductId: substituteAlternative.originalProductId,
                                    description: substituteAlternative.description
                                }
                            });
                            
                            // Используем originalProductId из альтернативы
                            if (substituteAlternative.originalProductId) {
                                substitutedItems.push({
                                    originalProductId: substituteAlternative.originalProductId,
                                    newProductId: productData.product.id,
                                    newPrice: productData.product.price,
                                    quantity: productData.quantity
                                });
                                console.log('✅ Добавлена замена:', {
                                    originalProductId: substituteAlternative.originalProductId,
                                    newProductId: productData.product.id,
                                    newPrice: productData.product.price,
                                    quantity: productData.quantity
                                });
                            } else {
                                console.log('❌ У альтернативы нет originalProductId:', substituteAlternative);
                            }
                        } else {
                            console.log('❌ Альтернатива не найдена для alternativeId:', alternativeId);
                        }
                    }
                } else {
                    // Используем старую логику для обратной совместимости
                    const originalProduct = unavailableItems.find(item => 
                        item.productName && selectedAlternative.description.includes(item.productName)
                    );
                    
                    if (originalProduct && selectedAlternative.product) {
                        substitutedItems.push({
                            originalProductId: originalProduct.productId,
                            newProductId: selectedAlternative.product.id,
                            newPrice: selectedAlternative.product.price,
                            quantity: selectedProductQuantity
                        });
                    }
                }
                
                console.log('🔍 Итоговые данные для замены:', {
                    substitutedItemsCount: substitutedItems.length,
                    substitutedItems
                });
                
                if (substitutedItems.length > 0) {
                    responseData.substitutedItems = substitutedItems;
                }
            }
            
            // Для REMOVE_UNAVAILABLE передаем выбранные товары на удаление
            if (selectedAlternative?.alternativeType === 'REMOVE_UNAVAILABLE') {
                if (selectedProductsToRemove.size === 0) {
                    showError('Ошибка', 'Выберите товары для удаления');
                    setResponding(false);
                    return;
                }
                
                // ПРОВЕРЯЕМ ЗАРАНЕЕ: приведет ли удаление к пустому заказу?
                const productsToRemove = Array.from(selectedProductsToRemove);
                // Получаем все товары из заказа (проверяем и orderItems и items)
                const allOrderItems = choiceDetails?.order?.orderItems || choiceDetails?.order?.items || [];
                const currentItemsCount = allOrderItems.length;
                const availableItemsCount = allOrderItems.filter(
                    item => !productsToRemove.includes(item.productId)
                ).length || 0;
                
                const willBeEmpty = availableItemsCount === 0;
                
                console.log('🔍 Проверка перед удалением (handleConfirmChoice):', {
                    currentItemsCount,
                    productsToRemoveCount: productsToRemove.length,
                    availableItemsCount,
                    allOrderItemsCount: allOrderItems.length,
                    allOrderItemsIds: allOrderItems.map(i => i.productId),
                    productsToRemove,
                    willBeEmpty
                });

                // Если заказ станет пустым - НЕ отправляем запрос, спрашиваем что делать
                if (willBeEmpty) {
                    console.log('⚠️ Удаление приведет к пустому заказу - спрашиваем что делать (из handleConfirmChoice)');
                    setResponding(false);
                    setShowConfirmModal(false);
                    
                    // Проверяем, есть ли альтернативные товары для замены или ожидание
                    const hasSubstituteAlternatives = choiceDetails?.alternatives?.some(
                        alt => alt.alternativeType === 'SUBSTITUTE'
                    );
                    const hasWaitStockAlternative = choiceDetails?.alternatives?.some(
                        alt => alt.alternativeType === 'WAIT_STOCK'
                    );
                    
                    if (hasSubstituteAlternatives || hasWaitStockAlternative) {
                        // Есть альтернативы - предлагаем выбрать
                        const buttons = [];
                        
                        if (hasSubstituteAlternatives) {
                            buttons.push({
                                text: 'Выбрать похожие товары',
                                style: 'primary',
                                icon: 'swap-horiz',
                                onPress: () => {
                                    handleShowAlternativeProducts();
                                }
                            });
                        }
                        
                        if (hasWaitStockAlternative) {
                            buttons.push({
                                text: 'Подождать поступления',
                                style: 'primary',
                                icon: 'schedule',
                                onPress: () => {
                                    console.log('🕐 Пользователь выбрал "Подождать поступления" из Alert (handleConfirmChoice)');
                                    const waitStockAlt = choiceDetails?.alternatives?.find(
                                        alt => alt.alternativeType === 'WAIT_STOCK'
                                    );
                                    if (waitStockAlt) {
                                        console.log('✅ Найдена альтернатива WAIT_STOCK:', {
                                            id: waitStockAlt.id,
                                            description: waitStockAlt.description
                                        });
                                        setSelectedAlternativeId(waitStockAlt.id);
                                        setTimeout(() => {
                                            setShowConfirmModal(true);
                                        }, 100);
                                    } else {
                                        console.error('❌ Альтернатива WAIT_STOCK не найдена!');
                                        showError('Ошибка', 'Опция ожидания не найдена');
                                    }
                                }
                            });
                        }
                        
                        // Деструктивное действие в конце
                        buttons.push({
                            text: 'Удалить и вернуться',
                            style: 'destructive',
                            icon: 'delete',
                            onPress: async () => {
                                // Теперь удаляем товары и возвращаемся к корзине
                                setResponding(true);
                                try {
                                    const deleteResult = await OrderAlternativesApi.respondToChoice(
                                        choiceId,
                                        'ACCEPTED',
                                        selectedAlternative.id,
                                        {
                                            selectedAlternativeId: selectedAlternative.id,
                                            unavailableProductIds: productsToRemove
                                        }
                                    );
                                    
                                    if (deleteResult.success) {
                                        setIsChoiceProcessed(true);
                                        setIsDeletionRequestSent(true);
                                        navigation.navigate('Main', { 
                                            screen: 'Cart'
                                        });
                                    }
                                } catch (err) {
                                    console.error('❌ Ошибка удаления:', err);
                                    showError('Ошибка', err.message || 'Не удалось удалить товары');
                                } finally {
                                    setResponding(false);
                                }
                            }
                        });
                        
                        showAlert({
                            type: 'warning',
                            title: 'В заказе не останется товаров',
                            message: `После удаления ${productsToRemove.length} недоступных товаров в заказе не останется товаров для оплаты.\n\nВыберите действие:`,
                            buttons: buttons
                        });
                    } else {
                        // Нет альтернатив - только удаление и возврат к корзине
                        showAlert({
                            type: 'warning',
                            title: 'В заказе не останется товаров',
                            message: 'После удаления недоступных товаров в заказе не останется товаров для оплаты.',
                            buttons: [
                                {
                                    text: 'Удалить и вернуться к корзине',
                                    style: 'primary',
                                    icon: 'shopping-cart',
                                    onPress: async () => {
                                        setResponding(true);
                                        try {
                                            const deleteResult = await OrderAlternativesApi.respondToChoice(
                                                choiceId,
                                                'ACCEPTED',
                                                selectedAlternative.id,
                                                {
                                                    selectedAlternativeId: selectedAlternative.id,
                                                    unavailableProductIds: productsToRemove
                                                }
                                            );
                                            
                                            if (deleteResult.success) {
                                                setIsChoiceProcessed(true);
                                                setIsDeletionRequestSent(true);
                                                navigation.navigate('Main', { 
                                                    screen: 'Cart'
                                                });
                                            }
                                        } catch (err) {
                                            console.error('❌ Ошибка удаления:', err);
                                            showError('Ошибка', err.message || 'Не удалось удалить товары');
                                        } finally {
                                            setResponding(false);
                                        }
                                    }
                                }
                            ]
                        });
                    }
                    
                    return; // НЕ отправляем запрос на удаление
                }
                
                // Если товары останутся - добавляем данные для удаления
                responseData.unavailableProductIds = productsToRemove;
                
                console.log('🗑️ Отладка удаления товаров:', {
                    selectedProductsToRemove: productsToRemove,
                    unavailableItems: choiceDetails?.unavailableItems
                });
            }

            console.log('🔍 Отправляем данные на сервер:', {
                choiceId,
                selectedAlternativeId: selectedAlternative?.id,
                responseData,
                substitutedItems: responseData.substitutedItems?.length || 0,
                unavailableProductIds: responseData.unavailableProductIds?.length || 0
            });

            const result = await OrderAlternativesApi.respondToChoice(
                choiceId,
                'ACCEPTED',
                selectedAlternative?.id,
                responseData
            );

            if (result.success) {
                setShowConfirmModal(false);
                
                // Проверяем, был ли заказ разделен на 2 части (доступные и ожидающие товары)
                if (result.data?.action === 'WAIT_STOCK_SPLIT' && result.data?.splitInfo) {
                    // Помечаем предложение как обработанное
                    setIsChoiceProcessed(true);
                    console.log('🔀 Заказ разделен, переход к оплате обоих заказов', {
                        immediateOrderId: result.data.splitInfo.immediateOrder?.id,
                        waitingOrderId: result.data.splitInfo.waitingOrder?.id
                    });
                    
                    // Переходим к экрану оплаты разделенных заказов
                    navigation.navigate('PaymentScreen', {
                        // Информация о заказе с доступными товарами (сразу в обработку)
                        orderId: result.data.splitInfo.immediateOrder?.id,
                        orderNumber: result.data.splitInfo.immediateOrder?.orderNumber,
                        totalAmount: result.data.splitInfo.immediateOrder?.totalAmount,
                        
                        // Информация о заказе с ожидающими товарами (предавторизация)
                        waitingOrderId: result.data.splitInfo.waitingOrder?.id,
                        waitingOrderNumber: result.data.splitInfo.waitingOrder?.orderNumber,
                        waitingOrderAmount: result.data.splitInfo.waitingOrder?.totalAmount,
                        
                        // Флаг, что это разделенный заказ
                        isSplitOrder: true,
                        returnScreen: 'MyOrders'
                    });
                } else if (result.data?.action === 'SUBSTITUTE') {
                    // Помечаем предложение как обработанное
                    setIsChoiceProcessed(true);
                    
                    // Клиент выбрал замену товаров - переходим к оплате (обычная оплата, БЕЗ предавторизации)
                    console.log('🔄 Товары заменены, переход к оплате (обычная оплата)', {
                        orderId: choiceDetails?.order?.id,
                        newTotalAmount: result.data?.newTotalAmount || result.newTotalAmount,
                        substitutedItems: result.data?.substitutedItems
                    });
                    
                    // Перезагружаем корзину и ждем завершения, чтобы отобразить замененные товары
                    console.log('🔄 Начинаем перезагрузку корзины после замены товаров...');
                    try {
                        const cartData = await dispatch(fetchCart(true)).unwrap();
                        console.log('✅ Корзина успешно перезагружена после замены товаров', {
                            itemsCount: cartData?.items?.length || 0,
                            items: cartData?.items?.map(item => ({
                                productId: item.productId || item.product?.id,
                                productName: item.product?.name,
                                quantity: item.quantity
                            }))
                        });
                    } catch (cartError) {
                        console.error('❌ Ошибка перезагрузки корзины:', cartError);
                    }
                    
                    // Небольшая задержка для стабилизации состояния
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Подсчитываем количество штук и коробов для передачи
                    const itemsCount = result.data?.newItemsCount || result.newItemsCount || getTotalItemsCount();
                    const boxesCount = getTotalBoxesCount();
                    
                    console.log('📊 Передаем данные в PaymentScreen:', {
                        itemsCount,
                        boxesCount,
                        newItemsCountFromData: result.data?.newItemsCount,
                        newItemsCountFromResult: result.newItemsCount
                    });
                    
                    navigation.navigate('PaymentScreen', {
                        orderId: choiceDetails?.order?.id,
                        orderNumber: choiceDetails?.order?.orderNumber,
                        totalAmount: result.data?.newTotalAmount || result.newTotalAmount || choiceDetails?.order?.totalAmount,
                        itemsCount: itemsCount,
                        boxesCount: boxesCount,
                        usePreauthorization: false, // Товары доступны - обычная оплата
                        returnScreen: 'MyOrders'
                    });
                } else if (result.data?.action === 'REMOVE_UNAVAILABLE') {
                    // Клиент удалил недоступные товары - переходим к оплате
                    const orderIdToUse = choiceDetails?.order?.id || orderId;
                    const orderNumberToUse = choiceDetails?.order?.orderNumber || choiceDetails?.orderNumber;
                    const totalAmountToUse = result.data?.newTotalAmount || result.newTotalAmount || choiceDetails?.order?.totalAmount;
                    const itemsCountToUse = result.data?.newItemsCount || result.newItemsCount || 0;
                    
                    console.log('🗑️ Недоступные товары удалены', {
                        orderId: orderIdToUse,
                        orderNumber: orderNumberToUse,
                        newTotalAmount: totalAmountToUse,
                        itemsCount: itemsCountToUse,
                        choiceDetails: {
                            hasOrder: !!choiceDetails?.order,
                            orderId: choiceDetails?.order?.id,
                            orderNumber: choiceDetails?.order?.orderNumber
                        },
                        routeParams: {
                            orderId,
                            choiceId
                        }
                    });
                    
                    // Проверяем, остались ли товары в заказе
                    if (!totalAmountToUse || totalAmountToUse <= 0 || itemsCountToUse <= 0) {
                        console.log('⚠️ В заказе не осталось товаров для оплаты');
                        
                        // Проверяем, есть ли альтернативные товары для замены
                        const hasSubstituteAlternatives = choiceDetails?.alternatives?.some(
                            alt => alt.alternativeType === 'SUBSTITUTE'
                        );
                        
                        if (hasSubstituteAlternatives) {
                            // НЕ помечаем как обработанное - даем клиенту выбрать альтернативы
                            // НО помечаем что запрос на удаление уже отправлен
                            setIsDeletionRequestSent(true);
                            // Предлагаем выбрать товары на замену
                            showAlert({
                                type: 'warning',
                                title: 'Заказ пуст',
                                message: 'После удаления недоступных товаров в заказе не осталось товаров для оплаты. Хотите выбрать похожие товары на замену из ближайшего склада?',
                                buttons: [
                                    {
                                        text: 'Выбрать похожие товары',
                                        style: 'primary',
                                        icon: 'swap-horiz',
                                        onPress: () => {
                                            handleShowAlternativeProducts();
                                        }
                                    },
                                    {
                                        text: 'Вернуться к корзине',
                                        style: 'cancel',
                                        icon: 'shopping-cart',
                                        onPress: () => {
                                            navigation.navigate('Main', { 
                                                screen: 'Cart'
                                            });
                                        }
                                    }
                                ]
                            });
                        } else {
                            // Альтернатив нет, помечаем как обработанное и возвращаемся к корзине
                            setIsChoiceProcessed(true);
                            showAlert({
                                type: 'warning',
                                title: 'Заказ пуст',
                                message: 'После удаления недоступных товаров в заказе не осталось товаров для оплаты. Вернитесь к корзине для повторного оформления заказа.',
                                buttons: [
                                    {
                                        text: 'Вернуться к корзине',
                                        style: 'primary',
                                        icon: 'shopping-cart',
                                        onPress: () => {
                                            navigation.navigate('Main', { 
                                                screen: 'Cart'
                                            });
                                        }
                                    }
                                ]
                            });
                        }
                        return;
                    }
                    
                    // Помечаем предложение как обработанное только если есть товары для оплаты
                    setIsChoiceProcessed(true);
                    
                    if (!orderIdToUse) {
                        console.error('❌ Ошибка: orderId не найден ни в choiceDetails, ни в route.params');
                        showError('Ошибка', 'Не удалось определить ID заказа для оплаты');
                        return;
                    }
                    
                    // Подсчитываем коробы для передачи
                    const boxesCountToUse = getTotalBoxesCount();
                    
                    navigation.navigate('PaymentScreen', {
                        orderId: orderIdToUse,
                        orderNumber: orderNumberToUse,
                        totalAmount: totalAmountToUse,
                        itemsCount: itemsCountToUse,
                        boxesCount: boxesCountToUse,
                        usePreauthorization: false, // Товары доступны - обычная оплата
                        returnScreen: 'MyOrders'
                    });
                } else {
                    // Помечаем предложение как обработанное
                    setIsChoiceProcessed(true);
                    
                    // Подсчитываем количество штук и коробов из заказа
                    const fallbackItemsCount = getTotalItemsCount();
                    const fallbackBoxesCount = getTotalBoxesCount();
                    
                    console.log('📊 Подсчет количества товаров для OrderSuccess:', {
                        newItemsCountFromData: result.data?.newItemsCount,
                        newItemsCountFromResult: result.newItemsCount,
                        fallbackItemsCount,
                        fallbackBoxesCount,
                        orderItemsLength: choiceDetails?.order?.orderItems?.length || 0,
                        itemsLength: choiceDetails?.order?.items?.length || 0
                    });
                    
                    // Обычный флоу (например, отмена заказа) - переходим к экрану успешного заказа
                    navigation.navigate('OrderSuccess', {
                        orderNumber: choiceDetails?.order?.orderNumber || 'N/A',
                        totalAmount: result.data?.newTotalAmount || result.newTotalAmount || choiceDetails?.order?.totalAmount || 0,
                        deliveryDate: choiceDetails?.order?.expectedDeliveryDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                        itemsCount: result.data?.newItemsCount || result.newItemsCount || fallbackItemsCount,
                        boxesCount: fallbackBoxesCount,
                        orderId: choiceDetails?.order?.id,
                        isChoiceResult: true,
                        choiceMessage: result.data?.message || result.message || 'Ваш выбор успешно обработан'
                    });
                }
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            console.error('❌ Ошибка подтверждения выбора:', err);
            
            // Проверяем, не обработано ли уже предложение
            if (err.message && err.message.includes('Предложение уже обработано')) {
                console.log('⚠️ Получена ошибка "Предложение уже обработано", устанавливаем флаг');
                setIsChoiceProcessed(true);
                showError(
                    'Предложение обработано',
                    'Это предложение уже было обработано ранее. Пожалуйста, обновите список заказов.',
                    [
                        {
                            text: 'Вернуться к заказам',
                            style: 'primary',
                            icon: 'arrow-back',
                            onPress: () => {
                                navigation.navigate('MyOrders');
                            }
                        }
                    ]
                );
            } else if (err.isCriticalOperation) {
                // Специальная обработка для критичных операций (истек токен)
                showAlert({
                    type: 'error',
                    title: 'Сессия истекла',
                    message: 'Ваша сессия истекла. Пожалуйста, войдите снова для продолжения оформления заказа.',
                    buttons: [
                        {
                            text: 'Отмена',
                            style: 'cancel'
                        },
                        {
                            text: 'Войти',
                            style: 'primary',
                            icon: 'login',
                            onPress: () => {
                                navigation.navigate('Auth');
                            }
                        }
                    ]
                });
            } else {
                showError('Ошибка', err.message || 'Не удалось обработать ваш выбор');
            }
        } finally {
            setResponding(false);
        }
    }, [choiceId, orderId, choiceDetails, selectedProducts, selectedProductsToRemove, dispatch, navigation, showAlert, showError, handleShowAlternativeProducts, isChoiceProcessed, responding, selectedAlternativeId]);

    /**
     * Открытие модального окна с альтернативными товарами
     */
    const handleShowAlternativeProducts = useCallback(() => {
        // Собираем все альтернативы типа SUBSTITUTE
        const substituteAlternatives = choiceDetails?.alternatives?.filter(
            alt => alt.alternativeType === 'SUBSTITUTE'
        ) || [];
        
        setAvailableProducts(substituteAlternatives);
        setShowProductsModal(true);
    }, [choiceDetails]);

    /**
     * Получение названия склада для похожих товаров
     */
    const getWarehouseNameForSubstitutes = useCallback(() => {
        // Сначала пытаемся получить название из альтернатив SUBSTITUTE
        const substituteAlternative = choiceDetails?.alternatives?.find(
            alt => alt.alternativeType === 'SUBSTITUTE' && alt.warehouse?.name
        );
        
        if (substituteAlternative?.warehouse?.name) {
            return substituteAlternative.warehouse.name;
        }
        
        // Если не найдено, используем склад заказа
        if (choiceDetails?.order?.warehouse?.name) {
            return choiceDetails.order.warehouse.name;
        }
        
        // Fallback
        return 'ближайшем';
    }, [choiceDetails]);

    /**
     * Выбор альтернативного товара
     */
    const handleSelectProduct = useCallback((product) => {
        const productId = product.id;
        setSelectedProducts(prev => {
            const newSelected = { ...prev };
            if (newSelected[productId]) {
                // Товар уже выбран, увеличиваем количество
                newSelected[productId].quantity += 1;
            } else {
                // Новый товар, добавляем с количеством 1
                newSelected[productId] = {
                    product: product,
                    quantity: 1
                };
            }
            return newSelected;
        });
    }, []);

    const handleToggleProduct = useCallback((alternative) => {
        const alternativeId = alternative.id; // Используем ID альтернативы
        setSelectedProducts(prev => {
            const newSelected = { ...prev };
            if (newSelected[alternativeId]) {
                // Товар уже выбран, удаляем его
                delete newSelected[alternativeId];
            } else {
                // Новый товар, добавляем с количеством 1
                newSelected[alternativeId] = {
                    product: alternative.product,
                    quantity: 1,
                    alternative: alternative // Сохраняем всю альтернативу
                };
            }

            // Автоматически устанавливаем selectedAlternativeId для первого выбранного товара
            const firstSelectedId = Object.keys(newSelected)[0];
            if (firstSelectedId) {
                setSelectedAlternativeId(parseInt(firstSelectedId));
            } else {
                setSelectedAlternativeId(null);
            }

            return newSelected;
        });
    }, []);
    
    const handleConfirmProductSelection = useCallback(() => {
        // Устанавливаем selectedAlternativeId для первого выбранного товара
        // Это нужно для совместимости с существующей логикой
        const firstSelectedProductId = Object.keys(selectedProducts)[0];
        if (firstSelectedProductId) {
            setSelectedAlternativeId(parseInt(firstSelectedProductId));
        }
        setShowProductsModal(false);
    }, [selectedProducts]);

    const handleUpdateProductQuantity = useCallback((alternativeId, newQuantity) => {
        if (newQuantity <= 0) {
            // Удаляем товар если количество 0 или меньше
            setSelectedProducts(prev => {
                const newSelected = { ...prev };
                delete newSelected[alternativeId];
                return newSelected;
            });
        } else {
            // Обновляем количество
            setSelectedProducts(prev => ({
                ...prev,
                [alternativeId]: {
                    ...prev[alternativeId],
                    quantity: newQuantity
                }
            }));
        }
    }, []);

    const handleRemoveProduct = useCallback((alternativeId) => {
        setSelectedProducts(prev => {
            const newSelected = { ...prev };
            delete newSelected[alternativeId];
            return newSelected;
        });
    }, []);

    /**
     * Отклонение предложения
     */
    const handleRejectChoice = useCallback(async () => {
        showConfirm(
            'Отклонить предложение',
            'Вы уверены, что хотите отклонить все предложенные варианты? Заказ будет отменен.',
            async () => {
                try {
                    setResponding(true);

                    const result = await OrderAlternativesApi.respondToChoice(
                        choiceId,
                        'REJECTED'
                    );

                    if (result.success) {
                        showAlert({
                            type: 'info',
                            title: 'Заказ отменен',
                            message: 'Заказ был отменен по вашему выбору',
                            buttons: [
                                { 
                                    text: 'OK',
                                    style: 'primary',
                                    onPress: () => navigation.navigate('MyOrders') 
                                }
                            ]
                        });
                    } else {
                        throw new Error(result.error);
                    }
                } catch (err) {
                    console.error('❌ Ошибка отклонения предложения:', err);
                    showError('Ошибка', err.message || 'Не удалось отклонить предложение');
                } finally {
                    setResponding(false);
                }
            }
        );
    }, [choiceId, showConfirm, showAlert, showError, navigation]);


    /**
     * Форматирование дополнительной стоимости
     */
    const formatAdditionalCost = (cost) => {
        if (!cost || cost === 0) return null;
        
        const prefix = cost > 0 ? '+' : '';
        return `${prefix}${new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(cost)}`;
    };

    /**
     * Форматирование даты
     */
    const formatEstimatedDate = (dateString) => {
        if (!dateString) return null;
        
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Сегодня';
        if (diffDays === 1) return 'Завтра';
        if (diffDays === 2) return 'Послезавтра';
        
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Рендер карточки альтернативы
    const renderAlternative = (alternative) => {
        const isSelected = selectedAlternativeId === alternative.id;
        const color = ALTERNATIVE_TYPE_COLORS[alternative.alternativeType] || '#6c757d';
        const icon = ALTERNATIVE_TYPE_ICONS[alternative.alternativeType] || 'help';
        const label = ALTERNATIVE_TYPE_LABELS[alternative.alternativeType] || alternative.alternativeType;
        const additionalCost = formatAdditionalCost(alternative.additionalCost);
        const estimatedDate = formatEstimatedDate(alternative.estimatedDate);
        
        // Проверяем, не была ли уже отправлена операция удаления для REMOVE_UNAVAILABLE
        const isRemoveUnavailableDisabled = alternative.alternativeType === 'REMOVE_UNAVAILABLE' && isDeletionRequestSent;

        return (
            <TouchableOpacity
                key={alternative.id}
                style={[
                    styles.alternativeCard,
                    isSelected && styles.alternativeCardSelected,
                    isSelected && { borderColor: color },
                    isRemoveUnavailableDisabled && styles.alternativeCardDisabled
                ]}
                onPress={() => {
                    if (isRemoveUnavailableDisabled) {
                        showError('Товары уже удалены', 'Недоступные товары уже были удалены из заказа. Выберите другую альтернативу.');
                        return;
                    }
                    handleAlternativeSelect(alternative.id);
                }}
                disabled={isRemoveUnavailableDisabled}
                activeOpacity={0.8}
            >
                <View style={styles.alternativeHeader}>
                    <View style={[styles.alternativeIcon, { backgroundColor: color }]}>
                        <Icon name={icon} size={24} color="#fff" />
                    </View>
                    <View style={styles.alternativeInfo}>
                        <Text style={styles.alternativeTitle}>{label}</Text>
                        {additionalCost && (
                            <Text style={[
                                styles.alternativeCost,
                                { color: alternative.additionalCost > 0 ? '#dc3545' : '#28a745' }
                            ]}>
                                {additionalCost}
                            </Text>
                        )}
                        {estimatedDate && (
                            <Text style={styles.alternativeDate}>
                                📅 {estimatedDate}
                            </Text>
                        )}
                    </View>
                    <View style={[
                        styles.radioButton,
                        isSelected && styles.radioButtonSelected,
                        isSelected && { borderColor: color }
                    ]}>
                        {isSelected && (
                            <View style={[styles.radioDot, { backgroundColor: color }]} />
                        )}
                    </View>
                </View>
                
                <Text style={[
                    styles.alternativeDescription,
                    isRemoveUnavailableDisabled && styles.alternativeDescriptionDisabled
                ]}>
                    {alternative.description}
                </Text>
                
                {/* Индикация, что товары уже удалены */}
                {isRemoveUnavailableDisabled && (
                    <View style={styles.alreadyProcessedBadge}>
                        <Icon name="check-circle" size={16} color="#28a745" />
                        <Text style={styles.alreadyProcessedText}>
                            Товары уже удалены
                        </Text>
                    </View>
                )}

                {/* Дополнительная информация */}
                {alternative.product && (
                    <View style={styles.productInfo}>
                        <Text style={styles.productInfoLabel}>Товар-заменитель:</Text>
                        <Text style={styles.productInfoText}>
                            {alternative.product.name} ({formatAdditionalCost(alternative.product.price)})
                        </Text>
                    </View>
                )}

                {alternative.warehouse && (
                    <View style={styles.warehouseInfo}>
                        <Text style={styles.warehouseInfoLabel}>Склад:</Text>
                        <Text style={styles.warehouseInfoText}>
                            {alternative.warehouse.name}
                        </Text>
                        <Text style={styles.warehouseInfoAddress}>
                            {alternative.warehouse.address}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    // Состояние загрузки
    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#667eea" />
                    <Text style={styles.loadingText}>Загрузка предложений...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Состояние ошибки
    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                <View style={styles.errorContainer}>
                    <Icon name="error-outline" size={80} color="#dc3545" />
                    <Text style={styles.errorTitle}>Ошибка загрузки</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={loadChoiceDetails}
                    >
                        <Icon name="refresh" size={20} color="#fff" />
                        <Text style={styles.retryButtonText}>Попробовать снова</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Состояние истекшего предложения
    if (isExpired) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                <View style={styles.expiredContainer}>
                    <Icon name="access-time" size={80} color="#fd7e14" />
                    <Text style={styles.expiredTitle}>Время выбора истекло</Text>
                    <Text style={styles.expiredText}>
                        К сожалению, время для ответа на это предложение истекло. 
                        Заказ был автоматически отменен.
                    </Text>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backButtonText}>Вернуться к заказам</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Основной рендер
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            
            {/* Заголовок */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerBackButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Выберите вариант</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {choiceDetails && (
                    <>
                        {/* Информация о проблеме */}
                        <View style={styles.problemSection}>
                            <View style={styles.problemHeader}>
                                <Icon name="info-outline" size={24} color="#fd7e14" />
                                <Text style={styles.problemTitle}>
                                    {CHOICE_TYPE_LABELS[choiceDetails?.choiceType] || 'Требуется ваш выбор'}
                                </Text>
                            </View>
                            <Text style={styles.problemDescription}>
                                {choiceDetails?.description}
                            </Text>
                            
                            {/* Карточки недоступных товаров */}
                            {choiceDetails.unavailableItems && choiceDetails.unavailableItems.length > 0 ? (
                                <View style={styles.unavailableProductsContainer}>
                                    <View style={styles.unavailableProductsHeader}>
                                        <Icon name="inventory-2" size={18} color="#fd7e14" />
                                        <Text style={styles.unavailableProductsTitle}>
                                            Недоступные товары ({choiceDetails.unavailableItems.length}):
                                        </Text>
                                    </View>
                                    {choiceDetails.unavailableItems.map((item, index) => {
                                        const productImage = item.productImage ? getProductImage(item.productImage) : null;
                                        const isSelectedForRemoval = selectedProductsToRemove.has(item.productId);
                                        
                                        return (
                                            <TouchableOpacity 
                                                key={index} 
                                                style={[
                                                    styles.unavailableProductCard,
                                                    isSelectedForRemoval && styles.unavailableProductCardSelected
                                                ]}
                                                onPress={() => {
                                                    handleToggleProductToRemove(item.productId);
                                                    // Автоматически выбираем альтернативу REMOVE_UNAVAILABLE (с флагом autoSelect=true)
                                                    const removeAlternative = choiceDetails?.alternatives?.find(
                                                        alt => alt.alternativeType === 'REMOVE_UNAVAILABLE'
                                                    );
                                                    if (removeAlternative && selectedAlternativeId !== removeAlternative.id) {
                                                        handleAlternativeSelect(removeAlternative.id, true);
                                                    }
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <View style={[
                                                    styles.productCheckbox,
                                                    isSelectedForRemoval && styles.productCheckboxSelected
                                                ]}>
                                                    {isSelectedForRemoval && (
                                                        <Icon name="check" size={16} color="#fff" />
                                                    )}
                                                </View>
                                                
                                                <View style={styles.productImageContainer}>
                                                    {productImage ? (
                                                        <Image 
                                                            source={productImage}
                                                            style={styles.productImage}
                                                            resizeMode="cover"
                                                            onError={() => console.log('Error loading product image')}
                                                        />
                                                    ) : (
                                                        <View style={[styles.productImage, styles.placeholderContainer]}>
                                                            <Icon name="image" size={24} color="#ccc" />
                                                        </View>
                                                    )}
                                                </View>
                                                
                                                <View style={styles.productDetails}>
                                                    <View style={styles.productInfo}>
                                                        <View style={styles.productNameContainer}>
                                                            <Icon name="shopping-cart" size={12} color="#4a5568" style={{ marginTop: 2, flexShrink: 0 }} />
                                                            <Text style={styles.productName} numberOfLines={2} ellipsizeMode="tail">
                                                                {item.productName}
                                                            </Text>
                                                        </View>
                                                        
                                                        {item.quantity && (
                                                            <View style={styles.productQuantityContainer}>
                                                                <Text style={styles.productQuantityLabel}>Количество:</Text>
                                                                <Text style={styles.productQuantityValue}>
                                                                    {item.quantity} коробок
                                                                </Text>
                                                            </View>
                                                        )}
                                                        
                                                        {item.productPrice && (
                                                            <View style={styles.productPriceContainer}>
                                                                <Text style={styles.productPriceLabel}>Цена за коробку:</Text>
                                                                <Text style={styles.productPrice}>
                                                                    {formatAmount(item.productPrice)}
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                    
                                    {/* Подсказка о выборе товаров */}
                                    <View style={styles.removeHintContainer}>
                                        <Icon name="info" size={16} color="#667eea" />
                                        <Text style={styles.removeHintText}>
                                            💡 Нажмите на товар, чтобы выбрать/отменить его для удаления из заказа.
                                            {selectedProductsToRemove.size > 0 && (
                                                ` Выбрано: ${selectedProductsToRemove.size} из ${choiceDetails.unavailableItems.length}`
                                            )}
                                        </Text>
                                    </View>
                                    
                                    {/* Подсказка о товарах на замену */}
                                    {choiceDetails?.alternatives?.some(alt => alt.alternativeType === 'SUBSTITUTE') && (
                                        <View style={styles.substituteHintContainer}>
                                            <Icon name="swap-horiz" size={16} color="#28a745" />
                                            <Text style={styles.substituteHintText}>
                                                ✨ Доступны похожие товары на замену из ближайшего склада "{getWarehouseNameForSubstitutes()}"
                                            </Text>
                                        </View>
                                    )}
                                    
                                    {/* Кнопка быстрого удаления и продолжения */}
                                    <TouchableOpacity
                                        style={[
                                            styles.quickRemoveButton,
                                            (responding || isChoiceProcessed || isDeletionRequestSent) && styles.quickRemoveButtonDisabled
                                        ]}
                                        onPress={handleQuickRemoveAndContinue}
                                        disabled={responding || isChoiceProcessed || isDeletionRequestSent}
                                        activeOpacity={0.8}
                                    >
                                        {responding ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <>
                                                <Icon name="delete-outline" size={20} color="#fff" />
                                                <Text style={styles.quickRemoveButtonText}>
                                                    {isChoiceProcessed ? 'Предложение обработано' :
                                                     isDeletionRequestSent ? 'Товары удалены - выберите замену' :
                                                     selectedProductsToRemove.size > 0 
                                                        ? `Удалить выбранные (${selectedProductsToRemove.size}) и продолжить`
                                                        : 'Удалить все недоступные и продолжить'
                                                    }
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            ) : null}
                            
                            {/* Информация о заказе */}
                            {choiceDetails?.order && (
                                <View style={styles.orderInfo}>
                                    <Text style={styles.orderInfoLabel}>Заказ:</Text>
                                    <Text style={styles.orderInfoText}>
                                        {formatOrderNumber(choiceDetails?.order?.orderNumber)} на сумму{' '}
                                        {formatAmount(choiceDetails?.order?.totalAmount)}
                                    </Text>
                                </View>
                            )}

                            {/* Таймер */}
                            {timeLeft > 0 && (
                                <View style={styles.timerContainer}>
                                    <Icon name="schedule" size={16} color="#fd7e14" />
                                    <Text style={styles.timerText}>
                                        Время на выбор: {hoursLeft}ч {minutesLeft}мин
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Варианты выбора */}
                        <View style={styles.alternativesSection}>
                            <Text style={styles.alternativesTitle}>Доступные варианты:</Text>
                            
                            {/* 1. Кнопка для просмотра альтернативных товаров (SUBSTITUTE) - ПЕРВАЯ */}
                            {choiceDetails?.alternatives?.some(alt => alt.alternativeType === 'SUBSTITUTE') && (
                                <TouchableOpacity
                                    style={styles.viewProductsButton}
                                    onPress={handleShowAlternativeProducts}
                                    activeOpacity={0.8}
                                >
                                    <Icon name="swap-horiz" size={24} color="#667eea" />
                                    <View style={styles.viewProductsInfo}>
                                        <Text style={styles.viewProductsTitle}>
                                            Выбрать товары для замены
                                        </Text>
                                        <Text style={styles.viewProductsSubtitle}>
                                            Доступны на складе "{getWarehouseNameForSubstitutes()}"
                                        </Text>
                                    </View>
                                    <Icon name="chevron-right" size={24} color="#667eea" />
                                </TouchableOpacity>
                            )}
                            
                            {/* 2. Подождать поступления товара (WAIT_STOCK) */}
                            {choiceDetails?.alternatives?.filter(alt => alt.alternativeType === 'WAIT_STOCK').map(renderAlternative)}
                            
                            {/* 3. Убрать недоступные товары (REMOVE_UNAVAILABLE) */}
                            {choiceDetails?.alternatives?.filter(alt => alt.alternativeType === 'REMOVE_UNAVAILABLE').map(renderAlternative)}
                            
                            {/* 4. Отменить заказ (CANCEL_ORDER) */}
                            {choiceDetails?.alternatives?.filter(alt => alt.alternativeType === 'CANCEL_ORDER').map(renderAlternative)}
                        </View>

                        {/* Кнопки действий */}
                        <View style={styles.actionsSection}>
                            <TouchableOpacity
                                style={[
                                    styles.confirmButton,
                                    (!selectedAlternativeId || responding || isChoiceProcessed) && styles.confirmButtonDisabled
                                ]}
                                onPress={() => setShowConfirmModal(true)}
                                disabled={!selectedAlternativeId || responding || isChoiceProcessed}
                            >
                                {responding ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <Icon name="check" size={20} color="#fff" />
                                        <Text style={styles.confirmButtonText}>
                                            {isChoiceProcessed ? 'Предложение обработано' : 'Подтвердить выбор'}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Модальное окно подтверждения */}
            <Modal
                visible={showConfirmModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowConfirmModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Подтверждение выбора</Text>
                        
                        <ScrollView 
                            style={styles.modalScrollView} 
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.modalScrollContent}
                        >
                            {/* Показываем информацию о выбранной альтернативе */}
                            {(() => {
                                const selectedAlternative = choiceDetails?.alternatives?.find(
                                    alt => alt.id === selectedAlternativeId
                                );
                                return selectedAlternative && (
                                <View style={styles.selectedChoiceInfo}>
                                    <View style={styles.selectedChoiceHeader}>
                                        <Icon 
                                            name={ALTERNATIVE_TYPE_ICONS[selectedAlternative.alternativeType] || 'help'} 
                                            size={24} 
                                            color={ALTERNATIVE_TYPE_COLORS[selectedAlternative.alternativeType] || '#6c757d'} 
                                        />
                                        <Text style={styles.selectedChoiceTitle}>
                                            {ALTERNATIVE_TYPE_LABELS[selectedAlternative.alternativeType] || selectedAlternative.alternativeType}
                                        </Text>
                                    </View>
                                    
                                    <Text style={styles.selectedChoiceDescription}>
                                        {selectedAlternative.description}
                                    </Text>
                                    
                                    {selectedAlternative.additionalCost !== undefined && selectedAlternative.additionalCost !== 0 && (
                                        <Text style={styles.selectedChoiceCost}>
                                            Дополнительная стоимость: {formatAdditionalCost(selectedAlternative.additionalCost)}
                                        </Text>
                                    )}
                                    
                                    {selectedAlternative.estimatedDate && (
                                        <Text style={styles.selectedChoiceDate}>
                                            📅 {formatEstimatedDate(selectedAlternative.estimatedDate)}
                                        </Text>
                                    )}
                                </View>
                                );
                            })()}

                            {/* Показываем выбранные товары только для SUBSTITUTE */}
                            {(() => {
                                const selectedAlternative = choiceDetails?.alternatives?.find(
                                    alt => alt.id === selectedAlternativeId
                                );
                                return selectedAlternative?.alternativeType === 'SUBSTITUTE' && Object.keys(selectedProducts).length > 0 && (
                                <View style={styles.selectedChoiceInfo}>
                                    <View style={styles.selectedProductHeader}>
                                        <Icon name="shopping-basket" size={24} color="#667eea" />
                                        <Text style={styles.selectedChoiceTitle}>
                                            Выбранные товары ({Object.keys(selectedProducts).length})
                                        </Text>
                                    </View>
                                    
                                    <View style={styles.selectedProductsList}>
                                    {Object.entries(selectedProducts).map(([alternativeId, productData]) => {
                                        const totalPrice = productData.product.price * productData.quantity;
                                        
                                        return (
                                            <View key={alternativeId} style={styles.modalProductItem}>
                                                <View style={styles.selectedProductDetails}>
                                                    <Text style={styles.selectedProductName}>
                                                        {productData.product.name}
                                                    </Text>
                                                    
                                                    <View style={styles.selectedProductQuantity}>
                                                        <Text style={styles.quantityLabel}>Количество коробок:  <Text >{productData.quantity}</Text></Text>
                                                       
                                                    </View>
                                                    
                                                    <View style={styles.selectedProductPrice}>
                                                        <Text style={styles.priceLabel}>Цена за коробку:</Text>
                                                        <Text style={styles.priceValue}>
                                                            {new Intl.NumberFormat('ru-RU', {
                                                                style: 'currency',
                                                                currency: 'RUB'
                                                            }).format(productData.product.price)}
                                                        </Text>
                                                    </View>
                                                    
                                                    <View style={styles.selectedProductTotal}>
                                                        <Text style={styles.totalLabel}>Итого:</Text>
                                                        <Text style={styles.totalValue}>
                                                            {new Intl.NumberFormat('ru-RU', {
                                                                style: 'currency',
                                                                currency: 'RUB'
                                                            }).format(totalPrice)}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })}
                                    </View>
                                    
                                    <View style={styles.grandTotal}>
                                        <Text style={styles.grandTotalLabel}>Общая сумма:</Text>
                                        <Text style={styles.grandTotalValue}>
                                            {new Intl.NumberFormat('ru-RU', {
                                                style: 'currency',
                                                currency: 'RUB'
                                            }).format(Object.values(selectedProducts).reduce((total, item) => 
                                                total + (item.quantity * item.product.price), 0))}
                                        </Text>
                                    </View>
                                </View>
                                );
                            })()}
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={() => setShowConfirmModal(false)}
                                disabled={responding}
                            >
                                <Text style={styles.modalCancelText}>Отмена</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={styles.modalConfirmButton}
                                onPress={handleConfirmChoice}
                                disabled={responding}
                            >
                                {responding ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.modalConfirmText}>Подтвердить</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Модальное окно выбора альтернативных товаров */}
            <Modal
                visible={showProductsModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowProductsModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, styles.productsModalContent]}>
                        <View style={styles.productsModalHeader}>
                            <Text style={styles.productsModalTitle}>Похожие товары</Text>
                            <TouchableOpacity
                                style={styles.closeModalButton}
                                onPress={() => setShowProductsModal(false)}
                            >
                                <Icon name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        
                        <Text style={styles.productsModalSubtitle}>
                            Выберите товар-заменитель из доступных на складе "{getWarehouseNameForSubstitutes()}"
                        </Text>

                        <ScrollView 
                            style={styles.productsScrollView}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Отображение выбранных товаров */}
                            {Object.keys(selectedProducts).length > 0 && (
                                <View style={styles.selectedProductsContainer}>
                                    <Text style={styles.selectedProductsTitle}>Выбранные товары:</Text>
                                    {Object.entries(selectedProducts).map(([alternativeId, productData]) => (
                                        <View key={alternativeId} style={styles.selectedProductItem}>
                                            <View style={styles.selectedProductInfo}>
                                                <Text style={styles.selectedProductName}>{productData.product.name}</Text>
                                                <Text style={styles.selectedProductPrice}>
                                                    {new Intl.NumberFormat('ru-RU', {
                                                        style: 'currency',
                                                        currency: 'RUB'
                                                    }).format(productData.product.price)} × {productData.quantity} = {new Intl.NumberFormat('ru-RU', {
                                                        style: 'currency',
                                                        currency: 'RUB'
                                                    }).format(productData.product.price * productData.quantity)}
                                                </Text>
                                            </View>
                                            <View style={styles.selectedProductActions}>
                                                <TouchableOpacity
                                                    style={styles.quantityButton}
                                                    onPress={() => handleUpdateProductQuantity(alternativeId, productData.quantity - 1)}
                                                >
                                                    <Icon name="remove" size={16} color="#667eea" />
                                                </TouchableOpacity>
                                                <Text style={styles.selectedProductQuantity}>{productData.quantity}</Text>
                                                <TouchableOpacity
                                                    style={styles.quantityButton}
                                                    onPress={() => handleUpdateProductQuantity(alternativeId, productData.quantity + 1)}
                                                >
                                                    <Icon name="add" size={16} color="#667eea" />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.removeProductButton}
                                                    onPress={() => handleRemoveProduct(alternativeId)}
                                                >
                                                    <Icon name="close" size={16} color="#dc3545" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {availableProducts.map((alternative) => {
                                const isSelected = selectedProducts[alternative.id] !== undefined;
                                const selectedQuantity = selectedProducts[alternative.id]?.quantity || 0;
                                
                                // Рассчитываем разницу в цене между заменяемым и новым товаром
                                const originalProductPrice = choiceDetails?.unavailableItems?.find(
                                    item => item.productId === alternative.productId
                                )?.productPrice || 0;
                                const newProductPrice = alternative.product?.price || 0;
                                const priceDifference = newProductPrice - originalProductPrice;
                                const additionalCost = formatAdditionalCost(priceDifference);
                                
                                // Получаем изображение товара
                                const productImage = alternative.product?.images?.[0] || 
                                                   alternative.product?.image || 
                                                   alternative.product?.imageUrl;
                                const productImageUri = productImage ? getProductImage(productImage) : null;
                                
                                return (
                                    <View
                                        key={alternative.id}
                                        style={[
                                            styles.substituteProductCard,
                                            isSelected && styles.substituteProductCardSelected
                                        ]}
                                    >
                                        <TouchableOpacity
                                            style={styles.substituteProductCardContent}
                                            onPress={() => handleToggleProduct(alternative)}
                                            activeOpacity={0.8}
                                        >
                                            <View style={styles.substituteProductImageContainer}>
                                                {productImageUri ? (
                                                    <Image 
                                                        source={productImageUri}
                                                        style={styles.substituteProductImage}
                                                        resizeMode="cover"
                                                        onError={() => console.log('Error loading substitute product image')}
                                                    />
                                                ) : (
                                                    <View style={[styles.substituteProductImage, styles.substitutePlaceholderContainer]}>
                                                        <Icon name="shopping-basket" size={24} color="#667eea" />
                                                    </View>
                                                )}
                                                {isSelected && selectedQuantity > 0 && (
                                                    <View style={styles.substituteQuantityBadge}>
                                                        <Text style={styles.substituteQuantityBadgeText}>{selectedQuantity}</Text>
                                                    </View>
                                                )}
                                            </View>
                                            
                                            <View style={styles.substituteProductCardInfo}>
                                                <View style={styles.substituteProductCardTitleContainer}>
                                                    <Text style={styles.substituteProductCardTitle}>
                                                        {alternative.product?.name || alternative.description}
                                                    </Text>
                                                </View>
                                                
                                                <View style={styles.substituteProductPriceContainer}>
                                                    <Text style={styles.substituteProductPriceLabel}>
                                                        Цена за коробку:
                                                    </Text>
                                                    <Text style={styles.substituteProductPrice}>
                                                        {formatAmount(alternative.product?.price || 0)}
                                                    </Text>
                                                </View>
                                                
                                                {additionalCost && (
                                                    <View style={styles.substituteProductPriceContainer}>
                                                        <Text style={styles.substituteProductPriceLabel}>
                                                            Разница в цене:
                                                        </Text>
                                                        <Text style={[
                                                            styles.substituteProductPrice,
                                                            { color: priceDifference > 0 ? '#dc3545' : '#28a745' }
                                                        ]}>
                                                            {additionalCost}
                                                        </Text>
                                                    </View>
                                                )}
                                                
                                                {isSelected && selectedQuantity > 0 && (
                                                    <View style={styles.substituteProductPriceContainer}>
                                                        <Text style={styles.substituteProductPriceLabel}>
                                                            Итого за {selectedQuantity} коробок:
                                                        </Text>
                                                        <Text style={[styles.substituteProductPrice, { color: '#667eea', fontWeight: '700' }]}>
                                                            {formatAmount((alternative.product?.price || 0) * selectedQuantity)}
                                                        </Text>
                                                    </View>
                                                )}
                                                
                                                {alternative.estimatedDate && (
                                                    <View style={styles.substituteProductDateContainer}>
                                                        <Icon name="access-time" size={14} color="#666" />
                                                        <Text style={styles.substituteProductDate}>
                                                            Готов к выдаче: {formatEstimatedDate(alternative.estimatedDate)}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                            
                                            <View style={[
                                                styles.substituteProductRadioButton,
                                                isSelected && styles.substituteProductRadioButtonSelected
                                            ]}>
                                                {isSelected && (
                                                    <View style={styles.substituteProductRadioDot} />
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                        
                                        {/* Селектор количества для товара */}
                                        <View style={styles.quantitySelector}>
                                            <Text style={styles.quantityLabel}>Количество коробок:</Text>
                                            <View style={styles.quantityControls}>
                                                <TouchableOpacity
                                                    style={[styles.quantityButton, !isSelected && styles.quantityButtonDisabled]}
                                                    onPress={() => {
                                                        if (isSelected) {
                                                            handleUpdateProductQuantity(alternative.id, Math.max(0, selectedQuantity - 1));
                                                        }
                                                    }}
                                                    disabled={!isSelected || selectedQuantity <= 0}
                                                >
                                                    <Icon 
                                                        name="remove" 
                                                        size={20} 
                                                        color={!isSelected || selectedQuantity <= 0 ? "#ccc" : "#667eea"} 
                                                    />
                                                </TouchableOpacity>
                                                
                                                <Text style={[styles.quantityValue, !isSelected && styles.quantityValueDisabled]}>
                                                    {selectedQuantity}
                                                </Text>
                                                
                                                <TouchableOpacity
                                                    style={[styles.quantityButton, !isSelected && styles.quantityButtonDisabled]}
                                                    onPress={() => {
                                                        if (isSelected) {
                                                            handleUpdateProductQuantity(alternative.id, selectedQuantity + 1);
                                                        }
                                                    }}
                                                    disabled={!isSelected}
                                                >
                                                    <Icon 
                                                        name="add" 
                                                        size={20} 
                                                        color={!isSelected ? "#ccc" : "#667eea"} 
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                            
                                            <Text style={[styles.quantityPrice, !isSelected && styles.quantityPriceDisabled]}>
                                                Итого: {new Intl.NumberFormat('ru-RU', {
                                                    style: 'currency',
                                                    currency: 'RUB'
                                                }).format(alternative.product?.price * selectedQuantity || 0)}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>

                        <View style={styles.productsModalActions}>
                            <TouchableOpacity
                                style={styles.productsModalCloseButton}
                                onPress={() => setShowProductsModal(false)}
                            >
                                <Text style={styles.productsModalCloseText}>Закрыть</Text>
                            </TouchableOpacity>
                            
                            {Object.keys(selectedProducts).length > 0 && (
                                <TouchableOpacity
                                    style={styles.productsModalConfirmButton}
                                    onPress={handleConfirmProductSelection}
                                >
                                    <Text style={styles.productsModalConfirmText}>
                                        Подтвердить выбор
                                    </Text>
                                    <Text style={styles.productsModalConfirmSubtext}>
                                        {Object.keys(selectedProducts).length} товар(ов) • {new Intl.NumberFormat('ru-RU', {
                                            style: 'currency',
                                            currency: 'RUB'
                                        }).format(Object.values(selectedProducts).reduce((total, item) => 
                                            total + (item.quantity * item.product.price), 0))}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    headerBackButton: {
        width: normalize(40),
        height: normalize(40),
        borderRadius: normalize(20),
        backgroundColor: '#f8f9fa',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: normalize(18),
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
        fontWeight: '600',
        color: '#333',
    },
    headerPlaceholder: {
        width: normalize(40),
    },
    content: {
        flex: 1,
    },
    problemSection: {
        backgroundColor: '#fff',
        margin: normalize(16),
        borderRadius: normalize(12),
        padding: normalize(20),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    problemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: normalize(12),
    },
    problemTitle: {
        fontSize: normalize(18),
        fontWeight: '600',
        color: '#333',
        marginLeft: normalize(12),
    },
    problemDescription: {
        fontSize: normalize(15),
        color: '#666',
        lineHeight: normalize(22),
        marginBottom: normalize(16),
    },
    orderInfo: {
        backgroundColor: '#f8f9fa',
        padding: normalize(12),
        borderRadius: normalize(8),
        marginBottom: normalize(12),
    },
    orderInfoLabel: {
        fontSize: normalize(13),
        color: '#666',
        fontWeight: '500',
    },
    orderInfoText: {
        fontSize: normalize(15),
        color: '#333',
        fontWeight: '600',
        marginTop: normalize(4),
    },
    allChoicesInfo: {
        backgroundColor: '#e3f2fd',
        padding: normalize(12),
        borderRadius: normalize(8),
        marginBottom: normalize(12),
        borderLeftWidth: 4,
        borderLeftColor: '#2196f3',
    },
    allChoicesLabel: {
        fontSize: normalize(14),
        color: '#1976d2',
        fontWeight: '600',
        marginBottom: normalize(4),
    },
    allChoicesText: {
        fontSize: normalize(12),
        color: '#1565c0',
        fontWeight: '500',
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff3cd',
        padding: normalize(8),
        borderRadius: normalize(6),
        borderWidth: 1,
        borderColor: '#ffeaa7',
    },
    timerText: {
        fontSize: normalize(13),
        color: '#fd7e14',
        fontWeight: '600',
        marginLeft: normalize(6),
    },
    // Карточка товара
    productCard: {
        flexDirection: 'row',
        backgroundColor: '#f8f9fa',
        borderRadius: normalize(12),
        padding: normalize(16),
        marginVertical: normalize(12),
        borderWidth: 1,
        borderColor: '#e9ecef',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    productImageContainer: {
        width: normalize(50),
        height: normalize(50),
        borderRadius: normalize(10),
        overflow: 'hidden',
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        marginRight: normalize(8),
        flexShrink: 0,
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    placeholderContainer: {
        backgroundColor: '#f8f9fa',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    productDetails: {
        flex: 1,
        justifyContent: 'flex-start',
        flexShrink: 1,
        minWidth: 0,
    },
    productInfo: {
        gap: normalize(6),
    },
    productNameContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: normalize(4),
    },
    productName: {
        fontSize: normalize(13),
        color: '#1a1a1a',
        fontWeight: '600',
        lineHeight: normalize(18),
        flex: 1,
        flexShrink: 1,
        flexWrap: 'wrap',
    },
    productPriceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(102, 126, 234, 0.05)',
        paddingHorizontal: normalize(10),
        paddingVertical: normalize(6),
        borderRadius: normalize(6),
        flexWrap: 'wrap',
        gap: normalize(4),
    },
    productPriceLabel: {
        fontSize: normalize(11),
        color: '#667eea',
        fontWeight: '600',
        flexShrink: 1,
    },
    productPrice: {
        fontSize: normalize(13),
        fontWeight: '700',
        color: '#667eea',
        flexShrink: 0,
    },
    productBoxPriceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(40, 167, 69, 0.05)',
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(8),
        borderRadius: normalize(8),
        marginTop: normalize(4),
    },
    productBoxPriceLabel: {
        fontSize: normalize(12),
        color: '#28a745',
        fontWeight: '600',
    },
    productBoxPrice: {
        fontSize: normalize(16),
        fontWeight: '800',
        color: '#28a745',
    },
    alternativesSection: {
        margin: normalize(16),
        marginTop: 0,
    },
    alternativesTitle: {
        fontSize: normalize(16),
        fontWeight: '600',
        color: '#333',
        marginBottom: normalize(16),
        marginLeft: normalize(4),
    },
    alternativeCard: {
        backgroundColor: '#fff',
        borderRadius: normalize(12),
        padding: normalize(16),
        marginBottom: normalize(12),
        borderWidth: 2,
        borderColor: '#e9ecef',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    alternativeCardSelected: {
        borderWidth: 2,
        shadowOpacity: 0.15,
        elevation: 4,
    },
    alternativeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: normalize(12),
    },
    alternativeIcon: {
        width: normalize(48),
        height: normalize(48),
        borderRadius: normalize(24),
        justifyContent: 'center',
        alignItems: 'center',
    },
    alternativeInfo: {
        flex: 1,
        marginLeft: normalize(12),
    },
    alternativeTitle: {
        fontSize: normalize(16),
        fontWeight: '600',
        color: '#333',
        marginBottom: normalize(4),
    },
    alternativeCost: {
        fontSize: normalize(14),
        fontWeight: '600',
        marginBottom: normalize(2),
    },
    alternativeDate: {
        fontSize: normalize(13),
        color: '#666',
    },
    radioButton: {
        width: normalize(24),
        height: normalize(24),
        borderRadius: normalize(12),
        borderWidth: 2,
        borderColor: '#dee2e6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioButtonSelected: {
        borderWidth: 2,
    },
    radioDot: {
        width: normalize(12),
        height: normalize(12),
        borderRadius: normalize(6),
    },
    alternativeDescription: {
        fontSize: normalize(14),
        color: '#666',
        lineHeight: normalize(20),
    },
    alternativeCardDisabled: {
        opacity: 0.6,
        backgroundColor: '#f8f9fa',
        borderColor: '#dee2e6',
    },
    alternativeDescriptionDisabled: {
        color: '#999',
        textDecorationLine: 'line-through',
    },
    alreadyProcessedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#d4edda',
        padding: normalize(8),
        borderRadius: normalize(6),
        marginTop: normalize(10),
        borderWidth: 1,
        borderColor: '#c3e6cb',
    },
    alreadyProcessedText: {
        fontSize: normalize(13),
        color: '#155724',
        fontWeight: '600',
        marginLeft: normalize(6),
    },
    productInfo: {
        backgroundColor: '#e3f2fd',
        padding: normalize(12),
        borderRadius: normalize(8),
        marginTop: normalize(12),
    },
    productInfoLabel: {
        fontSize: normalize(12),
        color: '#1976d2',
        fontWeight: '600',
    },
    productInfoText: {
        fontSize: normalize(14),
        color: '#333',
        marginTop: normalize(4),
    },
    warehouseInfo: {
        backgroundColor: '#f3e5f5',
        padding: normalize(12),
        borderRadius: normalize(8),
        marginTop: normalize(12),
    },
    warehouseInfoLabel: {
        fontSize: normalize(12),
        color: '#7b1fa2',
        fontWeight: '600',
    },
    warehouseInfoText: {
        fontSize: normalize(14),
        color: '#333',
        fontWeight: '600',
        marginTop: normalize(4),
    },
    warehouseInfoAddress: {
        fontSize: normalize(13),
        color: '#666',
        marginTop: normalize(2),
    },
    actionsSection: {
        padding: normalize(20),
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
    },
    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#667eea',
        borderRadius: normalize(12),
        paddingVertical: normalize(16),
        marginBottom: normalize(12),
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    confirmButtonDisabled: {
        opacity: 0.6,
    },
    confirmButtonText: {
        fontSize: normalize(16),
        fontWeight: '600',
        color: '#fff',
        marginLeft: normalize(8),
    },
    rejectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: normalize(12),
        paddingVertical: normalize(16),
        marginTop: normalize(12),
        borderWidth: 2,
        borderColor: '#dc3545',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    rejectButtonText: {
        fontSize: normalize(16),
        fontWeight: '600',
        color: '#dc3545',
        marginLeft: normalize(8),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: normalize(40),
    },
    loadingText: {
        fontSize: normalize(16),
        color: '#666',
        marginTop: normalize(16),
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: normalize(40),
    },
    errorTitle: {
        fontSize: normalize(20),
        fontWeight: '600',
        color: '#dc3545',
        marginTop: normalize(16),
        marginBottom: normalize(8),
    },
    errorText: {
        fontSize: normalize(14),
        color: '#666',
        textAlign: 'center',
        lineHeight: normalize(20),
        marginBottom: normalize(24),
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#dc3545',
        borderRadius: normalize(12),
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(12),
    },
    retryButtonText: {
        fontSize: normalize(14),
        fontWeight: '600',
        color: '#fff',
        marginLeft: normalize(8),
    },
    expiredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: normalize(40),
    },
    expiredTitle: {
        fontSize: normalize(20),
        fontWeight: '600',
        color: '#fd7e14',
        marginTop: normalize(16),
        marginBottom: normalize(8),
    },
    expiredText: {
        fontSize: normalize(14),
        color: '#666',
        textAlign: 'center',
        lineHeight: normalize(20),
        marginBottom: normalize(24),
    },
    backButton: {
        backgroundColor: '#6c757d',
        borderRadius: normalize(12),
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(12),
    },
    backButtonText: {
        fontSize: normalize(14),
        fontWeight: '600',
        color: '#fff',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: normalize(16),
        padding: normalize(16),
        margin: normalize(16),
        maxWidth: '95%',
        maxHeight: '90%',
        width: normalize(600),
        height: normalize(800),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
        flex: 1,
    },
    modalTitle: {
        fontSize: normalize(22),
        fontWeight: '700',
        color: '#333',
        textAlign: 'center',
        marginBottom: normalize(0),
        paddingBottom: normalize(16),
        borderBottomWidth: 2,
        borderBottomColor: '#667eea',
    },
    selectedChoiceInfo: {
        backgroundColor: '#f8f9fa',
        padding: normalize(12),
        borderRadius: normalize(8),
        marginBottom: normalize(2),
    },
    selectedChoiceTitle: {
        fontSize: normalize(18),
        fontWeight: '700',
        color: '#333',
        marginBottom: normalize(2),
        marginLeft: normalize(12),
        textAlign: 'center',
    },
    selectedChoiceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: normalize(16),
        justifyContent: 'center',
    },
    selectedChoiceDescription: {
        fontSize: normalize(14),
        color: '#666',
        lineHeight: normalize(20),
        marginBottom: normalize(8),
    },
    selectedChoiceCost: {
        fontSize: normalize(14),
        fontWeight: '600',
    },
    selectedChoiceDate: {
        fontSize: normalize(13),
        color: '#666',
        fontStyle: 'italic',
    },
    selectedProductHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: normalize(16),
    },
    selectedProductDetails: {
        gap: normalize(8),
    },
    selectedProductName: {
        fontSize: normalize(14),
        fontWeight: '600',
        color: '#333',
        marginBottom: normalize(6),
        textAlign: 'center',
    },
    selectedProductQuantity: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: normalize(8),
        paddingHorizontal: normalize(12),
        backgroundColor: '#f8f9fa',
        borderRadius: normalize(6),
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    selectedProductPrice: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: normalize(8),
        paddingHorizontal: normalize(12),
        backgroundColor: '#e3f2fd',
        borderRadius: normalize(6),
        borderWidth: 1,
        borderColor: '#bbdefb',
    },
    selectedProductTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: normalize(10),
        paddingHorizontal: normalize(12),
        backgroundColor: '#667eea',
        borderRadius: normalize(8),
        marginTop: normalize(6),
    },
    modalScrollView: {
        flex: 1,
        marginVertical: normalize(8),
    },
    modalScrollContent: {
        flexGrow: 1,
        paddingBottom: normalize(8),
    },
    selectedProductsList: {
        marginVertical: normalize(8),
        paddingHorizontal: normalize(4),
    },
    grandTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: normalize(12),
        paddingHorizontal: normalize(16),
        backgroundColor: '#667eea',
        borderRadius: normalize(8),
        marginTop: normalize(8),
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    grandTotalLabel: {
        fontSize: normalize(16),
        fontWeight: '700',
        color: '#fff',
    },
    grandTotalValue: {
        fontSize: normalize(18),
        fontWeight: '800',
        color: '#fff',
    },
    selectedProductAdditionalCost: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: normalize(8),
        paddingHorizontal: normalize(12),
        backgroundColor: '#fff3cd',
        borderRadius: normalize(6),
        borderWidth: 1,
        borderColor: '#ffeaa7',
    },
    quantityLabel: {
        fontSize: normalize(12),
        color: '#666',
    },
    quantityValue: {
        fontSize: normalize(16),
        fontWeight: '600',
        color: '#333',
    },
    priceLabel: {
        fontSize: normalize(12),
        color: '#666',
    },
    priceValue: {
        fontSize: normalize(16),
        fontWeight: '600',
        color: '#333',
    },
    totalLabel: {
        fontSize: normalize(16),
        fontWeight: '600',
        color: '#fff',
    },
    totalValue: {
        fontSize: normalize(18),
        fontWeight: '700',
        color: '#fff',
    },
    additionalCostLabel: {
        fontSize: normalize(14),
        color: '#856404',
    },
    additionalCostValue: {
        fontSize: normalize(14),
        fontWeight: '600',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: normalize(12),
        marginTop: normalize(8),
        paddingTop: normalize(8),
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
    },
    modalCancelButton: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        borderRadius: normalize(12),
        paddingVertical: normalize(12),
        paddingHorizontal: normalize(16),
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    modalCancelText: {
        fontSize: normalize(16),
        fontWeight: '600',
        color: '#666',
    },
    modalConfirmButton: {
        flex: 1,
        backgroundColor: '#667eea',
        borderRadius: normalize(12),
        paddingVertical: normalize(12),
        paddingHorizontal: normalize(16),
        alignItems: 'center',
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    modalConfirmText: {
        fontSize: normalize(16),
        fontWeight: '600',
        color: '#fff',
    },
    // Кнопка просмотра товаров
    viewProductsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: normalize(12),
        padding: normalize(16),
        marginTop: normalize(16),
        marginBottom: normalize(16),
        borderWidth: 2,
        borderColor: '#667eea',
        borderStyle: 'dashed',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    viewProductsInfo: {
        flex: 1,
        marginLeft: normalize(12),
    },
    // Контейнер для недоступных товаров
    unavailableProductsContainer: {
        marginVertical: normalize(12),
        padding: normalize(12),
        backgroundColor: '#fff3e0',
        borderRadius: normalize(12),
        borderWidth: 1,
        borderColor: '#ffcc02',
    },
    unavailableProductsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: normalize(12),
    },
    unavailableProductsTitle: {
        fontSize: normalize(15),
        fontWeight: '600',
        color: '#e65100',
        marginLeft: normalize(8),
    },
    unavailableProductCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: normalize(10),
        padding: normalize(10),
        marginBottom: normalize(8),
        borderWidth: 1,
        borderColor: '#e9ecef',
        alignItems: 'flex-start',
    },
    unavailableProductCardSelected: {
        backgroundColor: '#e3f2fd',
        borderColor: '#667eea',
        borderWidth: 2,
    },
    productCheckbox: {
        width: normalize(22),
        height: normalize(22),
        borderRadius: normalize(6),
        borderWidth: 2,
        borderColor: '#667eea',
        backgroundColor: '#fff',
        marginRight: normalize(8),
        marginTop: normalize(2),
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    productCheckboxSelected: {
        backgroundColor: '#667eea',
        borderColor: '#667eea',
    },
    removeHintContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#e3f2fd',
        padding: normalize(12),
        borderRadius: normalize(8),
        marginTop: normalize(8),
        borderWidth: 1,
        borderColor: '#bbdefb',
    },
    removeHintText: {
        flex: 1,
        fontSize: normalize(13),
        color: '#1976d2',
        marginLeft: normalize(8),
        lineHeight: normalize(18),
    },
    substituteHintContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#d4edda',
        padding: normalize(12),
        borderRadius: normalize(8),
        marginTop: normalize(8),
        borderWidth: 1,
        borderColor: '#c3e6cb',
    },
    substituteHintText: {
        flex: 1,
        fontSize: normalize(13),
        color: '#155724',
        marginLeft: normalize(8),
        lineHeight: normalize(18),
        fontWeight: '500',
    },
    quickRemoveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e83e8c',
        borderRadius: normalize(12),
        padding: normalize(14),
        marginTop: normalize(12),
        shadowColor: '#e83e8c',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    quickRemoveButtonDisabled: {
        backgroundColor: '#ccc',
        shadowColor: '#ccc',
        shadowOpacity: 0.1,
        elevation: 2,
    },
    quickRemoveButtonText: {
        fontSize: normalize(15),
        fontWeight: '600',
        color: '#fff',
        marginLeft: normalize(8),
        textAlign: 'center',
        flexShrink: 1,
    },
    productQuantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(102, 126, 234, 0.05)',
        paddingHorizontal: normalize(10),
        paddingVertical: normalize(6),
        borderRadius: normalize(6),
        flexWrap: 'wrap',
        gap: normalize(4),
    },
    productQuantityLabel: {
        fontSize: normalize(11),
        color: '#667eea',
        fontWeight: '600',
        flexShrink: 1,
    },
    productQuantityValue: {
        fontSize: normalize(12),
        fontWeight: '600',
        color: '#667eea',
        flexShrink: 0,
    },
    viewProductsTitle: {
        fontSize: normalize(15),
        fontWeight: '600',
        color: '#667eea',
        marginBottom: normalize(4),
    },
    viewProductsSubtitle: {
        fontSize: normalize(12),
        color: '#666',
    },
    // Модальное окно товаров
    productsModalContent: {
        maxHeight: '85%',
        width: '95%',
    },
    productsModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: normalize(8),
    },
    productsModalTitle: {
        fontSize: normalize(20),
        fontWeight: '600',
        color: '#333',
    },
    closeModalButton: {
        padding: normalize(4),
    },
    productsModalSubtitle: {
        fontSize: normalize(14),
        color: '#666',
        lineHeight: normalize(20),
        marginBottom: normalize(16),
    },
    productsScrollView: {
        maxHeight: normalize(500),
    },
    // Карточки товаров
    productCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: normalize(8),
        padding: normalize(12),
        marginBottom: normalize(8),
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    productCardSelected: {
        backgroundColor: '#e3f2fd',
        borderColor: '#667eea',
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    productCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    productIconContainer: {
        width: normalize(40),
        height: normalize(40),
        borderRadius: normalize(20),
        backgroundColor: '#e3f2fd',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: normalize(12),
    },
    productCardInfo: {
        flex: 1,
    },
    productCardTitle: {
        fontSize: normalize(13),
        fontWeight: '600',
        color: '#333',
        marginBottom: normalize(4),
        lineHeight: normalize(18),
    },
    productPriceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: normalize(2),
    },
    productPriceLabel: {
        fontSize: normalize(11),
        color: '#666',
        marginRight: normalize(6),
    },
    productPrice: {
        fontSize: normalize(12),
        fontWeight: '600',
    },
    productDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: normalize(4),
    },
    productDate: {
        fontSize: normalize(12),
        color: '#666',
        marginLeft: normalize(4),
    },
    productRadioButton: {
        width: normalize(28),
        height: normalize(28),
        borderRadius: normalize(14),
        borderWidth: 2,
        borderColor: '#dee2e6',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: normalize(12),
    },
    productRadioButtonSelected: {
        borderColor: '#667eea',
        backgroundColor: '#667eea',
    },
    productRadioDot: {
        width: normalize(14),
        height: normalize(14),
        borderRadius: normalize(7),
        backgroundColor: '#fff',
    },
    productsModalActions: {
        marginTop: normalize(16),
        paddingTop: normalize(16),
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
        flexDirection: 'column',
        gap: normalize(12),
    },
    productsModalCloseButton: {
        backgroundColor: '#6c757d',
        borderRadius: normalize(8),
        paddingVertical: normalize(12),
        paddingHorizontal: normalize(16),
        alignItems: 'center',
    },
    productsModalCloseText: {
        fontSize: normalize(16),
        fontWeight: '600',
        color: '#fff',
    },
    productsModalConfirmButton: {
        backgroundColor: '#667eea',
        borderRadius: normalize(8),
        paddingVertical: normalize(12),
        paddingHorizontal: normalize(16),
        alignItems: 'center',
    },
    productsModalConfirmText: {
        fontSize: normalize(16),
        fontWeight: '600',
        color: '#fff',
    },
    productsModalConfirmSubtext: {
        fontSize: normalize(12),
        color: '#fff',
        opacity: 0.9,
        marginTop: normalize(2),
    },
    // Селектор количества
    quantitySelector: {
        marginTop: normalize(8),
        paddingTop: normalize(8),
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    quantityLabel: {
        fontSize: normalize(12),
        fontWeight: '600',
        color: '#333',
        marginBottom: normalize(6),
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: normalize(8),
    },
    quantityButton: {
        width: normalize(36),
        height: normalize(36),
        borderRadius: normalize(18),
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#dee2e6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    quantityValue: {
        fontSize: normalize(18),
        fontWeight: '700',
        color: '#333',
        marginHorizontal: normalize(16),
        minWidth: normalize(30),
        textAlign: 'center',
    },
    quantityPrice: {
        fontSize: normalize(16),
        fontWeight: '700',
        color: '#667eea',
        textAlign: 'center',
    },
    quantityButtonDisabled: {
        backgroundColor: '#f5f5f5',
        borderColor: '#e0e0e0',
    },
    quantityValueDisabled: {
        color: '#999',
    },
    quantityPriceDisabled: {
        color: '#999',
    },
    productCardTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: normalize(8),
    },
    selectedBadge: {
        backgroundColor: '#667eea',
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(4),
        borderRadius: normalize(12),
    },
    selectedBadgeText: {
        fontSize: normalize(12),
        fontWeight: '600',
        color: '#fff',
    },
    selectedProductsContainer: {
        marginBottom: normalize(16),
        paddingBottom: normalize(16),
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
        backgroundColor: '#f8f9fa',
        borderRadius: normalize(8),
        padding: normalize(12),
    },
    selectedProductsTitle: {
        fontSize: normalize(16),
        fontWeight: '600',
        color: '#333',
        marginBottom: normalize(12),
    },
    selectedProductItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: normalize(8),
        paddingHorizontal: normalize(12),
        backgroundColor: '#f8f9fa',
        borderRadius: normalize(8),
        marginBottom: normalize(8),
    },
    modalProductItem: {
        backgroundColor: '#fff',
        borderRadius: normalize(10),
        padding: normalize(12),
        marginBottom: normalize(8),
        borderWidth: 1,
        borderColor: '#e9ecef',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 1,
    },
    selectedProductInfo: {
        flex: 1,
    },
    selectedProductName: {
        fontSize: normalize(14),
        fontWeight: '500',
        color: '#333',
        marginBottom: normalize(4),
    },
    selectedProductPrice: {
        fontSize: normalize(12),
        color: '#666',
    },
    selectedProductActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: normalize(8),
    },
    selectedProductQuantity: {
        fontSize: normalize(14),
        fontWeight: '500',
        color: '#333',
        minWidth: normalize(20),
        textAlign: 'center',
    },
    removeProductButton: {
        padding: normalize(4),
        borderRadius: normalize(4),
        backgroundColor: '#f8d7da',
    },
    quantityBadge: {
        position: 'absolute',
        top: 35,
        right: 10,
        backgroundColor: '#667eea',
        borderRadius: normalize(10),
        minWidth: normalize(20),
        height: normalize(20),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    quantityBadgeText: {
        fontSize: normalize(12),
        fontWeight: '600',
        color: '#fff',
    },
    // Стили для карточек товаров-заменителей
    substituteProductCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: normalize(12),
        padding: normalize(16),
        marginBottom: normalize(12),
        borderWidth: 1,
        borderColor: '#e9ecef',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    substituteProductCardSelected: {
        backgroundColor: '#e3f2fd',
        borderColor: '#667eea',
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    substituteProductCardContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    substituteProductImageContainer: {
        width: normalize(60),
        height: normalize(60),
        borderRadius: normalize(12),
        overflow: 'hidden',
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        marginRight: normalize(12),
        position: 'relative',
    },
    substituteProductImage: {
        width: '100%',
        height: '100%',
    },
    substitutePlaceholderContainer: {
        backgroundColor: '#f8f9fa',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    substituteQuantityBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#667eea',
        borderRadius: normalize(10),
        minWidth: normalize(20),
        height: normalize(20),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    substituteQuantityBadgeText: {
        fontSize: normalize(12),
        fontWeight: '600',
        color: '#fff',
    },
    substituteProductCardInfo: {
        flex: 1,
    },
    substituteProductCardTitleContainer: {
        marginBottom: normalize(8),
    },
    substituteProductCardTitle: {
        fontSize: normalize(15),
        fontWeight: '600',
        color: '#333',
        lineHeight: normalize(20),
    },
    substituteProductPriceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: normalize(4),
        backgroundColor: 'rgba(102, 126, 234, 0.05)',
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(4),
        borderRadius: normalize(6),
    },
    substituteProductPriceLabel: {
        fontSize: normalize(11),
        color: '#666',
        fontWeight: '500',
    },
    substituteProductPrice: {
        fontSize: normalize(12),
        fontWeight: '600',
        color: '#333',
    },
    substituteProductDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: normalize(4),
    },
    substituteProductDate: {
        fontSize: normalize(12),
        color: '#666',
        marginLeft: normalize(4),
    },
    substituteProductRadioButton: {
        width: normalize(24),
        height: normalize(24),
        borderRadius: normalize(12),
        borderWidth: 2,
        borderColor: '#dee2e6',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: normalize(12),
        marginTop: normalize(8),
    },
    substituteProductRadioButtonSelected: {
        borderColor: '#667eea',
        backgroundColor: '#667eea',
    },
    substituteProductRadioDot: {
        width: normalize(10),
        height: normalize(10),
        borderRadius: normalize(5),
        backgroundColor: '#fff',
    },
});
