import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    Alert,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Image,
    Platform
} from 'react-native';
import PagerView from "react-native-pager-view";
import { useDispatch } from 'react-redux';
import { deleteProduct } from '@entities/product';
import { useProductManagement } from '@entities/product/hooks/useProductManagement';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { CustomSliderIndicator } from '@shared/ui/CustomSliderIndicator';
import { getBaseUrl } from '@shared/api/api';

const placeholderImage = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' };

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

export const ProductListScreen = () => {
    const dispatch = useDispatch();
    const { currentUser } = useAuth();

    // Используем кастомный хук для управления продуктами
    const {
        filteredProducts,
        isLoading,
        error,
        isRefreshing,
        handleRefresh,
        forceReloadData
    } = useProductManagement();

    // Состояния для листания изображений (храним для каждой карточки)
    const [activeImageIndices, setActiveImageIndices] = useState({});
    const [loadingErrors, setLoadingErrors] = useState({});

    const handleDeleteProduct = async (productId) => {
        try {
            await dispatch(deleteProduct(productId)).unwrap();
            Alert.alert('Готово', 'Продукт удален');

            // После удаления принудительно обновляем данные
            await forceReloadData();
        } catch (err) {
            Alert.alert('Ошибка', err.message || 'Не удалось удалить продукт');
        }
    };

    const handlePageSelected = useCallback((productId) => (event) => {
        const newIndex = event.nativeEvent.position;
        setActiveImageIndices(prev => ({ ...prev, [productId]: newIndex }));
    }, []);

    const handleImageError = useCallback((productId, index) => {
        setLoadingErrors(prev => ({
            ...prev,
            [`${productId}-${index}`]: true
        }));
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

    const getProductImages = useCallback((product) => {
        let images = [];
        
        if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
            images = product.images.filter(item => {
                if (!item) return false;
                if (typeof item === 'string') return item.trim() !== '';
                if (item.uri || item.url || item.path || item.src) return true;
                return false;
            });
        } else if (product?.image) {
            images = [product.image];
        }
        
        return images;
    }, []);

    const renderProductCard = ({ item }) => {
        const productId = item.id?.toString() || 'unknown';
        const imageArray = getProductImages(item);
        const activeIndex = activeImageIndices[productId] || 0;

        // Расчет коробочной информации
        const itemsPerBox = item.itemsPerBox || 1;
        const pricePerItem = item.price || 0;
        const boxPrice = item.boxPrice || (pricePerItem * itemsPerBox);
        const stockBoxes = item.stockQuantity || 0;
        const totalItems = stockBoxes * itemsPerBox;

        return (
            <View style={styles.card}>
                {/* Изображение продукта с возможностью листания */}
                <View style={styles.imageContainer}>
                    {imageArray.length > 1 ? (
                        <PagerView
                            style={styles.pagerView}
                            initialPage={0}
                            onPageSelected={handlePageSelected(productId)}
                            scrollEnabled={true}
                            collapsable={false}
                            orientation="horizontal"
                            overScrollMode="never"
                            overdrag={false}
                            nestedScrollEnabled={true}
                            keyboardDismissMode="on-drag"
                        >
                            {imageArray.map((imageItem, index) => {
                                const imageSource = getImageSource(imageItem);
                                const errorKey = `${productId}-${index}`;
                                const hasError = loadingErrors[errorKey];

                                return (
                                    <View 
                                        key={`image-${productId}-${index}`} 
                                        style={styles.slide}
                                        collapsable={false}
                                    >
                                        {hasError ? (
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
                                                onError={() => handleImageError(productId, index)}
                                            />
                                        )}
                                    </View>
                                );
                            })}
                        </PagerView>
                    ) : (
                        <Image
                            style={styles.productImage}
                            resizeMode="cover"
                            source={imageArray.length > 0 ? getImageSource(imageArray[0]) : placeholderImage}
                            defaultSource={placeholderImage}
                        />
                    )}
                    {/* Индикатор слайдов */}
                    {imageArray.length > 1 && (
                        <View style={styles.indicatorContainer} pointerEvents="none">
                            <CustomSliderIndicator
                                totalItems={imageArray.length}
                                activeIndex={activeIndex}
                            />
                        </View>
                    )}
                </View>

                {/* Название продукта */}
                <Text style={styles.productName} numberOfLines={2}>
                    {item.name || 'Без названия'}
                </Text>
            </View>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Продукты отсутствуют</Text>
            {currentUser?.role === 'SUPPLIER' && (
                <Text style={styles.hintText}>
                    Добавьте продукты через раздел "Добавить продукт"
                </Text>
            )}
            <TouchableOpacity style={styles.refreshButton} onPress={forceReloadData}>
                <Text style={styles.refreshButtonText}>Обновить</Text>
            </TouchableOpacity>
        </View>
    );

    if (isLoading && !isRefreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0066cc" />
                <Text style={styles.loadingText}>Загрузка продуктов...</Text>
            </View>
        );
    }

    if (error && !filteredProducts.length) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={forceReloadData}>
                    <Text style={styles.retryButtonText}>Попробовать снова</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>
                    {currentUser?.role === 'SUPPLIER' ? 'Мои продукты' : 'Список продуктов'}
                </Text>
                <Text style={styles.count}>
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'товар' : 'товаров'}
                </Text>
            </View>

            {filteredProducts.length === 0 ? (
                renderEmptyState()
            ) : (
                <FlatList
                    data={filteredProducts}
                    renderItem={renderProductCard}
                    keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                    nestedScrollEnabled={true}
                    removeClippedSubviews={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            colors={['#0066cc']}
                            tintColor="#0066cc"
                        />
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    header: {
        marginBottom: 15,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    count: {
        fontSize: 14,
        color: '#666',
    },
    card: {
        width: 120,
        height: 150,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 0,
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    imageContainer: {
        width: '100%',
        height: 100,
        position: 'relative',
        backgroundColor: '#f9f9f9',
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
        height: '100%',
    },
    indicatorContainer: {
        position: 'absolute',
        bottom: 4,
        width: '100%',
        alignItems: 'center',
        zIndex: 10,
    },
    productName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        padding: 8,
        flex: 1,
        width: '100%',
    },
    listContainer: {
        paddingVertical: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
        marginTop: 10,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#ff4444',
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#0066cc',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 18,
        textAlign: 'center',
        color: '#666',
        marginBottom: 10,
    },
    hintText: {
        fontSize: 14,
        textAlign: 'center',
        color: '#999',
        fontStyle: 'italic',
        marginBottom: 20,
    },
    refreshButton: {
        backgroundColor: '#0066cc',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
    },
    refreshButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default ProductListScreen;