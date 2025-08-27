import React, { useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    PixelRatio
} from 'react-native';
import { FontFamily, FontSize, Border, Color } from '@app/styles/GlobalStyles';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch } from "react-redux";
import { AddToCartButton } from '@shared/ui/Cart/ui/AddToCartButton';

const placeholderImage = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' };

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 440;

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

    const productData = useMemo(() => {
        try {
            let category = 'БАСКЕТ';
            if (product.category && typeof product.category === 'string' && product.category.trim()) {
                category = product.category.trim();
            } else if (Array.isArray(product.categories) && product.categories.length > 0) {
                const firstCategory = product.categories.find(cat =>
                    cat && typeof cat === 'string' && cat.trim()
                );
                category = firstCategory ? firstCategory.trim() : 'БАСКЕТ';
            }

            return {
                id: product.id,
                name: safeString(product.name || product.title, 'Товар'),
                category: category,
                price: safeNumber(product.price, 0),
                image: getProductImage(product),
                stockQuantity: safeNumber(product.stockQuantity, 0),
                availableQuantity: safeNumber(product.availableQuantity, product.stockQuantity || 0),
                isActive: product.isActive !== false
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
    }, [product]);

    if (process.env.NODE_ENV === 'development') {
        console.log('ProductTile - Маршрут:', {
            name: routeParams.currentRoute,
            productId: routeParams.currentProductId,
            fromScreen: routeParams.fromScreen,
            previousProductId: routeParams.previousProductId,
            targetProductId: productData?.id
        });
    }

    const handleProductPress = useCallback(() => {
        try {
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
    }, [onPress, navigation, productData, routeParams]);

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
        <TouchableOpacity
            style={styles.container}
            onPress={handleProductPress}
            activeOpacity={0.95}
            testID={testID}
            accessible={true}
            accessibilityLabel={`Продукт ${productData.name}, цена ${formattedPrice} рублей`}
            accessibilityRole="button"
            disabled={isNavigatingRef.current}
        >
            <Image
                style={styles.productImage}
                resizeMode="cover"
                source={productData.image}
                defaultSource={placeholderImage}
                onError={() => {
                    console.warn('ProductTile: Ошибка загрузки изображения для продукта', productData.id);
                }}
            />
            <View style={styles.infoContainer}>
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
            </View>
            <View style={styles.addButtonContainer}>
                <AddToCartButton 
                    product={productData}
                    size="small"
                    isWhite={true}
                />
            </View>
        </TouchableOpacity>
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
    productImage: {
        width: '100%',
        height: 142,
        backgroundColor: '#f5f5f5',
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