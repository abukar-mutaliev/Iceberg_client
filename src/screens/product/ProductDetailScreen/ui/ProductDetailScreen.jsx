import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Platform,
    Dimensions} from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
// iOS: ограничиваем высоту GPU-градиента, чтобы не переполнять видеопамять.
// Без ограничения 3 слоя LinearGradient на 5000+ px создают ~24 МБ текстур,
// и при сворачивании iOS убивает процесс.
const MAX_GRADIENT_HEIGHT_IOS = SCREEN_HEIGHT * 2.5;
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { resetCurrentProduct, fetchProductById } from '@entities/product';
import ChatApi from '@entities/chat/api/chatApi';
import { selectRoomsList } from '@entities/chat/model/selectors';
import { sendProduct, fetchRooms, hydrateRooms } from '@entities/chat/model/slice';

import { useAuth } from '@entities/auth/hooks/useAuth';
import { feedbackApi } from '@entities/feedback/api/feedbackApi';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { useToast } from '@shared/ui/Toast';
import { Loader } from '@shared/ui/Loader';
import Text from '@shared/ui/Text/Text';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { useCustomAlert } from '@shared/ui/CustomAlert';
import { ReusableModal } from '@shared/ui/Modal/ui/ReusableModal';
import { RepostProductContent } from '@widgets/product/ProductContent/ui/RepostProductContent';
import { ImageViewerModal } from '@shared/ui/ImageViewerModal/ui/ImageViewerModal';
import { employeeApiMethods } from '@entities/user/api/userApi';
import { profileApi } from '@entities/profile/api/profileApi';
import { fetchAllDistricts } from '@entities/district/model/slice';
import { loadUserProfile } from '@entities/auth/model/slice';

import {
    StaticBackgroundGradient,
    ScrollableBackgroundGradient,
} from '@shared/ui/BackgroundGradient';

// Компоненты продукта
import { ProductHeader } from '@widgets/product/productHeader';
import { ProductContent } from '@widgets/product/ProductContent';
import { SimilarProducts } from '@widgets/similarProducts';
import { RecentFeedbacks } from '@widgets/recentFeedbacks';
import { BrandCard } from '@widgets/brandCard';
import { ProductActions } from '@widgets/product/ProductActions';

// Кастомные хуки
import { useProductDetailState } from '../hooks/useProductDetailState';
import { useProductDetailData } from '../hooks/useProductDetailData';
import { useProductDetailNavigation } from '../hooks/useProductDetailNavigation';

/**
 * Рефакторенный экран детального просмотра продукта
 */
