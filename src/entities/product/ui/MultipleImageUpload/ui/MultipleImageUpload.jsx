import React, { useState, useMemo } from "react";
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Image,
    ScrollView,
    Dimensions,
    Modal,
    ActivityIndicator,
    Platform
} from "react-native";
import Slider from '@react-native-community/slider';
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Entypo } from "@expo/vector-icons";
import { useCustomAlert } from '@shared/ui/CustomAlert/CustomAlertProvider';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const { width } = Dimensions.get('window');

export const MultipleImageUpload = ({ photos, setPhotos, error, maxImages = 5 }) => {
    const { showWarning, showError } = useCustomAlert();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const [editorVisible, setEditorVisible] = useState(false);
    const [pendingImage, setPendingImage] = useState(null);
    const [selectedScale, setSelectedScale] = useState(1);
    const scaleRef = React.useRef(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const minScale = 0.6;
    const maxScale = 1.4;

    const pickImage = async () => {
        if (photos && photos.length >= maxImages) {
            showWarning("Лимит изображений", `Вы можете добавить максимум ${maxImages} изображений`);
            return;
        }

        try {
            if (Platform.OS !== 'android') {
                const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

                if (!permissionResult.granted) {
                    showError("Ошибка", "Необходимо предоставить доступ к галерее");
                    return;
                }
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: false,
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const newImage = {
                    uri: asset.uri,
                    width: asset.width,
                    height: asset.height,
                    fileSize: asset.fileSize,
                    mimeType: asset.mimeType
                };
                
                // Предупреждаем о большом размере файла
                if (newImage.fileSize && newImage.fileSize > 5 * 1024 * 1024) {
                    showWarning(
                        "Большой файл",
                        "Это изображение имеет большой размер. Загрузка может занять некоторое время."
                    );
                }

                console.log('Выбрано изображение:', newImage.uri);
                setPendingImage(newImage);
                setSelectedScale(1);
                scaleRef.current = 1;
                setEditorVisible(true);
            }
        } catch (error) {
            console.error('Ошибка при выборе изображения:', error);
            showError("Ошибка", "Не удалось выбрать изображение: " + (error.message || error));
        }
    };

    const removeImage = (index) => {
        const newPhotos = [...photos];
        newPhotos.splice(index, 1);
        setPhotos(newPhotos);
    };

    const closeEditor = () => {
        setEditorVisible(false);
        setPendingImage(null);
        setSelectedScale(1);
        scaleRef.current = 1;
        setIsProcessing(false);
    };

    const applyImage = async () => {
        if (!pendingImage?.uri) {
            closeEditor();
            return;
        }

        try {
            setIsProcessing(true);

            let width = pendingImage.width || 0;
            let height = pendingImage.height || 0;
            if ((!width || !height) && pendingImage.uri) {
                try {
                    const size = await new Promise((resolve, reject) => {
                        Image.getSize(pendingImage.uri, (w, h) => resolve({ w, h }), reject);
                    });
                    width = size.w;
                    height = size.h;
                } catch (sizeError) {
                    console.warn('Не удалось получить размер изображения:', sizeError);
                }
            }

            const scale = scaleRef.current || selectedScale;
            console.log('[MultipleImageUpload] Apply scale', {
                uri: pendingImage?.uri,
                width,
                height,
                selectedScale,
                scaleRef: scaleRef.current,
                usedScale: scale
            });
            const shouldProcess = width > 0 && height > 0 && scale !== 1;
            const uriLower = (pendingImage.uri || "").toLowerCase();
            const isPng = pendingImage.mimeType === 'image/png' || uriLower.endsWith('.png');

            let finalUri = pendingImage.uri;

            if (shouldProcess) {
                const actions = [];

                if (scale > 1) {
                    const cropWidth = Math.max(1, Math.round(width / scale));
                    const cropHeight = Math.max(1, Math.round(height / scale));
                    const originX = Math.max(0, Math.round((width - cropWidth) / 2));
                    const originY = Math.max(0, Math.round((height - cropHeight) / 2));

                    actions.push({ crop: { originX, originY, width: cropWidth, height: cropHeight } });
                    actions.push({ resize: { width, height } });
                } else {
                    const targetWidth = Math.max(1, Math.round(width * scale));
                    const targetHeight = Math.max(1, Math.round(height * scale));
                    actions.push({ resize: { width: targetWidth, height: targetHeight } });
                }

                console.log('[MultipleImageUpload] Manipulator actions', actions);
                const processed = await ImageManipulator.manipulateAsync(
                    pendingImage.uri,
                    actions,
                    {
                        compress: 1,
                        format: isPng ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG
                    }
                );
                console.log('[MultipleImageUpload] Manipulator result', {
                    uri: processed?.uri,
                    width: processed?.width,
                    height: processed?.height
                });
                finalUri = processed.uri;
            } else {
                console.log('[MultipleImageUpload] Skip processing', {
                    width,
                    height,
                    usedScale: scale
                });
            }

            setPhotos(photos ? [...photos, finalUri] : [finalUri]);
            closeEditor();
        } catch (error) {
            console.error('Ошибка при обработке изображения:', error);
            showError("Ошибка", "Не удалось обработать изображение: " + (error.message || error));
            closeEditor();
        }
    };

    const keepOriginal = () => {
        if (pendingImage?.uri) {
            setPhotos(photos ? [...photos, pendingImage.uri] : [pendingImage.uri]);
        }
        closeEditor();
    };

    const getSizeLabel = () => {
        if (!pendingImage?.width || !pendingImage?.height) return "";
        const w = Math.max(1, Math.round(pendingImage.width * selectedScale));
        const h = Math.max(1, Math.round(pendingImage.height * selectedScale));
        return `${w}×${h}px`;
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
                    <Entypo name="camera" size={24} color={isDark ? colors.textTertiary : '#888'} />
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

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Text style={styles.helperText}>
                {photos ? `${photos.length}/${maxImages} фото` : `0/${maxImages} фото`}
            </Text>

            <Modal
                visible={editorVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={closeEditor}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Настройка изображения</Text>
                        {pendingImage?.uri ? (
                            <View style={styles.previewWrapper}>
                                <Image
                                    source={{ uri: pendingImage.uri }}
                                    style={styles.previewBackground}
                                    blurRadius={20}
                                />
                                <Image
                                    source={{ uri: pendingImage.uri }}
                                    style={[
                                        styles.previewForeground,
                                        { transform: [{ scale: selectedScale }] }
                                    ]}
                                    resizeMode="contain"
                                />
                            </View>
                        ) : null}

                        <Text style={styles.sizeLabel}>
                            Размер: {getSizeLabel() || "неизвестен"}
                        </Text>

                        <View style={styles.scaleRow}>
                            <Text style={styles.scaleLabel}>
                                Масштаб: {Math.round(selectedScale * 100)}%
                            </Text>
                            <Slider
                                style={styles.scaleSlider}
                                minimumValue={minScale}
                                maximumValue={maxScale}
                                step={0.05}
                                value={selectedScale}
                                onValueChange={(value) => {
                                    scaleRef.current = value;
                                    setSelectedScale(value);
                                }}
                                minimumTrackTintColor={colors.primary}
                                maximumTrackTintColor={isDark ? colors.border : '#E5E7EB'}
                                thumbTintColor={colors.primary}
                                disabled={isProcessing}
                            />
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.actionSecondary]}
                                onPress={keepOriginal}
                                disabled={isProcessing}
                            >
                                <Text style={styles.actionSecondaryText}>Оставить как есть</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.actionPrimary]}
                                onPress={applyImage}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.actionPrimaryText}>Применить</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        marginBottom: 10,
        width: "100%"
    },
    photoContainer: {
        width: "100%",
        height: 100,
        borderWidth: 1,
        borderColor: isDark ? colors.border : "#ccc",
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: isDark ? colors.surfaceElevated : "#f5f5f5",
    },
    photoContainerError: {
        borderColor: colors.error,
        borderWidth: 1.5,
    },
    iconContainer: {
        alignItems: "center",
        justifyContent: "center",
    },
    uploadText: {
        marginTop: 8,
        color: isDark ? colors.textSecondary : "#888",
        fontSize: 14,
    },
    errorText: {
        color: colors.error,
        fontSize: 12,
        marginTop: 5,
    },
    thumbnailsWrapper: {
        marginTop: 8,
        width: "100%",
        height: 60,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0 : 0.1,
        shadowRadius: 2,
        elevation: isDark ? 0 : 1,
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
        color: isDark ? colors.textSecondary : "#888",
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.modalOverlay,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        width: "100%",
        maxWidth: 420,
        backgroundColor: isDark ? colors.surface : "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: isDark ? colors.textPrimary : "#1A1A1A",
        marginBottom: 12,
    },
    previewWrapper: {
        width: "100%",
        height: 220,
        borderRadius: 12,
        backgroundColor: isDark ? colors.surfaceElevated : "#F2F2F2",
        overflow: "hidden",
        marginBottom: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    previewBackground: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        resizeMode: "cover",
        opacity: 0.9,
    },
    previewForeground: {
        width: "100%",
        height: "100%",
    },
    sizeLabel: {
        fontSize: 13,
        color: isDark ? colors.textSecondary : "#666",
        marginBottom: 12,
        textAlign: "center",
    },
    scaleRow: {
        marginBottom: 16,
    },
    scaleLabel: {
        fontSize: 13,
        color: isDark ? colors.textPrimary : "#374151",
        fontWeight: "600",
        marginBottom: 6,
    },
    scaleSlider: {
        width: "100%",
        height: 40,
    },
    modalActions: {
        flexDirection: "row",
        gap: 10,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    actionSecondary: {
        backgroundColor: isDark ? colors.surfaceElevated : "#F3F4F6",
    },
    actionPrimary: {
        backgroundColor: colors.primary,
    },
    actionSecondaryText: {
        color: isDark ? colors.textPrimary : "#374151",
        fontSize: 14,
        fontWeight: "600",
    },
    actionPrimaryText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "600",
    },
});