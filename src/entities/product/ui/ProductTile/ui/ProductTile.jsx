import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    Dimensions,
    PixelRatio,
    Platform
} from 'react-native';
import PagerView from "react-native-pager-view";
import { FontFamily, FontSize, Border, Color } from '@app/styles/GlobalStyles';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch } from "react-redux";
import { AddToCartButton } from '@shared/ui/Cart/ui/AddToCartButton';
import { CustomSliderIndicator } from '@shared/ui/CustomSliderIndicator';
import { getBaseUrl } from '@shared/api/api';

const placeholderImage = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' };

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 440;

const getImageBaseUrl = () => {
    const baseUrl = getBaseUrl();
    return baseUrl ? `${baseUrl}/uploads/` : 'http://212.67.11.134:5000/uploads/';
};

const formatImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    return `${getImageBaseUrl()}${imagePath}`;
};

const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};


class ProductTileErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ProductTile Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Ошибка загрузки</Text>
                </View>
            );
        }

        return this.props.children;
    }
}


const safeString = (value, defaultValue = '') => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    return defaultValue;
};


const safeNumber = (value, defaultValue = 0) => {
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return !isNaN(parsed) ? parsed : defaultValue;
    }
    return defaultValue;
};


const ProductTileComponent = React.memo(({ product, onPress, testID }) => {
    const navigation = useNavigation();
    const route = useRoute();
    const dispatch = useDispatch();
    const isNavigatingRef = useRef(false);
    
    // Состояния для листания изображений
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [loadingError, setLoadingError] = useState({});
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef(null);
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const isSwipingRef = useRef(false);
    const pagerRef = useRef(null);
    const touchStartTime = useRef(0);
    const hasMovedRef = useRef(false);

    if (!product || typeof product !== 'object' || !product.id) {
        console.warn('ProductTile: Невалидный продукт:', product);
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Нет данных</Text>
            </View>
        );
    }

    const routeParams = useMemo(() => {
        try {
            return {
                currentRoute: safeString(route?.name, 'Unknown'),
                currentProductId: route?.params?.productId || null,
                fromScreen: safeString(route?.params?.fromScreen),
                previousProductId: route?.params?.previousProductId || null
            };
        } catch (error) {
            console.warn('ProductTile: Ошибка при получении параметров маршрута:', error);
            return {
                currentRoute: 'Unknown',
                currentProductId: null,
                fromScreen: '',
                previousProductId: null
            };
        }
    }, [route]);

    // Обрабатываем массив изображений
    const imageArray = useMemo(() => {
        let images = [];
        
        if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
            images = product.images.filter(item => {
                if (!item) return false;
                if (typeof item === 'string') return item.trim() !== '';
                if (item.uri || item.url || item.path || item.src) return true;
                return false;
            });
        }
        else if (product?.originalData?.images && Array.isArray(product.originalData.images) && product.originalData.images.length > 0) {
            images = product.originalData.images.filter(item => {
                if (!item) return false;
                if (typeof item === 'string') return item.trim() !== '';
                if (item.uri || item.url || item.path || item.src) return true;
                return false;
            });
        }
        else if (product?.image) {
            images = [product.image];
        }
        
        return images.length > 0 ? images : [];
    }, [product?.images, product?.originalData?.images, product?.image]);

    // Расширенный массив для бесконечной прокрутки
    const extendedImageArray = useMemo(() => {
        if (imageArray.length <= 1) return imageArray;
        return [imageArray[imageArray.length - 1], ...imageArray, imageArray[0]];
    }, [imageArray]);
    
    // Реальный индекс для индикатора
    const realImageIndex = useMemo(() => {
        if (imageArray.length <= 1) return activeImageIndex;
        if (activeImageIndex === 0) return imageArray.length - 1;
        if (activeImageIndex === extendedImageArray.length - 1) return 0;
        return activeImageIndex - 1;
    }, [activeImageIndex, imageArray.length, extendedImageArray.length]);

    // Обработчик изменения состояния прокрутки
    const handlePageScrollStateChanged = useCallback((event) => {
        const state = event.nativeEvent.pageScrollState;
        if (state === 'dragging') {
            setIsScrolling(true);
            isSwipingRef.current = true;
            hasMovedRef.current = true;
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        } else if (state === 'idle') {
            scrollTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false);
                isSwipingRef.current = false;
                hasMovedRef.current = false;
            }, 150);
        }
    }, []);

    // Обработчик начала касания для различения тапа и свайпа
    const handleTouchStart = useCallback((event) => {
        const touch = event.nativeEvent.touches[0];
        if (touch) {
            touchStartX.current = touch.pageX;
            touchStartY.current = touch.pageY;
            touchStartTime.current = Date.now();
            hasMovedRef.current = false;
        }
    }, []);

    // Обработчик движения для определения свайпа
    const handleTouchMove = useCallback((event) => {
        const touch = event.nativeEvent.touches[0];
        if (touch) {
            const deltaX = Math.abs(touch.pageX - touchStartX.current);
            const deltaY = Math.abs(touch.pageY - touchStartY.current);
            // Если движение больше 10px, считаем это свайпом
            if (deltaX > 10 || deltaY > 10) {
                hasMovedRef.current = true;
            }
        }
    }, []);

    // Обработчик окончания касания для обработки тапа
    const handleTouchEnd = useCallback((event) => {
        const touchTime = Date.now() - touchStartTime.current;
        const touch = event.nativeEvent.changedTouches[0];
        
        if (touch) {
            const deltaX = Math.abs(touch.pageX - touchStartX.current);
            const deltaY = Math.abs(touch.pageY - touchStartY.current);
            
            // Если движение было минимальным (< 10px) и время касания короткое (< 300ms), это тап
            if (!hasMovedRef.current && deltaX < 10 && deltaY < 10 && touchTime < 300) {
                // Небольшая задержка, чтобы убедиться, что PagerView не обработал это как свайп
                setTimeout(() => {
                    if (!isSwipingRef.current && !isScrolling) {
                        handleProductPress();
                    }
                }, 100);
            }
        }
        
        // Сбрасываем флаги
        hasMovedRef.current = false;
    }, [handleProductPress]);

    const handlePageSelected = useCallback((event) => {
        const newIndex = event.nativeEvent.position;
        setActiveImageIndex(newIndex);
        
        if (imageArray.length > 1 && pagerRef.current) {
            if (newIndex === 0) {
                setTimeout(() => {
                    pagerRef.current?.setPageWithoutAnimation(imageArray.length);
                }, 50);
            }
            else if (newIndex === extendedImageArray.length - 1) {
                setTimeout(() => {
                    pagerRef.current?.setPageWithoutAnimation(1);
                }, 50);
            }
        }
    }, [imageArray.length, extendedImageArray.length]);

    const handleImageError = useCallback((index) => {
        setLoadingError(prev => ({...prev, [index]: true}));
    }, []);

    // Очистка timeout при размонтировании
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    const getImageSource = useCallback((item) => {
        if (typeof item === 'string') {
            const url = formatImageUrl(item);
            return url ? { uri: url } : placeholderImage;
        } else if (item && typeof item === 'object') {
            if (item.uri) {
                const url = formatImageUrl(item.uri);
                return url ? { uri: url } : placeholderImage;
            }
            const imageUrl = item.url || item.uri || item.path || item.src;
            if (imageUrl) {
                const url = formatImageUrl(imageUrl);
                return url ? { uri: url } : placeholderImage;
            }
        }
        return placeholderImage;
    }, []);

    const productData = useMemo(() => {
        try {
            let category = 'БАСКЕТ';
            if (product.category && typeof product.category === 'string' && product.category.trim()) {
                category = product.category.trim();
            } else if (Array.isArray(product.categories) && product.categories.length > 0) {
                // Категории могут быть как строками, так и объектами с полем name
                const firstCategory = product.categories.find(cat => {
                    if (!cat) return false;
                    // Если категория - строка
                    if (typeof cat === 'string' && cat.trim()) return true;
                    // Если категория - объект с полем name
                    if (typeof cat === 'object' && cat.name && typeof cat.name === 'string' && cat.name.trim()) return true;
                    return false;
                });
                
                if (firstCategory) {
                    // Если это строка
                    if (typeof firstCategory === 'string') {
                        category = firstCategory.trim();
                    } 
                    // Если это объект с полем name
                    else if (typeof firstCategory === 'object' && firstCategory.name) {
                        category = firstCategory.name.trim();
                    }
                }
            }

            // Получаем priceInfo из product или originalData
            const priceInfo = product?.priceInfo || product?.originalData?.priceInfo || null;
            
            // Определяем цену: приоритет отдается цене из фургона (stopPrice/effectivePrice)
            let displayPrice = safeNumber(product.price, 0);
            
            if (priceInfo) {
                // Если есть цена фургона (stopPrice), используем её
                if (priceInfo.stopPrice !== null && priceInfo.stopPrice !== undefined) {
                    const itemsPerBox = product.itemsPerBox || product.originalData?.itemsPerBox || 1;
                    // stopPrice - это цена за коробку, делим на itemsPerBox для получения цены за штуку
                    displayPrice = safeNumber(priceInfo.stopPrice / itemsPerBox, displayPrice);
                } 
                // Если нет stopPrice, но есть effectivePrice (эффективная цена фургона)
                else if (priceInfo.effectivePrice) {
                    const itemsPerBox = product.itemsPerBox || product.originalData?.itemsPerBox || 1;
                    // effectivePrice - это цена за коробку, делим на itemsPerBox для получения цены за штуку
                    displayPrice = safeNumber(priceInfo.effectivePrice / itemsPerBox, displayPrice);
                }
                // Если есть warehousePrice, но нет stopPrice, используем warehousePrice
                else if (priceInfo.warehousePrice !== null && priceInfo.warehousePrice !== undefined) {
                    const itemsPerBox = product.itemsPerBox || product.originalData?.itemsPerBox || 1;
                    displayPrice = safeNumber(priceInfo.warehousePrice / itemsPerBox, displayPrice);
                }
            }

            // Получаем первое изображение для обратной совместимости
            const firstImage = imageArray.length > 0 ? getImageSource(imageArray[0]) : placeholderImage;

            return {
                id: product.id,
                name: safeString(product.name || product.title, 'Товар'),
                category: category,
                price: displayPrice, // Используем цену из фургона если доступна
                image: firstImage,
                stockQuantity: safeNumber(product.stockQuantity, 0),
                availableQuantity: safeNumber(product.availableQuantity, product.stockQuantity || 0),
                isActive: product.isActive !== false,
                priceInfo: priceInfo // Сохраняем priceInfo для возможного использования
            };
        } catch (error) {
            console.error('ProductTile: Ошибка при обработке данных продукта:', error);
            return {
                id: product.id,
                name: 'Товар',
                category: 'БАСКЕТ',
                price: 0,
                image: placeholderImage,
                stockQuantity: 0,
                availableQuantity: 0,
                isActive: false
            };
        }
    }, [product, imageArray, getImageSource]);

    // Убираем избыточное логирование, которое может вызывать проблемы производительности
    // if (process.env.NODE_ENV === 'development') {
    //     console.log('ProductTile - Маршрут:', {
    //         name: routeParams.currentRoute,
    //         productId: routeParams.currentProductId,
    //         fromScreen: routeParams.fromScreen,
    //         previousProductId: routeParams.previousProductId,
    //         targetProductId: productData?.id
    //     });
    // }

    const handleProductPress = useCallback(() => {
        try {
            // Блокируем переход если происходит прокрутка или свайп
            if (isScrolling || isSwipingRef.current) {
                return;
            }
            // Защита от множественных нажатий
            if (isNavigatingRef.current) {
                console.log('ProductTile: Навигация уже в процессе, игнорируем нажатие');
                return;
            }

            console.log('ProductTile: Нажатие на продукт:', { 
                id: productData?.id, 
                name: productData?.name,
                hasOnPress: typeof onPress === 'function'
            });

            if (onPress && typeof onPress === 'function') {
                console.log('ProductTile: Вызываем кастомный onPress с полным объектом продукта');
                onPress(productData);
                return;
            }

            if (!productData?.id) {
                console.warn('ProductTile: отсутствует ID продукта');
                return;
            }

            // Устанавливаем флаг навигации
            isNavigatingRef.current = true;

            // УПРОЩАЕМ ЛОГИКУ: всегда используем navigate вместо replace
            // Это предотвращает конфликты ViewState при переходах между продуктами
            console.log('ProductTile: Навигация к ProductDetail');
            navigation.navigate('ProductDetail', {
                productId: productData.id,
                fromScreen: routeParams.currentRoute || 'ProductTile',
                previousProductId: routeParams.currentProductId || null
            });

            // Сбрасываем флаг через задержку
            setTimeout(() => {
                isNavigatingRef.current = false;
            }, 1000);
        } catch (error) {
            console.error('ProductTile: Ошибка при навигации:', error);
            isNavigatingRef.current = false;
        }
    }, [onPress, navigation, productData, routeParams, isScrolling]);

    const formattedPrice = useMemo(() => {
        try {
            if (!productData?.price || productData.price === 0) return '0';

            return new Intl.NumberFormat('ru-RU').format(productData.price);
        } catch (error) {
            console.warn('ProductTile: Ошибка форматирования цены:', error);
            return String(productData?.price || 0);
        }
    }, [productData?.price]);

    if (!productData) return null;

    return (
        <View
            style={styles.container}
            testID={testID}
            accessible={true}
            accessibilityLabel={`Продукт ${productData.name}, цена ${formattedPrice} рублей`}
            accessibilityRole="button"
        >
            {/* Изображение продукта с возможностью листания - обработка тапа и свайпа */}
            <View 
                style={styles.imageContainer}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {imageArray.length > 1 ? (
                    <>
                        <PagerView
                            ref={pagerRef}
                            style={styles.pagerView}
                            initialPage={1}
                            onPageSelected={handlePageSelected}
                            onPageScrollStateChanged={handlePageScrollStateChanged}
                            scrollEnabled={true}
                            collapsable={false}
                            orientation="horizontal"
                            overScrollMode="never"
                            overdrag={false}
                            nestedScrollEnabled={true}
                            keyboardDismissMode="on-drag"
                        >
                                {extendedImageArray.map((item, index) => {
                                    const imageSource = getImageSource(item);
                                    return (
                                        <View 
                                            key={`image-${index}`} 
                                            style={styles.slide}
                                            collapsable={false}
                                        >
                                            {loadingError[index % imageArray.length] ? (
                                                <Image
                                                    source={placeholderImage}
                                                    style={styles.productImage}
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <Image
                                                    source={imageSource}
                                                    style={styles.productImage}
                                                    resizeMode="cover"
                                                    defaultSource={placeholderImage}
                                                    onError={() => handleImageError(index % imageArray.length)}
                                                />
                                            )}
                                        </View>
                                );
                            })}
                        </PagerView>
                    </>
                ) : (
                    <Pressable
                        style={styles.imageContainer}
                        onPress={handleProductPress}
                        disabled={isNavigatingRef.current}
                        android_ripple={null}
                    >
                        <Image
                            style={styles.productImage}
                            resizeMode="cover"
                            source={imageArray.length > 0 ? getImageSource(imageArray[0]) : (productData.image || placeholderImage)}
                            defaultSource={placeholderImage}
                            onError={() => {
                                console.warn('ProductTile: Ошибка загрузки изображения для продукта', productData.id);
                            }}
                        />
                    </Pressable>
                )}
                {/* Индикатор слайдов */}
                {imageArray.length > 1 && (
                    <View style={styles.indicatorContainer} pointerEvents="none">
                        <CustomSliderIndicator
                            totalItems={imageArray.length}
                            activeIndex={realImageIndex}
                        />
                    </View>
                )}
            </View>
            {/* Область контента обернута в TouchableOpacity для обработки нажатий */}
            <TouchableOpacity
                style={styles.infoContainer}
                onPress={handleProductPress}
                activeOpacity={0.95}
                disabled={isNavigatingRef.current || isScrolling}
            >
                <Text style={styles.category} numberOfLines={1}>
                    {safeString(productData.category, 'БАСКЕТ').toUpperCase()}
                </Text>
                <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                    {productData.name}
                </Text>
                <View style={styles.priceContainer}>
                    <Text style={styles.price}>
                        {formattedPrice} р
                    </Text>
                    <Text style={styles.unit}>
                        / 1 шт
                    </Text>
                </View>
            </TouchableOpacity>
            <View style={styles.addButtonContainer}>
                <AddToCartButton 
                    product={productData}
                    size="small"
                    isWhite={true}
                />
            </View>
        </View>
    );
}, (prevProps, nextProps) => {
    try {
        if (!prevProps.product && !nextProps.product) return true;
        if (!prevProps.product || !nextProps.product) return false;

        if (prevProps.product.id !== nextProps.product.id) return false;
        if (safeString(prevProps.product.name) !== safeString(nextProps.product.name)) return false;
        if (safeNumber(prevProps.product.price) !== safeNumber(nextProps.product.price)) return false;

        if (prevProps.onPress !== nextProps.onPress) return false;

        if (prevProps.testID !== nextProps.testID) return false;

        return true;
    } catch (error) {
        console.error('ProductTile: Ошибка в функции сравнения:', error);
        return false; 
    }
});

