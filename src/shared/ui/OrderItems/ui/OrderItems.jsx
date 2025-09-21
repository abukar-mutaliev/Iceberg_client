import React from 'react';
import { View, Text, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { formatAmount, formatBoxesCount, formatImageUrl } from '@shared/lib/orderUtils';
import { createOrderDetailsStyles } from '@shared/ui/OrderDetailsStyles';

const styles = createOrderDetailsStyles();

export const OrderItems = ({ order }) => {
    if (!order) return null;

    const items = order?.items || order?.orderItems || [];

    if (items.length === 0) return null;

    return (
        <View style={styles.modernCard}>
            <View style={styles.cardHeader}>
                <Icon name="shopping-bag" size={24} color="#667eea" />
                <Text style={styles.cardTitle}>
                    Товары ({items.length} поз.)
                </Text>
            </View>

            <View style={styles.itemsList}>
                {items.map((item, index) => (
                    <View key={index} style={[
                        styles.itemContainer,
                        index === items.length - 1 && styles.lastItem
                    ]}>
                        {/* Изображение товара */}
                        <View style={styles.imageContainer}>
                            {(() => {
                                const images = item.product?.images;
                                let imageUrl = null;

                                // Используем ту же логику, что и в useProductCard
                                if (images && Array.isArray(images) && images.length > 0) {
                                    const firstImage = images[0];
                                    if (typeof firstImage === 'string') {
                                        imageUrl = formatImageUrl(firstImage);
                                    } else if (firstImage && typeof firstImage === 'object') {
                                        const imagePath = firstImage.url || firstImage.uri || firstImage.path || firstImage.src;
                                        if (imagePath) {
                                            imageUrl = formatImageUrl(imagePath);
                                        }
                                    }
                                } else if (typeof images === 'string') {
                                    imageUrl = formatImageUrl(images);
                                }

                                // Альтернативные поля для изображений
                                if (!imageUrl && item.product?.image) {
                                    if (typeof item.product.image === 'string') {
                                        imageUrl = formatImageUrl(item.product.image);
                                    } else if (typeof item.product.image === 'object' && item.product.image.uri) {
                                        imageUrl = formatImageUrl(item.product.image.uri);
                                    }
                                }

                                return imageUrl ? (
                                    <Image
                                        source={{ uri: imageUrl }}
                                        style={styles.itemImage}
                                        resizeMode="cover"
                                        onError={() => {
                                            // Можно добавить обработку ошибок загрузки
                                        }}
                                    />
                                ) : (
                                    <View style={styles.placeholderImage}>
                                        <Icon name="image" size={30} color="#ccc" />
                                    </View>
                                );
                            })()}
                        </View>

                        {/* Информация о товаре */}
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemName} numberOfLines={2}>
                                {item.product?.name || 'Неизвестный товар'}
                            </Text>

                            {item.product?.supplier && (
                                <View style={styles.supplierContainer}>
                                    <Icon name="store" size={14} color="#999" />
                                    <Text style={styles.itemSupplier}>
                                        {item.product.supplier.companyName || item.product.supplier.name}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.itemDetails}>
                                <View style={styles.quantityContainer}>
                                    <Text style={styles.quantityLabel}>Количество:</Text>
                                    <Text style={styles.itemQuantity}>
                                        {formatBoxesCount(item.quantity)}
                                    </Text>
                                </View>
                                <View style={styles.priceContainer}>
                                    <Text style={styles.priceLabel}>Цена за коробку:</Text>
                                    <Text style={styles.itemPrice}>
                                        {formatAmount(item.price)}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.totalContainer}>
                                <Text style={styles.totalLabel}>Итого:</Text>
                                <Text style={styles.itemTotal}>
                                    {formatAmount(item.quantity * item.price)}
                                </Text>
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
};


