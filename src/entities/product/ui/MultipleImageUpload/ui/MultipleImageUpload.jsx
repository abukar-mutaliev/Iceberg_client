import React from "react";
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Image,
    ScrollView,
    Dimensions
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Entypo } from "@expo/vector-icons";
import { useCustomAlert } from '@shared/ui/CustomAlert/CustomAlertProvider';

const { width } = Dimensions.get('window');

export const MultipleImageUpload = ({ photos, setPhotos, error, maxImages = 5 }) => {
    const { showWarning, showError } = useCustomAlert();

    const pickImage = async () => {
        if (photos && photos.length >= maxImages) {
            showWarning("Лимит изображений", `Вы можете добавить максимум ${maxImages} изображений`);
            return;
        }

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: false,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const newImage = result.assets[0].uri;
                console.log('Выбрано изображение:', newImage);
                setPhotos(photos ? [...photos, newImage] : [newImage]);
            }
        } catch (error) {
            console.error('Ошибка при выборе изображения:', error);
            showError("Ошибка", "Не удалось выбрать изображение");
        }
    };

    const removeImage = (index) => {
        const newPhotos = [...photos];
        newPhotos.splice(index, 1);
        setPhotos(newPhotos);
    };

    const hasImages = photos && photos.length > 0;

    return (
        <View style={styles.container}>
            {/* Кнопка выбора изображения - всегда показывает иконку камеры */}
            <TouchableOpacity
                style={[
                    styles.photoContainer,
                    error ? styles.photoContainerError : null
                ]}
                onPress={pickImage}
                disabled={photos && photos.length >= maxImages}
            >
                <View style={styles.iconContainer}>
                    <Entypo name="camera" size={24} color="#888" />
                    <Text style={styles.uploadText}>Добавить фото</Text>
                </View>
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Отображаем выбранные изображения в горизонтальном скролле */}
            {hasImages && (
                <View style={styles.thumbnailsWrapper}>
                    <ScrollView
                        horizontal={true}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.thumbnailsContainer}
                        scrollEventThrottle={16}
                        alwaysBounceHorizontal={true}
                        directionalLockEnabled={true}
                    >
                        {photos.map((item, index) => (
                            <View
                                key={`thumb-${index}`}
                                style={styles.thumbnailContainer}
                            >
                                {/* Оборачиваем изображение в TouchableOpacity для улучшения UX */}
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    style={styles.thumbnailTouchable}
                                    onPress={() => {}}
                                >
                                    <Image source={{ uri: item }} style={styles.thumbnail} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() => removeImage(index)}
                                    hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                                >
                                    <Entypo name="cross" size={18} color="white" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            <Text style={styles.helperText}>
                {photos ? `${photos.length}/${maxImages} фото` : `0/${maxImages} фото`}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 10,
        width: "100%"
    },
    photoContainer: {
        width: "100%",
        height: 100,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
    },
    photoContainerError: {
        borderColor: "#FF3B30",
        borderWidth: 1.5,
    },
    iconContainer: {
        alignItems: "center",
        justifyContent: "center",
    },
    uploadText: {
        marginTop: 8,
        color: "#888",
        fontSize: 14,
    },
    errorText: {
        color: "#FF3B30",
        fontSize: 12,
        marginTop: 5,
    },
    thumbnailsWrapper: {
        marginTop: 8,
        width: "100%",
        height: 60,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    thumbnailsContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 5,
        paddingRight: 10,
        paddingLeft: 0,
    },
    thumbnailContainer: {
        width: 50,
        height: 50,
        borderRadius: 4,
        marginRight: 8,
        marginLeft: 0,
        overflow: "hidden",
        position: "relative",
    },
    // Новый стиль для обертки изображения
    thumbnailTouchable: {
        width: "100%",
        height: "100%",
        borderRadius: 4,
        overflow: "hidden",
    },
    thumbnail: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    removeButton: {
        position: "absolute",
        top: 0,
        right: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
    },
    helperText: {
        fontSize: 12,
        color: "#888",
        marginTop: 4,
    },
});