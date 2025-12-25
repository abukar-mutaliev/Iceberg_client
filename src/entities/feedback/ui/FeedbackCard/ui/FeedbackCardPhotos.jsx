import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';

/**
 * Компонент для отображения фотографий в отзыве
 *
 * @param {Object} props
 * @param {string[]} props.photoUrls - Массив URL фотографий
 * @param {Function} props.onPhotoPress - Обработчик нажатия на фото
 */
export const FeedbackCardPhotos = ({ photoUrls = [], onPhotoPress }) => {
    if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) {
        return null;
    }

    return (
        <View style={styles.photosContainer}>
            <View style={styles.photosRow}>
                {photoUrls.slice(0, 4).map((url, index) => (
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