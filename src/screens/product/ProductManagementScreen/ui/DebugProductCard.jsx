import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';

export const DebugProductCard = ({ product, onPress }) => {
    // Базовый URL сервера
    const BASE_SERVER_URL = 'http://212.67.11.134:5000/uploads/';

    // Анализируем структуру изображений
    const analyzeImages = () => {
        console.log('DebugProductCard - Полная структура продукта:', JSON.stringify(product, null, 2));

        const analysis = {
            productId: product?.id,
            hasImages: !!product?.images,
            imagesType: Array.isArray(product?.images) ? 'array' : typeof product?.images,
            imagesLength: product?.images?.length,
            firstImage: product?.images?.[0],
            hasImage: !!product?.image,
            imageType: typeof product?.image,
            imageValue: product?.image
        };

        console.log('DebugProductCard - Анализ изображений:', analysis);
        return analysis;
    };

    const imageAnalysis = analyzeImages();

    // Пытаемся извлечь изображение
    const getImageSource = () => {
        // Функция для формирования полного URL
        const formatImageUrl = (imagePath) => {
            if (!imagePath) return null;

            // Если это уже полный URL, возвращаем как есть
            if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
                return imagePath;
            }

            // Если это относительный путь, добавляем базовый URL
            return `${BASE_SERVER_URL}${imagePath}`;
        };

        // Проверяем все возможные варианты
        if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
            const firstImage = product.images[0];

            if (typeof firstImage === 'string') {
                const fullUrl = formatImageUrl(firstImage);
                console.log('DebugProductCard - Сформирован URL для изображения:', fullUrl);
                return { uri: fullUrl };
            }

            if (typeof firstImage === 'object' && firstImage) {
                const url = firstImage.url || firstImage.uri || firstImage.path || firstImage.src;
                if (url) {
                    const fullUrl = formatImageUrl(url);
                    console.log('DebugProductCard - Сформирован URL из объекта:', fullUrl);
                    return { uri: fullUrl };
                }
            }
        }

        if (product?.image) {
            if (typeof product.image === 'string') {
                const fullUrl = formatImageUrl(product.image);
                return { uri: fullUrl };
            }

            if (typeof product.image === 'object' && product.image.uri) {
                const fullUrl = formatImageUrl(product.image.uri);
                return { uri: fullUrl };
            }
        }

        return null;
    };

    const imageSource = getImageSource();

    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            <View style={styles.imageContainer}>
                {imageSource ? (
                    <Image
                        source={imageSource}
                        style={styles.image}
                        onError={(error) => {
                            console.log('DebugProductCard - Ошибка загрузки изображения:', error.nativeEvent.error);
                            console.log('DebugProductCard - Источник изображения:', imageSource);
                        }}
                        onLoad={() => {
                            console.log('DebugProductCard - Изображение загружено успешно:', imageSource);
                        }}
                    />
                ) : (
                    <View style={styles.noImage}>
                        <Text style={styles.noImageText}>Нет изображения</Text>
                    </View>
                )}
            </View>

            <Text style={styles.productName} numberOfLines={2}>
                {product?.name || 'Без названия'}
            </Text>

            <Text style={styles.productPrice}>
                {product?.price ? `${product.price} руб.` : 'Цена не указана'}
            </Text>

            {/* Отладочная информация */}
            <View style={styles.debugContainer}>
                <Text style={styles.debugText}>ID: {product?.id}</Text>
                <Text style={styles.debugText}>
                    Изображений: {imageAnalysis.imagesLength || 0}
                </Text>
                <Text style={styles.debugText}>
                    Тип: {imageAnalysis.imagesType}
                </Text>
                {imageSource && (
                    <Text style={styles.debugText} numberOfLines={1}>
                        URL: {imageSource.uri?.substring(0, 30)}...
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        width: 150,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 10,
        marginRight: 10,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    imageContainer: {
        width: '100%',
        height: 100,
        marginBottom: 10,
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
        resizeMode: 'cover',
    },
    noImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noImageText: {
        color: '#999',
        fontSize: 12,
        textAlign: 'center',
    },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 5,
    },
    productPrice: {
        fontSize: 12,
        color: '#666',
        marginBottom: 10,
    },
    debugContainer: {
        backgroundColor: '#f9f9f9',
        padding: 5,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    debugText: {
        fontSize: 10,
        color: '#666',
        marginBottom: 2,
    },
});

export default DebugProductCard;