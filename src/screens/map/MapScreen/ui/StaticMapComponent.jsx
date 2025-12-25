// SimpleInteractiveMap.js - интерактивная карта с поддержкой жестов
import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    Alert,
    Linking,
    TapGestureHandler,
    PinchGestureHandler,
    State
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logData } from '@shared/lib/logger';
import {PanGestureHandler} from "react-native-gesture-handler";

const { width: screenWidth } = Dimensions.get('window');

export const SimpleInteractiveMap = ({
                                         latitude = 43.172837,
                                         longitude = 44.811913,
                                         address,
                                         style,
                                         height = 300,
                                         interactive = false,
                                         onLocationChange,
                                         onMapPress
                                     }) => {
    const [currentCoords, setCurrentCoords] = useState({ latitude, longitude });
    const [zoom, setZoom] = useState(15);
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // Refs для отслеживания жестов
    const lastPan = useRef({ x: 0, y: 0 });
    const baseScale = useRef(1);
    const lastPinchScale = useRef(1);
    const mapContainerRef = useRef(null);

    // Генерируем URL для статической карты
    const generateMapUrl = useCallback(() => {
        const lat = parseFloat(currentCoords.latitude) || 43.172837;
        const lng = parseFloat(currentCoords.longitude) || 44.811913;
        const mapWidth = Math.min(screenWidth - 32, 400);
        const mapHeight = Math.min(height - (interactive ? 80 : 0), 400);

        return `https://static-maps.yandex.ru/1.x/?ll=${lng},${lat}&size=${mapWidth},${mapHeight}&z=${zoom}&l=map&pt=${lng},${lat},pm2rdm`;
    }, [currentCoords, zoom, height, interactive]);

    // Конвертация пикселей в координаты
    const pixelsToCoordinates = useCallback((pixelX, pixelY, containerWidth, containerHeight) => {
        // Приблизительный расчет на основе зума и размера карты
        const latRange = 0.01 * Math.pow(2, 15 - zoom);
        const lngRange = 0.01 * Math.pow(2, 15 - zoom);

        // Нормализуем координаты пикселей к диапазону [-0.5, 0.5]
        const normalizedX = (pixelX / containerWidth) - 0.5;
        const normalizedY = 0.5 - (pixelY / containerHeight); // Y инвертирован

        const newLat = currentCoords.latitude + (normalizedY * latRange);
        const newLng = currentCoords.longitude + (normalizedX * lngRange);

        return {
            latitude: Math.max(-90, Math.min(90, newLat)),
            longitude: Math.max(-180, Math.min(180, newLng))
        };
    }, [currentCoords, zoom]);

    // Обработчик нажатия на карту
    const handleMapTap = useCallback((event) => {
        if (!interactive || isDragging) return;

        const { locationX, locationY } = event.nativeEvent;

        // Получаем размеры контейнера карты
        if (mapContainerRef.current) {
            mapContainerRef.current.measure((x, y, width, height) => {
                const newCoords = pixelsToCoordinates(locationX, locationY, width, height);

                setSelectedPoint({ x: locationX, y: locationY });
                setCurrentCoords(newCoords);

                logData('SimpleInteractiveMap: Нажатие на карту', {
                    pixelCoords: { x: locationX, y: locationY },
                    coordinates: newCoords
                });

                if (onLocationChange) {
                    onLocationChange(newCoords);
                }

                if (onMapPress) {
                    onMapPress({
                        nativeEvent: {
                            coordinate: newCoords
                        }
                    });
                }
            });
        }
    }, [interactive, isDragging, pixelsToCoordinates, onLocationChange, onMapPress]);

    // Обработчик перетаскивания карты
    const handlePanGesture = useCallback((event) => {
        if (!interactive) return;

        const { state, translationX, translationY } = event.nativeEvent;

        switch (state) {
            case State.BEGAN:
                setIsDragging(true);
                lastPan.current = { x: translationX, y: translationY };
                break;

            case State.ACTIVE:
                const deltaX = translationX - lastPan.current.x;
                const deltaY = translationY - lastPan.current.y;
                lastPan.current = { x: translationX, y: translationY };

                // Конвертируем движение в изменение координат
                const latRange = 0.01 * Math.pow(2, 15 - zoom);
                const lngRange = 0.01 * Math.pow(2, 15 - zoom);

                const sensitivity = 0.002; // Чувствительность перетаскивания
                const latChange = (deltaY / height) * latRange * sensitivity;
                const lngChange = -(deltaX / (screenWidth - 32)) * lngRange * sensitivity;

                const newCoords = {
                    latitude: Math.max(-90, Math.min(90, currentCoords.latitude + latChange)),
                    longitude: Math.max(-180, Math.min(180, currentCoords.longitude + lngChange))
                };

                setCurrentCoords(newCoords);
                setSelectedPoint(null); // Убираем выбранную точку при перетаскивании

                if (onLocationChange) {
                    onLocationChange(newCoords);
                }
                break;

            case State.END:
            case State.CANCELLED:
                setIsDragging(false);
                break;
        }
    }, [interactive, currentCoords, zoom, height, onLocationChange]);

    // Обработчик жеста масштабирования
    const handlePinchGesture = useCallback((event) => {
        if (!interactive) return;

        const { state, scale } = event.nativeEvent;

        switch (state) {
            case State.BEGAN:
                baseScale.current = scale;
                lastPinchScale.current = scale;
                break;

            case State.ACTIVE:
                const currentScale = scale / baseScale.current;
                const scaleChange = currentScale - lastPinchScale.current;

                if (Math.abs(scaleChange) > 0.1) { // Порог для изменения зума
                    if (scaleChange > 0 && zoom < 18) {
                        setZoom(prevZoom => Math.min(18, prevZoom + 1));
                    } else if (scaleChange < 0 && zoom > 10) {
                        setZoom(prevZoom => Math.max(10, prevZoom - 1));
                    }
                    lastPinchScale.current = currentScale;
                }
                break;

            case State.END:
            case State.CANCELLED:
                break;
        }
    }, [interactive, zoom]);

    // Управление зумом кнопками
    const zoomIn = () => {
        if (zoom < 18) {
            setZoom(zoom + 1);
            setSelectedPoint(null);
        }
    };

    const zoomOut = () => {
        if (zoom > 10) {
            setZoom(zoom - 1);
            setSelectedPoint(null);
        }
    };

    // Сброс к исходной позиции
    const resetToCenter = () => {
        setCurrentCoords({ latitude, longitude });
        setSelectedPoint(null);
        setZoom(15);
    };

    // Открыть в внешнем приложении карт
    const openInMaps = async () => {
        const lat = parseFloat(currentCoords.latitude);
        const lng = parseFloat(currentCoords.longitude);

        try {
            const mapOptions = [
                {
                    name: 'Yandex Maps',
                    url: `https://yandex.ru/maps/?pt=${lng},${lat}&z=15`
                },
                {
                    name: 'Google Maps',
                    url: `https://www.google.com/maps?q=${lat},${lng}`
                },
                {
                    name: '2GIS',
                    url: `https://2gis.ru/geo/${lng},${lat}`
                }
            ];

            Alert.alert(
                'Выберите карту',
                'В какой карте открыть местоположение?',
                [
                    { text: 'Отмена', style: 'cancel' },
                    ...mapOptions.map(option => ({
                        text: option.name,
                        onPress: () => Linking.openURL(option.url)
                    }))
                ]
            );
        } catch (error) {
            console.error('Ошибка при открытии карт:', error);
        }
    };

    const formatCoordinates = () => {
        return `${currentCoords.latitude.toFixed(6)}, ${currentCoords.longitude.toFixed(6)}`;
    };

    // Обновляем координаты при изменении props
    React.useEffect(() => {
        if (latitude && longitude) {
            setCurrentCoords({ latitude, longitude });
        }
    }, [latitude, longitude]);

    const MapContent = () => (
        <View style={styles.mapContainer} ref={mapContainerRef}>
            <Image
                source={{ uri: generateMapUrl() }}
                style={styles.mapImage}
                resizeMode="cover"
                onError={(error) => {
                    console.log('Ошибка загрузки карты:', error);
                }}
            />

            {/* Оверлей с координатами */}
            <View style={styles.coordinatesOverlay}>
                <Text style={styles.coordinatesText}>{formatCoordinates()}</Text>
                {address && <Text style={styles.addressText}>{address}</Text>}
            </View>

            {/* Выбранная точка */}
            {selectedPoint && (
                <View
                    style={[
                        styles.selectedPointMarker,
                        {
                            left: selectedPoint.x - 10,
                            top: selectedPoint.y - 20
                        }
                    ]}
                >
                    <Ionicons name="location" size={20} color="#FF0000" />
                </View>
            )}

            {/* Центральный маркер когда нет выбранной точки */}
            {!selectedPoint && (
                <View style={styles.centerMarker}>
                    <Ionicons name="add" size={20} color="#0066CC" />
                </View>
            )}

            {/* Кнопка открытия в картах */}
            <TouchableOpacity
                style={styles.openButton}
                onPress={openInMaps}
            >
                <Ionicons name="open-outline" size={16} color="white" />
                <Text style={styles.openButtonText}>Открыть</Text>
            </TouchableOpacity>

            {/* Кнопка сброса */}
            <TouchableOpacity
                style={styles.resetButton}
                onPress={resetToCenter}
            >
                <Ionicons name="refresh" size={16} color="white" />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { height }, style]}>
            {/* Карта с жестами */}
            {interactive ? (
                <PinchGestureHandler onGestureEvent={handlePinchGesture}>
                    <PanGestureHandler onGestureEvent={handlePanGesture}>
                        <TapGestureHandler onActivated={handleMapTap}>
                            <MapContent />
                        </TapGestureHandler>
                    </PanGestureHandler>
                </PinchGestureHandler>
            ) : (
                <MapContent />
            )}

            {/* Элементы управления */}
            {interactive && (
                <View style={styles.controls}>
                    {/* Информация о текущем состоянии */}
                    <View style={styles.statusInfo}>
                        <Text style={styles.statusText}>
                            Зум: {zoom} | {selectedPoint ? '✓ Точка выбрана' : 'Нажмите для выбора'}
                        </Text>
                    </View>

                    {/* Зум кнопки */}
                    <View style={styles.zoomControls}>
                        <TouchableOpacity
                            style={[styles.zoomButton, zoom >= 18 && styles.disabledButton]}
                            onPress={zoomIn}
                            disabled={zoom >= 18}
                        >
                            <Ionicons name="add" size={20} color={zoom >= 18 ? "#ccc" : "#333"} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.zoomButton, zoom <= 10 && styles.disabledButton]}
                            onPress={zoomOut}
                            disabled={zoom <= 10}
                        >
                            <Ionicons name="remove" size={20} color={zoom <= 10 ? "#ccc" : "#333"} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Инструкции */}
            {interactive && (
                <View style={styles.instructions}>
                    <Text style={styles.instructionsText}>
                        {selectedPoint
                            ? `✓ Выбрана точка: ${formatCoordinates()}`
                            : "👆 Нажмите на карту для выбора точки • 🖐️ Перетаскивайте для перемещения • 🤏 Щипок для масштабирования"
                        }
                    </Text>
                </View>
            )}
        </View>
    );
};

