import React, {useState, useEffect, useMemo} from 'react';
import {
    View,
    Text,
    Pressable,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    useWindowDimensions,
} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

import { Sunzha } from "@shared/ui/InteractiveMapIngushetia/ui/districts/Sunzha";
import { Malgobek } from "@shared/ui/InteractiveMapIngushetia/ui/districts/Malgobek";
import { Nazran } from "@shared/ui/InteractiveMapIngushetia/ui/districts/Nazran";
import { Prigorodny } from "@shared/ui/InteractiveMapIngushetia/ui/districts/Prigorodny";
import { Dzheirakh } from "@shared/ui/InteractiveMapIngushetia/ui/districts/Dzheirakh";
import { useDistrict } from "@entities/district";
import { useSelector } from 'react-redux';
import { selectDistrictsWithStats } from "@entities/district/model/selectors";
import { Color } from "@app/styles/GlobalStyles";
import { Loader } from "@shared/ui/Loader";
import { ErrorState } from "@shared/ui/states/ErrorState";

// Базовая ширина для дизайна (эталон)
const BASE_DESIGN_WIDTH = 400;
const BASE_DESIGN_HEIGHT = 800;

// Ограничения масштабирования для предотвращения слишком маленьких/больших размеров
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.5;

export const InteractiveMap = ({ onDistrictSelect }) => {
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [showInfo, setShowInfo] = useState(false);

    // Используем useWindowDimensions для адаптивности при изменении ориентации
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    // Адаптивные коэффициенты масштабирования
    const scaleUI = useMemo(() => {
        const scale = Math.min(screenWidth / BASE_DESIGN_WIDTH, screenHeight / BASE_DESIGN_HEIGHT);
        return Math.max(MIN_SCALE, Math.min(scale, MAX_SCALE));
    }, [screenWidth, screenHeight]);

    // Коэффициент масштабирования для позиций районов (основан на ширине)
    const scaleDistricts = useMemo(() => {
        const scale = screenWidth / BASE_DESIGN_WIDTH;
        // Ограничиваем масштабирование для сохранения пропорций
        return Math.max(MIN_SCALE, Math.min(scale, MAX_SCALE));
    }, [screenWidth]);

    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedScale = useSharedValue(1);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const districtsWithStats = useSelector(selectDistrictsWithStats);
    const {
        isLoading = false,
        error = null,
        loadDistricts,
        clearError
    } = useDistrict();

    useEffect(() => {
        loadDistricts();
    }, [loadDistricts]);

    // Маппинг по названиям районов (более надежный)
    const nameToLocalMapping = {
        'Малгобекский район': 'malgobek',
        'Назрановский район': 'nazran',
        'Сунженский район': 'sunzha',
        'Пригородный район': 'prigorodny',
        'Джейрахский район': 'dzheirakhsky'

    };

    const defaultDistrictNames = {
        malgobek: 'Малгобекский район',
        nazran: 'Назрановский район',
        sunzha: 'Сунженский район',
        prigorodny: 'Пригородный район',
        dzheirakhsky: 'Джейрахский район',
    };

    const districtColors = {
        malgobek: '#FEFEFE',
        nazran: '#D2CDE7',
        prigorodny: '#D6E9D8',
        dzheirakhsky: '#A2D9F7',
        sunzha: '#EBECEC',
    };

    const getRegionInfo = () => {
        const regionInfo = {};

        // Если есть данные с сервера, используем их
        if (districtsWithStats && districtsWithStats.length > 0) {
            districtsWithStats.forEach(district => {
                const localKey = nameToLocalMapping[district.name];
                if (localKey) {
                    regionInfo[localKey] = {
                        id: district.id,
                        name: district.name,
                        description: district.description,
                        color: districtColors[localKey] || '#E5E7EB',
                        driversCount: district.driversCount || 0,
                        clientsCount: district.clientsCount || 0,
                        stopsCount: district.stopsCount || 0,
                        totalCount: district.totalCount || 0,
                        createdAt: district.createdAt,
                        updatedAt: district.updatedAt,
                    };
                }
            });
        } else {
            // Если данных нет (ошибка или загрузка), показываем базовые названия
            Object.entries(defaultDistrictNames).forEach(([key, name]) => {
                regionInfo[key] = {
                    id: null,
                    name: name,
                    description: 'Данные загружаются...',
                    color: districtColors[key] || '#E5E7EB',
                    driversCount: 0,
                    clientsCount: 0,
                    stopsCount: 0,
                    totalCount: 0,
                };
            });
        }

        return regionInfo;
    };

    const regionInfo = getRegionInfo();

    // ==========================================
    // КОНФИГУРАЦИЯ ПОЗИЦИЙ РАЙОНОВ
    // Регулируйте значения ниже для корректного соединения районов в цельную карту
    // Все значения указаны для эталонной ширины экрана 400px
    //
    // ВИЗУАЛЬНАЯ СХЕМА КАРТЫ (вид сверху):
    // ┌─────────────────────────────────────┐
    // │ [Малгобек] [Назран]         [Сунжа]│ ← top: -2, 92, 40
    // │               │                │    │
    // │          [Пригородный]         │    │
    // │               │                │    │
    // │         [Джейрахский]              │ ← bottom
    // └─────────────────────────────────────┘
    //
    // ПАРАМЕТРЫ ДЛЯ НАСТРОЙКИ:
    // - position.left/right - горизонтальная позиция (в пикселях для 400px ширины)
    // - position.top - вертикальная позиция (в пикселях для 400px ширины)
    // - size.width - ширина в пикселях (для 400px ширины экрана)
    // - size.height - высота в пикселях (для 400px ширины экрана)
    // - zIndex - порядок слоев (больше = выше, перекрывает нижние)
    // - hitSlop - дополнительная область для нажатия (в пикселях)
    // ==========================================
    
    const districtConfig = {
        // Малгобекский район - верхний левый угол карты
        malgobek: {
            position: { left: 105, top: 0 }, // Позиция от левого верхнего угла
            size: { width: 148, height: 128 }, // Фиксированные размеры в пикселях
            zIndex: 2, // Слой отображения (меньше = ниже)
            hitSlop: 10, // Дополнительная область для нажатия
            borderRadius: 8,
        },
        
        // Назрановский район - центр-верх карты
        nazran: {
            position: { left: 152, top: 93.5 },
            size: { width: 140, height: 140 },
            zIndex: 5, // Выше остальных (перекрывает соседние)
            hitSlop: 0,
            borderRadius: 10,
        },
        
        // Сунженский район - правый верх карты (высокий)
        sunzha: {
            position: { right: 50, top: 49 }, // Используем right вместо left
            size: { width: 116, height: 302 },
            zIndex: 1, // Самый нижний слой
            hitSlop: 0,
            borderRadius: 12,
        },
        
        // Пригородный район - центр карты
        prigorodny: {
            position: { left: 147, top: 129 },
            size: { width: 130, height: 237 },
            zIndex: 4,
            hitSlop: 0,
            borderRadius: 8,
        },
        
        // Джейрахский район - нижняя часть карты (широкий)
        dzheirakhsky: {
            position: { left: 144, top: 311 },
            size: { width: 192, height: 144 },
            zIndex: 3,
            hitSlop: 5,
            borderRadius: 10,
        },
    };

    // Адаптивные размеры и позиции районов (генерируются из конфигурации)
    const districts = useMemo(() => {
        // Функция для создания стиля района из конфигурации
        const createDistrictStyle = (config) => {
            const { position, size, zIndex, hitSlop, borderRadius } = config;
            const hitSlopValue = hitSlop * scaleDistricts;
            
            const style = {
                position: 'absolute',
                zIndex,
            };
            
            // Обрабатываем left/right/top позиции - масштабируем единообразно
            if (position.left !== undefined) {
                style.left = position.left * scaleDistricts;
            }
            if (position.right !== undefined) {
                style.right = position.right * scaleDistricts;
            }
            if (position.top !== undefined) {
                style.top = position.top * scaleDistricts;
            }
            if (position.bottom !== undefined) {
                style.bottom = position.bottom * scaleDistricts;
            }
            
            return {
                style,
                // Масштабируем размеры так же, как и позиции - для сохранения пропорций
                width: size.width * scaleDistricts,
                height: size.height * scaleDistricts,
                hitSlop: {
                    top: hitSlopValue,
                    bottom: hitSlopValue,
                    left: hitSlopValue,
                    right: hitSlopValue,
                },
                pressableStyle: {
                    borderRadius: borderRadius * scaleDistricts,
                }
            };
        };

        return [
        {
            id: 'malgobek',
            Component: Malgobek,
            ...createDistrictStyle(districtConfig.malgobek),
        },
        {
            id: 'nazran',
            Component: Nazran,
            ...createDistrictStyle(districtConfig.nazran),
        },
        {
            id: 'sunzha',
            Component: Sunzha,
            ...createDistrictStyle(districtConfig.sunzha),
        },
        {
            id: 'prigorodny',
            Component: Prigorodny,
            ...createDistrictStyle(districtConfig.prigorodny),
        },
        {
            id: 'dzheirakhsky',
            Component: Dzheirakh,
            ...createDistrictStyle(districtConfig.dzheirakhsky),
        },
        ];
    }, [screenWidth, screenHeight, scaleDistricts]);

    const handleRegionPress = (regionId) => {
        if (regionInfo[regionId]) {
            setSelectedRegion(regionId);
            setShowInfo(true);
            selectDistrict(regionId);
        }
    };

    const selectDistrict = (regionId) => {
        const region = regionInfo[regionId];
        if (region && onDistrictSelect) {
            onDistrictSelect({
                id: region.id,
                name: region.name,
                description: region.description,
                color: region.color
            });
        }
    };

    const resetDistrictSelection = () => {
        if (onDistrictSelect) {
            onDistrictSelect(null);
        }
        setShowInfo(false);
        setSelectedRegion(null);
    };

    const pinchGesture = Gesture.Pinch()
        .onStart(() => {
            savedScale.value = scale.value;
        })
        .onUpdate((event) => {
            scale.value = Math.max(0.5, Math.min(savedScale.value * event.scale, 3));
        })
        .onEnd(() => {
            scale.value = withSpring(Math.max(0.5, Math.min(scale.value, 3)));
            savedScale.value = scale.value;
        });

    const panGesture = Gesture.Pan()
        .onStart(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        })
        .onUpdate((event) => {
            translateX.value = savedTranslateX.value + event.translationX;
            translateY.value = savedTranslateY.value + event.translationY;
        })
        .onEnd(() => {
            translateX.value = withSpring(translateX.value);
            translateY.value = withSpring(translateY.value);
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {translateX: translateX.value},
                {translateY: translateY.value},
                {scale: scale.value},
            ],
        };
    });

    // Функции для управления зумом
    const zoomIn = () => {
        scale.value = withSpring(Math.min(scale.value + 0.5, 3));
        savedScale.value = scale.value;
    };

    const zoomOut = () => {
        scale.value = withSpring(Math.max(scale.value - 0.5, 0.5));
        savedScale.value = scale.value;
    };

    const resetView = () => {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        setSelectedRegion(null);
        setShowInfo(false);
        resetDistrictSelection();
    };

    const retryLoad = () => {
        clearError();
        loadDistricts();
    };

    const InteractiveDistrict = ({ district }) => {
        const { id, Component, style, width, height, hitSlop, pressableStyle } = district;
        const [isPressed, setIsPressed] = useState(false);

        const hasData = regionInfo[id];

        return (
            <Pressable
                style={[
                    style,
                    pressableStyle,
                    {
                        opacity: selectedRegion && selectedRegion !== id ? 0.4 : hasData ? 1 : 0.6,
                        transform: [{ scale: isPressed ? 0.98 : 1 }],
                    }
                ]}
                hitSlop={hitSlop}
                onPress={() => handleRegionPress(id)}
                onPressIn={() => setIsPressed(true)}
                onPressOut={() => setIsPressed(false)}
                accessibilityLabel={`${regionInfo[id]?.name || id} район`}
                accessibilityHint="Нажмите для получения подробной информации"
                accessibilityRole="button"
                disabled={!hasData}
            >
                <Component
                    width={width}
                    height={height}
                    isSelected={selectedRegion === id}
                />
            </Pressable>
        );
    };

    const renderInfoPanel = () => {
        if (!showInfo || !selectedRegion || !regionInfo[selectedRegion]) {
            return null;
        }

        const region = regionInfo[selectedRegion];

        const regionName = String(region.name || 'Неизвестный район');
        const regionDescription = String(region.description || 'Описание не доступно');
        const regionStopsCount = String(region.stopsCount || 0);
        const regionColor = String(region.color || '#E5E7EB');

        return (
            <View style={styles.infoPanel}>
                <View style={styles.infoPanelContent}>
                    <View style={[styles.colorBar, {backgroundColor: regionColor}]}/>

                    <Text style={styles.regionTitle}>{regionName}</Text>

                    <Text style={styles.regionDescription}>{regionDescription}</Text>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Остановки:</Text>
                        <Text style={styles.infoValue}>{regionStopsCount}</Text>
                    </View>
                    <Pressable
                        style={styles.showAllButton}
                        onPress={resetDistrictSelection}
                    >
                        <Text style={styles.showAllButtonText}>
                            Показать все остановки
                        </Text>
                    </Pressable>

                </View>
            </View>
        );
    };

    const renderLegend = () => {
        const hasData = districtsWithStats && districtsWithStats.length > 0;
        
        return (
            <View style={styles.legend}>
                <Text style={styles.legendTitle}>Районы Ингушетии:</Text>
                {error && (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorBannerText}>
                            ⚠️ Ошибка загрузки данных. Нажмите "Повторить" для обновления.
                        </Text>
                        <Pressable style={styles.retrySmallButton} onPress={retryLoad}>
                            <Text style={styles.retrySmallButtonText}>Повторить</Text>
                        </Pressable>
                    </View>
                )}
                {isLoading && (
                    <Text style={styles.legendText}>Загрузка данных...</Text>
                )}
                {!hasData && !isLoading && !error && (
                    <Text style={styles.legendText}>Данные отсутствуют</Text>
                )}
                {hasData && (
                    <Text style={styles.legendSubtitle}>
                        Нажмите на район - остановки сразу отфильтруются
                    </Text>
                )}
                {Object.entries(regionInfo).map(([key, info]) => {
                    const driversCount = typeof info.driversCount === 'number' ? info.driversCount : 0;
                    const clientsCount = typeof info.clientsCount === 'number' ? info.clientsCount : 0;
                    const stopsCount = typeof info.stopsCount === 'number' ? info.stopsCount : 0;

                    return (
                        <Pressable
                            key={key}
                            style={[
                                styles.legendItem,
                                selectedRegion === key && styles.legendItemSelected,
                                !hasData && styles.legendItemDisabled
                            ]}
                            onPress={() => hasData && handleRegionPress(key)}
                            disabled={!hasData}
                        >
                            <View style={[styles.legendColor, {backgroundColor: info.color || '#E5E7EB'}]}/>
                            <View style={styles.legendTextContainer}>
                                <Text style={[
                                    styles.legendText,
                                    selectedRegion === key && styles.legendTextSelected,
                                    !hasData && styles.legendTextDisabled
                                ]}>
                                    {String(info.name || 'Неизвестный район')}
                                </Text>
                                <Text style={[styles.legendStopsCount, !hasData && styles.legendTextDisabled]}>
                                    {hasData ? `Остановок в этом районе: ${stopsCount}` : info.description}
                                </Text>
                            </View>
                        </Pressable>
                    );
                })}
            </View>
        );
    };

    const renderLoadingState = () => (
        <View style={styles.loadingContainer}>
            <Loader 
                type="youtube"
                color={Color.purpleSoft}
            />
            <Text style={styles.loadingText}>Загрузка данных районов...</Text>
        </View>
    );

    const renderErrorState = () => (
        <View style={styles.errorContainer}>
            <ErrorState
                message="Не удалось загрузить данные районов"
                onRetry={retryLoad}
                buttonText="Повторить"
            />
        </View>
    );

    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
                {renderErrorState()}
            </SafeAreaView>
        );
    }

    // Адаптивные стили на основе текущих размеров экрана
    const adaptiveStyles = useMemo(() => ({
        sideControls: {
            ...styles.sideControls,
            left: 16 * scaleUI,
            top: 200 * scaleUI,
            marginTop: -75 * scaleUI,
            padding: 8 * scaleUI,
        },
        sideControlButton: {
            ...styles.sideControlButton,
            width: 44 * scaleUI,
            height: 44 * scaleUI,
            marginBottom: 8 * scaleUI,
        },
        sideControlButtonText: {
            ...styles.sideControlButtonText,
            fontSize: 20 * scaleUI,
        },
        sideResetButtonText: {
            ...styles.sideResetButtonText,
            fontSize: 18 * scaleUI,
        },
        mapWrapper: {
            ...styles.mapWrapper,
            width: screenWidth,
            height: screenHeight * 0.5,
            paddingTop: 20 * scaleUI,
        },
        instruction: {
            ...styles.instruction,
            bottom: 2 * scaleUI,
            left: 16 * scaleUI,
            right: 16 * scaleUI,
            paddingHorizontal: 16 * scaleUI,
            paddingVertical: 5 * scaleUI,
        },
        instructionText: {
            ...styles.instructionText,
            fontSize: 14 * scaleUI,
        },
        bottomPanel: {
            ...styles.bottomPanel,
            minHeight: screenHeight * 0.25,
        },
    }), [screenWidth, screenHeight, scaleUI]);

    return (
        <SafeAreaView style={styles.container}>
            {/* Заголовок без кнопок управления */}
            <View style={styles.header}>
            </View>

            {/* Карта с боковыми кнопками управления */}
            <View style={styles.mapContainer}>
                {isLoading && renderLoadingState()}

                {/* Боковые кнопки управления */}
                <View style={adaptiveStyles.sideControls} pointerEvents="box-none">
                    <Pressable style={adaptiveStyles.sideControlButton} onPress={zoomIn}>
                        <Text style={adaptiveStyles.sideControlButtonText}>+</Text>
                    </Pressable>
                    <Pressable style={[adaptiveStyles.sideControlButton, styles.sideResetButton]} onPress={zoomOut}>
                        <Text style={adaptiveStyles.sideControlButtonText}>-</Text>
                    </Pressable>
                    <Pressable style={[adaptiveStyles.sideControlButton, styles.sideResetButton]} onPress={resetView}>
                        <Text style={adaptiveStyles.sideResetButtonText}>⌂</Text>
                    </Pressable>
                </View>

                <GestureDetector gesture={composedGesture}>
                    <Animated.View style={[styles.gestureContainer, animatedStyle]}>
                        <Animated.View style={adaptiveStyles.mapWrapper}>
                            {districts
                                .sort((a, b) => (b.style.zIndex || 0) - (a.style.zIndex || 0))
                                .map((district) => {
                                    if (!district.Component) {
                                        console.warn(`Компонент для района ${district.id} не найден`);
                                        return null;
                                    }

                                    return (
                                        <InteractiveDistrict
                                            key={district.id}
                                            district={district}
                                        />
                                    );
                                })
                            }
                        </Animated.View>
                    </Animated.View>
                </GestureDetector>

                {/* Инструкция */}
                {!showInfo && !isLoading && (
                    <View style={adaptiveStyles.instruction}>
                        <Text style={adaptiveStyles.instructionText}>
                            Нажмите на район - остановки сразу отфильтруются по этому району
                        </Text>
                    </View>
                )}
            </View>

            {/* Нижняя панель с информацией или легендой */}
            <View style={adaptiveStyles.bottomPanel}>
                <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {showInfo ? renderInfoPanel() : renderLegend()}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 0,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        minHeight: 0,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        textAlign: 'center',
        marginBottom: 12,
    },
    mapContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        backgroundColor: '#f0f9ff',
    },
    sideControls: {
        position: 'absolute',
        zIndex: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 12,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    sideControlButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    sideControlButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
    },
    sideResetButton: {
        backgroundColor: '#6b7280',
    },
    sideResetButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
    },
    gestureContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapWrapper: {
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    instruction: {
        position: 'absolute',
        backgroundColor: 'rgba(59, 130, 246, 0.9)',
        borderRadius: 8,
    },
    instructionText: {
        color: '#ffffff',
        textAlign: 'center',
        fontWeight: '500',
    },
    bottomPanel: {
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 24,
    },
    infoPanel: {
        alignItems: 'center',
        paddingBottom: 8,
    },
    infoPanelContent: {
        width: '100%',
        alignItems: 'center',
    },
    colorBar: {
        width: '100%',
        height: 4,
        borderRadius: 2,
        marginBottom: 12,
    },
    regionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 6,
        textAlign: 'center',
    },
    regionDescription: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 20,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        backgroundColor: '#f9fafb',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        marginBottom: 6,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6b7280',
    },
    infoValue: {
        fontSize: 14,
        color: '#1f2937',
        fontWeight: '600',
    },
    colorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    colorSample: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
    colorText: {
        fontSize: 12,
        color: '#6b7280',
    },
    showAllButton: {
        backgroundColor: Color.blue2,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 6,
        marginTop: 16,
        width: '100%',
        alignItems: 'center',
    },
    showAllButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    legend: {
        width: '100%',
        paddingBottom: 8,
    },
    legendTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 6,
    },
    legendSubtitle: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 12,
        lineHeight: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: '#f9fafb',
    },
    legendItemSelected: {
        backgroundColor: '#dbeafe',
        borderWidth: 1,
        borderColor: '#3b82f6',
    },
    legendColor: {
        width: 16,
        height: 16,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
    legendTextContainer: {
        flex: 1,
    },
    legendText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    legendTextSelected: {
        color: '#1f2937',
        fontWeight: '600',
    },
    legendStopsCount: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    legendCount: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '500',
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6b7280',
        fontWeight: '500',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ef4444',
        marginBottom: 12,
        textAlign: 'center',
    },
    errorMessage: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    retryButton: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    errorBanner: {
        backgroundColor: '#fef2f2',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    errorBannerText: {
        color: '#b91c1c',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    retrySmallButton: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retrySmallButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    legendItemDisabled: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
    legendTextDisabled: {
        color: '#6b7280',
        fontWeight: '500',
    },
})