export const ProductTile = (props) => (
    <ProductTileErrorBoundary>
        <ProductTileComponent {...props} />
    </ProductTileErrorBoundary>
);

ProductTile.displayName = 'ProductTile';


function getProductImage(product) {
    try {
        if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
            const imageUrl = product.images[0];
            if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) {
                return { uri: imageUrl.trim() };
            }
        }

        if (product?.image) {
            if (typeof product.image === 'string' && product.image.trim()) {
                return { uri: product.image.trim() };
            } else if (typeof product.image === 'object' && product.image !== null) {
                return product.image;
            }
        }

        return placeholderImage;
    } catch (error) {
        console.warn('Ошибка при получении изображения продукта:', error);
        return placeholderImage;
    }
}

const styles = StyleSheet.create({
    container: {
        borderColor: Color.purpleSoft,
        borderWidth: 1,
        backgroundColor: Color.colorLightMode,
        width: normalize(192),
        height: normalize(269),
        marginBottom: normalize(20),
        borderRadius: normalize(Border.br_xl),
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    imageContainer: {
        width: '100%',
        height: 142,
        position: 'relative',
        backgroundColor: '#f5f5f5',
        overflow: 'hidden',
    },
    pagerView: {
        width: '100%',
        height: '100%',
    },
    slide: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    productImage: {
        width: '100%',
        height: 142,
        backgroundColor: '#f5f5f5',
    },
    indicatorContainer: {
        position: 'absolute',
        bottom: 4,
        width: '100%',
        alignItems: 'center',
        zIndex: 10,
    },
    infoContainer: {
        flex: 1,
        paddingLeft: 10,
        paddingRight: 50,
        backgroundColor: Color.blue2,
        paddingTop: 4,
        paddingBottom: 8,
        justifyContent: 'space-between',
    },
    category: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xs,
        fontWeight: '500',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    title: {
        color: Color.colorLightMode,
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xs,
        fontWeight: '600',
        lineHeight: 16,
        flex: 1,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: 4,
    },
    price: {
        color: Color.colorLightMode,
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_lg,
        fontWeight: '700',
    },
    unit: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xs,
        marginLeft: 4,
    },
    addButtonContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 45,
        height: 40,
        zIndex: 2,
    },
    errorContainer: {
        width: normalize(192),
        height: normalize(269),
        marginBottom: normalize(20),
        borderRadius: normalize(Border.br_xl),
        backgroundColor: '#ffeeee',
        borderWidth: 1,
        borderColor: '#ffaaaa',
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: '#ff0000',
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xs,
        textAlign: 'center',
    }
});

export default ProductTile;