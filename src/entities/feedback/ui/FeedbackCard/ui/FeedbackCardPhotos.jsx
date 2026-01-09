import React, { useMemo } from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { getImageUrl } from '@shared/api/api';

/**
 * Компонент для отображения фотографий в отзыве
 *
 * @param {Object} props
 * @param {string[]} props.photoUrls - Массив URL фотографий
 * @param {Function} props.onPhotoPress - Обработчик нажатия на фото
 */
export const FeedbackCardPhotos = ({ photoUrls = [], onPhotoPress }) => {
    // Нормализуем URL фотографий (заменяем старый IP на текущий базовый URL)
    const normalizedPhotoUrls = useMemo(() => {
        if (!photoUrls || !Array.isArray(photoUrls)) return [];
        return photoUrls.map(url => getImageUrl(url) || url).filter(Boolean);
    }, [photoUrls]);

    if (!normalizedPhotoUrls || normalizedPhotoUrls.length === 0) {
        return null;
    }

    return (
        <View style={styles.photosContainer}>
            <View style={styles.photosRow}>
                {normalizedPhotoUrls.slice(0, 4).map((url, index) => (
                    <TouchableOpacity
                        key={`photo-${index}`}
                        style={styles.photoThumbnail}
                        onPress={() => onPhotoPress(index)}
                    >
                        <Image
                            source={{ uri: url }}
                            style={styles.photoImage}
                            resizeMode="cover"
                        />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    photosContainer: {
        width: '100%',
        marginTop: 8,
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    photosRow: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        gap: 12,
    },
    photoThumbnail: {
        width: 37,
        height: 37,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#F0F0F0',
    },
    photoImage: {
        width: '100%',
        height: '100%',
    },
});