export const ProductDetailScreen = ({ route, navigation }) => {
    const params = route.params || {};
    const productId = params.productId;
    const fromScreen = params.fromScreen;
    const dispatch = useDispatch();
    const { colors } = useTheme();
    const { isAuthenticated, currentUser } = useAuth();
    const { showError, showWarning, showSuccess } = useToast();
    const { showError: showCustomError, showInfo } = useCustomAlert();
    const [isRepostModalVisible, setIsRepostModalVisible] = useState(false);
    const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
    const [imageViewerImages, setImageViewerImages] = useState([]);
    const [imageViewerInitialIndex, setImageViewerInitialIndex] = useState(0);
    const [isDistrictSelectionVisible, setIsDistrictSelectionVisible] = useState(false);
    const [selectedDistrictId, setSelectedDistrictId] = useState(null);
    const [isLoadingManager, setIsLoadingManager] = useState(false);
    const [replyingFeedbackId, setReplyingFeedbackId] = useState(null);
    const rooms = useSelector(selectRoomsList) || [];
    const loadMoreCalledRef = useRef(false);
    const districts = useSelector(state => state.district?.districts || []);

    // Кастомные хуки для разделения логики
    const {
        contentHeight,
        selectedQuantity,
        activeTab,
        optimisticProduct,
        isMountedRef,
        scrollViewRef,
        scrollY,
        previousProductIdRef,
        visitedProductIdsRef,
        createSafeTimeout,
        scrollToTop,
        handleScroll,
        handleContentSizeChange,
        handleQuantityChange,
        handleTabChange,
        handleViewAllReviews,
        handleProductUpdated,
        setSelectedQuantity,
        setOptimisticProduct
    } = useProductDetailState(productId);

    const {
        product,
        supplier,
        isLoading,
        error,
        refreshData,
        enrichedProduct,
        productImages,
        isInCart,
        cartQuantity,
        addToCart,
        updateQuantity,
        removeFromCart,
        isAdding,
        isUpdating,
        categories,
        similarProducts,
        otherProducts,
        hasMoreProducts,
        isLoadingMoreProducts,
        feedbacks,
        handleRefreshFeedbacks,
        loadMoreProducts
    } = useProductDetailData(productId, isMountedRef, createSafeTimeout, navigation);

    const currentSupplierId = useMemo(() => {
        return currentUser?.supplier?.id
            || currentUser?.profile?.supplier?.id
            || currentUser?.profile?.id
            || null;
    }, [currentUser]);

    const {
        handleGoBack,
        handleSupplierPress,
        handleSimilarProductPress
    } = useProductDetailNavigation(navigation, fromScreen, params);

    // Обработка изменения продукта
    useEffect(() => {
        if (productId && productId !== previousProductIdRef.current) {
            // Проверяем, возвращаемся ли мы назад с похожего товара
            // Если текущий productId уже был посещен ранее, это возврат назад
            const isReturningBack = visitedProductIdsRef.current.has(productId);
            
            // Добавляем текущий productId в историю посещений
            visitedProductIdsRef.current.add(productId);
            
            // Ограничиваем размер истории (храним последние 10 посещений)
            if (visitedProductIdsRef.current.size > 10) {
                const firstId = Array.from(visitedProductIdsRef.current)[0];
                visitedProductIdsRef.current.delete(firstId);
            }
            
            // НЕ сбрасываем currentProduct здесь - useProductDetail сам управляет кэшем
            // Это позволяет эффективно использовать кэш при повторном открытии продуктов
            // Сбрасываем только optimisticProduct при переходе вперед
            const isMovingForward = previousProductIdRef.current && productId && !isReturningBack;
            if (isMovingForward) {
                setOptimisticProduct(null);
            }

            // Не скроллим вверх при возврате назад (когда товар уже был посещен)
            if (!isReturningBack) {
                createSafeTimeout(() => {
                    scrollToTop();
                }, 100);
            }

            previousProductIdRef.current = productId;
        }
    }, [productId, scrollToTop, createSafeTimeout, dispatch, setOptimisticProduct]);

    // Обновление количества в корзине
    useEffect(() => {
        if (!isMountedRef.current) return;
        
        if (isInCart && cartQuantity > 0) {
            setSelectedQuantity(cartQuantity);
        } else {
            setSelectedQuantity(1);
        }
    }, [isInCart, cartQuantity, setSelectedQuantity, isMountedRef]);

    // Прокрутка к верху при фокусе
    // НЕ скроллим при возврате назад (когда товар уже был посещен)
    useFocusEffect(
        useCallback(() => {
            if (!isMountedRef.current) return;
            
            // Проверяем, возвращаемся ли мы назад (товар уже был посещен ранее)
            // При первом фокусе на экране не скроллим, если это возврат назад
            const isReturningBack = productId && visitedProductIdsRef.current.has(productId);
            
            // Если это возврат назад, не скроллим
            if (isReturningBack) {
                return;
            }
            
            let isFirstFocus = true;
            
            const timer = createSafeTimeout(() => {
                if (isFirstFocus && isMountedRef.current) {
                    scrollToTop();
                    isFirstFocus = false;
                }
            }, 150);

            return () => {
                isFirstFocus = false;
                if (timer) {
                    clearTimeout(timer);
                }
            };
        }, [scrollToTop, createSafeTimeout, isMountedRef, productId])
    );

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            try {
                const currentRoute = navigation.getState()?.routes?.[navigation.getState()?.index];
                if (currentRoute?.name !== 'ProductDetail') {
                    dispatch(resetCurrentProduct());
                }
            } catch (e) {
                // navigation state может быть недоступен при фоновом завершении
                dispatch(resetCurrentProduct());
            }
        };
    }, [dispatch, navigation]);

    // Обработчики корзины
    const handleCartAdd = useCallback(async (quantity) => {
        try {
            await addToCart(quantity);
        } catch (error) {
            console.error('Error adding to cart:', error);
            if (error.message && error.message.includes('403')) {
                showWarning('Корзина доступна только для клиентов', {
                    duration: 4000,
                    position: 'top'
                });
            } else {
                showError('Не удалось добавить товар в корзину', {
                    duration: 3000,
                    position: 'top'
                });
            }
        }
    }, [addToCart, showError, showWarning]);

    const handleCartUpdate = useCallback(async (quantity) => {
        try {
            await updateQuantity(quantity);
        } catch (error) {
            console.error('Error updating quantity:', error);
            if (error.message && error.message.includes('403')) {
                showWarning('Корзина доступна только для клиентов', {
                    duration: 4000,
                    position: 'top'
                });
            } else {
                showError('Не удалось обновить количество', {
                    duration: 3000,
                    position: 'top'
                });
            }
        }
    }, [updateQuantity, showError, showWarning]);

    const handleCartRemove = useCallback(async () => {
        try {
            await removeFromCart();
            showSuccess(`"${enrichedProduct?.name}" удален из корзины`, {
                duration: 3000,
                position: 'top'
            });
        } catch (error) {
            console.error('Error removing from cart:', error);
            if (error.message && error.message.includes('403')) {
                showWarning('Корзина доступна только для клиентов', {
                    duration: 4000,
                    position: 'top'
                });
            } else {
                showError('Не удалось удалить товар из корзины', {
                    duration: 3000,
                    position: 'top'
                });
            }
        }
    }, [removeFromCart, enrichedProduct?.name, showSuccess, showError, showWarning]);

    const handleAddToCart = useCallback(async () => {
        if (enrichedProduct && productId) {
            try {
                if (isInCart) {
                    await updateQuantity(selectedQuantity);
                } else {
                    await addToCart(selectedQuantity);
                }
            } catch (error) {
                console.error('Error with cart operation:', error);
                if (error.message && error.message.includes('403')) {
                    showWarning('Корзина доступна только для клиентов', {
                        duration: 4000,
                        position: 'top'
                    });
                } else {
                    showError('Не удалось обновить корзину', {
                        duration: 3000,
                        position: 'top'
                    });
                }
            }
        }
    }, [enrichedProduct, productId, selectedQuantity, isInCart, addToCart, updateQuantity, showError, showWarning]);

    // Обработчик открытия изображения на весь экран
    const handleImagePress = useCallback((images, initialIndex = 0) => {
        if (images && images.length > 0) {
            // Нормализуем массив изображений (преобразуем в строки URI)
            const normalizedImages = images.map(img => {
                if (typeof img === 'string') {
                    return img;
                } else if (img && img.uri) {
                    return img.uri;
                }
                return null;
            }).filter(Boolean);
            
            if (normalizedImages.length > 0) {
                setImageViewerImages(normalizedImages);
                setImageViewerInitialIndex(Math.min(initialIndex, normalizedImages.length - 1));
                setIsImageViewerVisible(true);
            }
        }
    }, []);

    // Обработчик закрытия просмотра изображений
    const handleImageViewerClose = useCallback(() => {
        setIsImageViewerVisible(false);
    }, []);

    // Обработчик репоста товара
    const handleSharePress = useCallback(() => {
        if (!isAuthenticated) {
            showInfo('Требуется авторизация', 'Для отправки товара в чат необходимо войти в систему');
            return;
        }
        setIsRepostModalVisible(true);
    }, [isAuthenticated, showInfo]);

   
    // ============================================================================
    // Обработчик вопроса о продукте - открывает чат с менеджером района пользователя
    const handleAskQuestion = useCallback(async () => {
        if (!isAuthenticated) {
            showInfo('Требуется авторизация', 'Для отправки вопросов необходимо войти в систему');
            return;
        }

        // Проверяем наличие района у клиента
        const districtId = currentUser?.client?.districtId;
        if (!districtId) {
            // Предлагаем выбрать район
            showInfo(
                'Выберите район',
                'Для связи с менеджером необходимо выбрать ваш район обслуживания',
                [
                    {
                        text: 'Выбрать район',
                        style: 'primary',
                        onPress: () => {
                            // Загружаем районы, если их нет
                            if (districts.length === 0) {
                                dispatch(fetchAllDistricts());
                            }
                            setIsDistrictSelectionVisible(true);
                        }
                    },
                    {
                        text: 'Отмена',
                        style: 'secondary'
                    }
                ]
            );
            return;
        }

        // Используем общую функцию для открытия чата с менеджером
        await openChatWithManagerByDistrict(districtId, enrichedProduct?.id);
    }, [currentUser, isAuthenticated, showInfo, showCustomError, openChatWithManagerByDistrict, districts.length, dispatch, enrichedProduct?.id]);

    // Загрузка районов при монтировании, если их нет
    useEffect(() => {
        if (districts.length === 0) {
            dispatch(fetchAllDistricts());
        }
    }, [dispatch, districts.length]);

    // Функция для открытия чата с менеджером по districtId
    const openChatWithManagerByDistrict = useCallback(async (districtId, productId) => {
        setIsLoadingManager(true);

        try {
            // Получаем менеджера района
            const response = await employeeApiMethods.getDistrictManager(districtId);
            const managerData = response?.data?.manager;

            if (!managerData) {
                showCustomError(
                    'Менеджер не найден',
                    'Менеджер вашего района временно недоступен. Попробуйте позже или обратитесь в службу поддержки.'
                );
                setIsLoadingManager(false);
                return;
            }

            const managerUserId = managerData.user?.id;
            if (!managerUserId) {
                throw new Error('ID менеджера не найден');
            }

            // Нормализуем ID для сравнения
            const normalizedManagerUserId = Number(managerUserId);
            const normalizedCurrentUserId = Number(currentUser?.id);

            // Сначала проверяем существующий чат в Redux store
            let existingChat = null;
            const roomsFromStore = rooms || [];
            
            // Функция для проверки, является ли комната чатом с менеджером
            const isChatWithManager = (room) => {
                const roomData = room?.room || room;
                if (roomData?.type !== 'DIRECT') return false;
                
                // Проверяем участников
                const participants = roomData.participants || [];
                return participants.some(p => {
                    const participantId = p?.userId ?? p?.user?.id ?? p?.id;
                    if (!participantId) return false;
                    
                    const normalizedParticipantId = Number(participantId);
                    // Должен быть менеджер, но не текущий пользователь
                    return normalizedParticipantId === normalizedManagerUserId && 
                           normalizedParticipantId !== normalizedCurrentUserId;
                });
            };
            
            existingChat = roomsFromStore.find(isChatWithManager);

            // Если не нашли в Redux, обновляем список и проверяем через API
            if (!existingChat) {
                try {
                    // Обновляем список комнат для получения актуальных данных
                    await dispatch(fetchRooms({ page: 1, forceRefresh: true }));
                    
                    // После обновления rooms из Redux должны обновиться автоматически
                    // Но так как мы в callback, нужно проверить через API
                } catch (fetchError) {
                    console.warn('Ошибка при обновлении списка комнат:', fetchError);
                }
            }

            // Если все еще не нашли, проверяем через API напрямую
            if (!existingChat) {
                try {
                    const roomsResponse = await ChatApi.getRooms({ type: 'DIRECT' });
                    const allRooms = roomsResponse?.data?.rooms || roomsResponse?.data?.data?.rooms || [];
                    
                    existingChat = allRooms.find(isChatWithManager);
                } catch (apiError) {
                    console.warn('Ошибка при получении комнат через API:', apiError);
                }
            }

            let roomId;
            let roomObj;
            const managerName = managerData.name || managerData.user?.email || 'Менеджер';

            if (existingChat) {
                // Найден существующий чат - используем его
                roomObj = existingChat.room || existingChat;
                roomId = roomObj.id || existingChat.id;
                
                console.log('✅ Найден существующий чат с менеджером:', {
                    roomId,
                    managerUserId: normalizedManagerUserId
                });
            } else {
                // Создаем новый чат
                console.log('🆕 Создаем новый чат с менеджером:', {
                    managerUserId: normalizedManagerUserId
                });
                
                const formData = new FormData();
                formData.append('type', 'DIRECT');
                formData.append('title', managerName);
                formData.append('members', JSON.stringify([managerUserId]));

                const createResponse = await ChatApi.createRoom(formData);
                roomObj = createResponse?.data?.room || createResponse?.data?.data?.room;

                if (!roomObj?.id) {
                    throw new Error('Не удалось создать чат');
                }

                roomId = roomObj.id;
                
                // Обновляем список комнат после создания
                try {
                    await dispatch(fetchRooms({ page: 1, forceRefresh: true }));
                } catch (updateError) {
                    console.warn('Ошибка при обновлении списка комнат после создания:', updateError);
                }
            }

            // Отправляем товар в чат, если productId указан
            if (productId) {
                try {
                    // Загружаем продукт в Redux store для отображения в списке чатов
                    await dispatch(fetchProductById(productId));
                    
                    // Отправляем товар в чат
                    const sendResult = await dispatch(sendProduct({
                        roomId,
                        productId: productId
                    }));

                    if (sendResult.error) {
                        console.warn('Не удалось отправить товар в чат:', sendResult.error);
                        // Продолжаем открывать чат даже если отправка товара не удалась
                    } else {
                        console.log('✅ Товар успешно отправлен в чат:', {
                            roomId,
                            productId
                        });
                    }
                } catch (sendError) {
                    console.error('Ошибка при отправке товара в чат:', sendError);
                    // Продолжаем открывать чат даже если отправка товара не удалась
                }
            }

            // Переходим в чат
            const rootNavigation =
                navigation?.getParent?.('AppStack') ||
                navigation?.getParent?.()?.getParent?.() ||
                null;

            (rootNavigation || navigation).navigate('ChatRoom', {
                roomId,
                roomTitle: managerName,
                roomData: roomObj,
                currentUserId: currentUser?.id,
                productId: productId,
                fromScreen: 'ProductDetail'
            });
        } catch (err) {
            console.error('Ошибка при открытии чата с менеджером:', err);
            showCustomError(
                'Ошибка',
                'Не удалось открыть чат с менеджером. Попробуйте позже.'
            );
        } finally {
            setIsLoadingManager(false);
        }
    }, [navigation, currentUser, showCustomError, dispatch, rooms]);

    // Обработчик сохранения выбранного района
    const handleDistrictSave = useCallback(async () => {
        if (!selectedDistrictId) {
            showCustomError('Ошибка', 'Пожалуйста, выберите район');
            return;
        }

        try {
            // Обновляем район клиента
            await profileApi.updateProfile({ districtId: selectedDistrictId });
            
            // Обновляем профиль пользователя в Redux
            await dispatch(loadUserProfile()).unwrap();
            
            setIsDistrictSelectionVisible(false);
            const savedDistrictId = selectedDistrictId;
            setSelectedDistrictId(null);
            
            // После выбора района, открываем чат с менеджером используя сохраненный districtId
            // Передаем productId, чтобы отправить товар в чат
            await openChatWithManagerByDistrict(savedDistrictId, productId || enrichedProduct?.id);
        } catch (error) {
            console.error('Ошибка при сохранении района:', error);
            showCustomError('Ошибка', 'Не удалось сохранить район. Попробуйте позже.');
        }
    }, [selectedDistrictId, dispatch, showCustomError, openChatWithManagerByDistrict, productId, enrichedProduct?.id]);

    // Мемоизированные компоненты
    const displayProduct = useMemo(() => {
        if (!enrichedProduct || !productId || enrichedProduct.id !== productId) {
            return null;
        }
        
        if (optimisticProduct) {
            return { ...enrichedProduct, ...optimisticProduct };
        }
        
        return enrichedProduct;
    }, [enrichedProduct, productId, optimisticProduct]);

    const handleReplyToFeedback = useCallback(async (feedbackId, replyText) => {
        if (currentUser?.role !== 'SUPPLIER') {
            showWarning('Отвечать на отзывы может только поставщик');
            return;
        }

        const productSupplierId = displayProduct?.supplierId || displayProduct?.supplier?.id;
        if (!productSupplierId || !currentSupplierId || Number(productSupplierId) !== Number(currentSupplierId)) {
            showWarning('Вы можете отвечать только на отзывы своих товаров');
            return;
        }

        const trimmedReply = (replyText || '').trim();
        if (!trimmedReply) {
            showWarning('Введите текст ответа');
            return;
        }

        try {
            setReplyingFeedbackId(feedbackId);
            await feedbackApi.replyToFeedback(feedbackId, { reply: trimmedReply }, currentUser);
            await handleRefreshFeedbacks();
            showSuccess('Ответ на отзыв сохранен');
        } catch (error) {
            console.error('Ошибка при ответе на отзыв:', error);
            if (error?.code === 404 && error?.message === 'Маршрут не найден') {
                showError('Функция ответа недоступна: сервер еще не обновлен');
                return;
            }
            showError(error?.message || 'Не удалось сохранить ответ на отзыв');
            throw error;
        } finally {
            setReplyingFeedbackId(null);
        }
    }, [currentUser, currentSupplierId, displayProduct?.supplierId, displayProduct?.supplier?.id, handleRefreshFeedbacks, showError, showSuccess, showWarning]);

    const canReplyAsSupplierForCurrentProduct = useMemo(() => {
        const productSupplierId = displayProduct?.supplierId || displayProduct?.supplier?.id;
        return (
            currentUser?.role === 'SUPPLIER'
            && !!currentSupplierId
            && Number(productSupplierId) === Number(currentSupplierId)
        );
    }, [currentUser?.role, currentSupplierId, displayProduct?.supplierId, displayProduct?.supplier?.id]);

    const productHeaderComponent = useMemo(() => {
        if (!displayProduct?.id) return null;
        
        return (
            <ProductHeader
                product={{ ...displayProduct, images: productImages }}
                scrollY={scrollY}
                onGoBack={handleGoBack}
                onSharePress={handleSharePress}
                isAuthenticated={isAuthenticated}
                onImagePress={handleImagePress}
            />
        );
    }, [displayProduct, productImages, scrollY, handleGoBack, handleSharePress, isAuthenticated, handleImagePress]);

    const productContentComponent = useMemo(() => {
        if (!displayProduct?.id) return null;
        
        return (
            <ProductContent
                product={displayProduct}
                feedbacks={feedbacks || []}
                feedbackLoading={false}
                feedbackError={null}
                isFeedbacksLoaded={Array.isArray(feedbacks) && feedbacks.length > 0}
                quantity={cartQuantity || 0}
                activeTab={activeTab}
                onQuantityChange={handleQuantityChange}
                onTabChange={handleTabChange}
                onRefreshFeedbacks={handleRefreshFeedbacks}
                isUpdatingQuantity={isUpdating}
                maxQuantity={displayProduct?.availableQuantity || displayProduct?.stockQuantity}
                isInCart={isInCart}
                onAddToCart={handleCartAdd}
                onUpdateQuantity={handleCartUpdate}
                onRemoveFromCart={handleCartRemove}
                autoCartManagement={true}
                currentUser={currentUser}
                navigation={navigation}
                canReplyAsSupplier={canReplyAsSupplierForCurrentProduct}
                onReplySubmit={handleReplyToFeedback}
                replyingFeedbackId={replyingFeedbackId}
            />
        );
    }, [
        displayProduct,
        feedbacks,
        cartQuantity,
        activeTab,
        handleQuantityChange,
        handleTabChange,
        handleRefreshFeedbacks,
        isUpdating,
        isInCart,
        handleCartAdd,
        handleCartUpdate,
        handleCartRemove,
        currentUser,
        navigation,
        canReplyAsSupplierForCurrentProduct,
        handleReplyToFeedback,
        replyingFeedbackId,
    ]);

    const productActionsComponent = useMemo(() => {
        if (!displayProduct?.id) return null;
        
        return (
            <ProductActions
                product={displayProduct}
                onAddToCart={handleAddToCart}
                quantity={selectedQuantity}
                onProductUpdated={(data) => handleProductUpdated(data, refreshData)}
                onAskQuestion={handleAskQuestion}
                isLoadingAskQuestion={isLoadingManager}
            />
        );
    }, [displayProduct, handleAddToCart, selectedQuantity, handleProductUpdated, refreshData, handleAskQuestion, isLoadingManager]);

    const brandCardComponent = useMemo(() => (
        activeTab === 'description' && supplier ? (
            <View style={styles.brandCardContainer}>
                <BrandCard
                    key={`brand-card-${supplier.id}`}
                    supplier={supplier}
                    onSupplierPress={() => handleSupplierPress(productId, displayProduct?.supplierId)}
                />
            </View>
        ) : null
    ), [activeTab, supplier, handleSupplierPress, productId, displayProduct?.supplierId]);

    const recentFeedbacksComponent = useMemo(() => (
        activeTab === 'description' && Array.isArray(feedbacks) && feedbacks.length > 0 ? (
            <RecentFeedbacks
                feedbacks={feedbacks}
                productId={displayProduct?.id || 0}
                onViewAllPress={handleViewAllReviews}
                canReplyAsSupplier={canReplyAsSupplierForCurrentProduct}
                onReplySubmit={handleReplyToFeedback}
                replyingFeedbackId={replyingFeedbackId}
            />
        ) : null
    ), [activeTab, feedbacks, displayProduct?.id, handleViewAllReviews, canReplyAsSupplierForCurrentProduct, handleReplyToFeedback, replyingFeedbackId]);

    // Объединяем похожие и остальные товары в один массив
    const allProductsForDisplay = useMemo(() => {
        const similar = Array.isArray(similarProducts) ? similarProducts : [];
        const other = Array.isArray(otherProducts) ? otherProducts : [];
        
        // Объединяем: сначала похожие, потом остальные
        return [...similar, ...other];
    }, [similarProducts, otherProducts]);

    // Отслеживание скролла для загрузки следующей страницы
    const handleScrollWithPagination = useCallback((event) => {
        // Вызываем оригинальный handleScroll
        handleScroll(event);
        
        // Проверяем, нужно ли загрузить следующую страницу
        if (hasMoreProducts && !isLoadingMoreProducts && loadMoreProducts && !loadMoreCalledRef.current) {
            const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
            const scrollPosition = contentOffset.y;
            const scrollViewHeight = layoutMeasurement.height;
            const contentHeight = contentSize.height;
            
            // Загружаем следующую страницу, когда пользователь прокрутил на 80% контента
            const threshold = contentHeight * 0.8;
            if (scrollPosition + scrollViewHeight >= threshold) {
                loadMoreCalledRef.current = true;
                loadMoreProducts();
                // Сбрасываем флаг через 2 секунды
                setTimeout(() => {
                    loadMoreCalledRef.current = false;
                }, 2000);
            }
        }
    }, [handleScroll, hasMoreProducts, isLoadingMoreProducts, loadMoreProducts]);

    // Сбрасываем флаг при изменении состояния загрузки
    useEffect(() => {
        if (!isLoadingMoreProducts) {
            loadMoreCalledRef.current = false;
        }
    }, [isLoadingMoreProducts]);

    const similarProductsComponent = useMemo(() => {
        // Показываем компонент, если есть хотя бы похожие или остальные товары
        if ((!similarProducts || !Array.isArray(similarProducts) || similarProducts.length === 0) &&
            (!otherProducts || !Array.isArray(otherProducts) || otherProducts.length === 0)) {
            return null;
        }
        
        if (!productId) return null;
        
        return (
            <SimilarProducts
                key={`similar-products-${productId}`}
                products={allProductsForDisplay}
                color={colors}
                onProductPress={(similarProductId) => handleSimilarProductPress(similarProductId, productId)}
                currentProductId={productId}
                onEndReached={loadMoreProducts}
                isLoadingMore={isLoadingMoreProducts}
                hasMore={hasMoreProducts}
            />
        );
    }, [allProductsForDisplay, colors, handleSimilarProductPress, productId, loadMoreProducts, isLoadingMoreProducts, hasMoreProducts, similarProducts, otherProducts]);

    // Состояния загрузки и ошибок
    if (isLoading && !displayProduct) {
        return (
            <View style={styles.fullScreenContainer}>
                <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
                    <StaticBackgroundGradient />
                    <View style={styles.errorContainer}>
                        <Loader type="youtube" color={colors.primary || Color.blue2} text={null} />
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    if (error && !displayProduct) {
        return (
            <View style={styles.fullScreenContainer}>
                <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
                    <StaticBackgroundGradient />
                    <View style={styles.errorContainer}>
                        <Text style={[styles.errorText, { color: Color.dark }]}>
                            Произошла ошибка: {error}
                        </Text>
                        <TouchableOpacity 
                            style={styles.retryButton} 
                            onPress={() => refreshData(true)}
                        >
                            <Text style={styles.retryButtonText}>Попробовать снова</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    // Показываем ошибку только если:
    // 1. Нет продукта
    // 2. Не загружается
    // 3. Есть ошибка или продукт действительно не найден (не просто временная задержка)
    // 4. productId существует (чтобы не показывать ошибку при инициализации)
    if (!displayProduct && !isLoading && productId && (error || !product)) {
        return (
            <View style={styles.fullScreenContainer}>
                <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
                    <StaticBackgroundGradient />
                    <View style={styles.errorContainer}>
                        <Text style={[styles.errorText, { color: colors.primary }]}>
                            {error || 'Продукт не найден'}
                        </Text>
                        <TouchableOpacity 
                            style={styles.retryButton} 
                            onPress={() => {
                                if (error) {
                                    refreshData(true);
                                } else {
                                    handleGoBack();
                                }
                            }}
                        >
                            <Text style={styles.retryButtonText}>
                                {error ? 'Попробовать снова' : 'Вернуться назад'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    // Основной рендер
    return (
        <View style={styles.fullScreenContainer}>
            <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.contentScrollView}
                    showsVerticalScrollIndicator={false}
                    onScroll={handleScrollWithPagination}
                    scrollEventThrottle={16}
                    contentContainerStyle={styles.scrollContent}
                    onContentSizeChange={handleContentSizeChange}
                    overScrollMode="never"
                    bounces={false}
                    removeClippedSubviews={Platform.OS === 'ios'}
                >
                    <ScrollableBackgroundGradient
                        showOverlayGradient={true}
                        showShadowGradient={false}
                        contentHeight={
                            Platform.OS === 'ios'
                                ? Math.min(contentHeight, MAX_GRADIENT_HEIGHT_IOS)
                                : contentHeight
                        }
                    />

                    <View style={styles.contentContainer}>
                        {productHeaderComponent}
                        {productContentComponent}
                        {productActionsComponent}
                        {brandCardComponent}
                        {recentFeedbacksComponent}
                        {similarProductsComponent}
                    </View>
                </ScrollView>
            </SafeAreaView>

            {/* Модальное окно репоста товара */}
            {isAuthenticated && displayProduct && (
                <ReusableModal
                    visible={isRepostModalVisible}
                    onClose={() => setIsRepostModalVisible(false)}
                    title="Отправить товар"
                    height={85}
                    fullScreenOnKeyboard={true}
                >
                    <RepostProductContent 
                        product={displayProduct}
                        currentUser={currentUser}
                        onClose={() => setIsRepostModalVisible(false)}
                    />
                </ReusableModal>
            )}

            {/* Модальное окно просмотра изображений — монтируем только при открытии,
                чтобы не держать тяжёлые image-текстуры в GPU-памяти постоянно */}
            {isImageViewerVisible && (
                <ImageViewerModal
                    visible={true}
                    imageList={imageViewerImages}
                    initialIndex={imageViewerInitialIndex}
                    onClose={handleImageViewerClose}
                    title={displayProduct?.name || ''}
                />
            )}

            {/* Модальное окно выбора района */}
            <ReusableModal
                visible={isDistrictSelectionVisible}
                onClose={() => {
                    setIsDistrictSelectionVisible(false);
                    setSelectedDistrictId(null);
                }}
                title="Выберите район"
                height={80}
            >
                <View style={styles.districtModalContent}>
                    <Text style={styles.districtModalText}>
                        Для связи с менеджером необходимо выбрать ваш район обслуживания
                    </Text>
                    {districts.length === 0 ? (
                        <View style={styles.districtLoadingContainer}>
                            <ActivityIndicator size="small" color={Color.blue2} />
                            <Text style={styles.districtLoadingText}>Загрузка районов...</Text>
                        </View>
                    ) : (
                        <>
                            <FlatList
                                data={districts}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.districtItem,
                                            selectedDistrictId === item.id && styles.districtItemSelected
                                        ]}
                                        onPress={() => setSelectedDistrictId(item.id)}
                                    >
                                        <Text style={[
                                            styles.districtItemText,
                                            selectedDistrictId === item.id && styles.districtItemTextSelected
                                        ]}>
                                            {item.name}
                                        </Text>
                                        {item.description && (
                                            <Text style={[
                                                styles.districtItemDescription,
                                                selectedDistrictId === item.id && styles.districtItemTextSelected
                                            ]}>
                                                {item.description}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                )}
                                style={styles.districtList}
                                showsVerticalScrollIndicator={false}
                            />
                            <TouchableOpacity
                                style={[
                                    styles.districtSaveButton,
                                    !selectedDistrictId && styles.districtSaveButtonDisabled
                                ]}
                                onPress={handleDistrictSave}
                                disabled={!selectedDistrictId}
                            >
                                <Text style={styles.districtSaveButtonText}>
                                    Сохранить и открыть чат
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </ReusableModal>
        </View>
    );
};

const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
        paddingBottom: 0
    },
    safeArea: {
        flex: 1,
        width: '100%',
    },
    contentScrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 10,
    },
    contentContainer: {
        position: 'relative',
        zIndex: 0,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'transparent',
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
    },
    brandCardContainer: {
        paddingHorizontal: 16,
        marginVertical: 10,
    },
    retryButton: {
        padding: 10,
        backgroundColor: Color.blue2,
        borderRadius: 5,
        marginTop: 20,
    },
    retryButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
    },
    districtModalContent: {
        flex: 1,
        padding: 16,
    },
    districtModalText: {
        fontSize: 14,
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
        marginBottom: 16,
        textAlign: 'center',
    },
    districtLoadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    districtLoadingText: {
        marginTop: 12,
        fontSize: 14,
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    districtList: {
        flex: 1,
        maxHeight: 300,
    },
    districtItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
        backgroundColor: '#FFFFFF',
    },
    districtItemSelected: {
        backgroundColor: Color.blue2,
    },
    districtItemText: {
        fontSize: 16,
        fontWeight: '500',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    districtItemTextSelected: {
        color: '#FFFFFF',
    },
    districtItemDescription: {
        fontSize: 14,
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginTop: 4,
    },
    districtSaveButton: {
        backgroundColor: Color.blue2,
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
    },
    districtSaveButtonDisabled: {
        backgroundColor: '#CCCCCC',
        opacity: 0.6,
    },
    districtSaveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        fontFamily: FontFamily.sFProText,
    },
});

export default React.memo(ProductDetailScreen);