// Экспорт компонента как StaticMapComponent для совместимости
export const StaticMapComponent = SimpleInteractiveMap;

const styles = StyleSheet.create({
    container: {
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    mapImage: {
        width: '100%',
        height: '100%',
    },
    coordinatesOverlay: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 6,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        maxWidth: '70%',
    },
    coordinatesText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#333',
    },
    addressText: {
        fontSize: 10,
        color: '#666',
        marginTop: 2,
    },
    selectedPointMarker: {
        position: 'absolute',
        zIndex: 10,
    },
    centerMarker: {
        position: 'absolute',
        top: 140, // Исправлено с '50%' на числовое значение (примерно половина высоты 300)
        left: 180, // Исправлено с '50%' на числовое значение (примерно половина ширины экрана)
        marginTop: -10,
        marginLeft: -10,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#0066CC',
    },
    openButton: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: 'rgba(51, 57, 176, 0.9)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    openButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    resetButton: {
        position: 'absolute',
        bottom: 10,
        right: 90,
        backgroundColor: 'rgba(108, 117, 125, 0.9)',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    statusInfo: {
        flex: 1,
        marginRight: 12,
    },
    statusText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    zoomControls: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    zoomButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    disabledButton: {
        opacity: 0.5,
    },
    instructions: {
        padding: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },
    instructionsText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        lineHeight: 16,
    },
});