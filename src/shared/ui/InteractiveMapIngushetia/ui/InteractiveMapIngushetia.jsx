import React, {useState, useRef, useEffect} from 'react';
import {
    View,
    Text,
    Pressable,
    ScrollView,
    StyleSheet,
    Dimensions,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import {PanGestureHandler, PinchGestureHandler, State} from 'react-native-gesture-handler';
import Animated, {
    useAnimatedGestureHandler,
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

const { width: screenWidth, height: screenHeight} = Dimensions.get('window');

// Коэффициенты масштабирования
const scaleUI = Math.min(screenWidth / 400, screenHeight / 800);

// Масштабирование позиций районов только для планшетов (ширина > 500px)
const scaleDistricts = screenWidth > 500 ? screenWidth / 400 : 1;

export const InteractiveMap = ({ onDistrictSelect }) => {
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [showInfo, setShowInfo] = useState(false);


    const panRef = useRef();
    const pinchRef = useRef();

    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

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

    const districts = [
        {
            id: 'malgobek',
            Component: Malgobek,
            style: {
                position: 'absolute',
                left: 117 * scaleDistricts,
                top: -2 * scaleDistricts,
                zIndex: 2,
            },
            width: screenWidth * 0.35,
            height: screenHeight * 0.15,
            hitSlop: {top: 10 * scaleDistricts, bottom: 10 * scaleDistricts, left: 10 * scaleDistricts, right: 10 * scaleDistricts},
            pressableStyle: {
                borderRadius: 8,
            }
        },
        {
            id: 'nazran',
            Component: Nazran,
            style: {
                position: 'absolute',
                left: 155 * scaleDistricts,
                top: 78 * scaleDistricts,
                zIndex: 5,
            },
            width: screenWidth * 0.34,
            height: screenHeight * 0.16,
            hitSlop: {top: 0, bottom: 0, left: 0, right: 0},
            pressableStyle: {
                borderRadius: 10,
            }
        },
        {
            id: 'sunzha',
            Component: Sunzha,
            style: {
                position: 'absolute',
                right: 25 * scaleDistricts,
                top: 40 * scaleDistricts,
                zIndex: 1,
            },
            width: screenWidth * 0.33,
            height: screenHeight * 0.35,
            hitSlop: {top: 0, bottom: 0, left: 0, right: 0},
            pressableStyle: {
                borderRadius: 12,
            }
        },
        {
            id: 'prigorodny',
            Component: Prigorodny,
            style: {
                position: 'absolute',
                left: 152 * scaleDistricts,
                top: 124 * scaleDistricts,
                zIndex: 4,
            },
            width: screenWidth * 0.31,
            height: screenHeight * 0.23,
            hitSlop: {top: 0, bottom: 0, left: 0, right: 0},
            pressableStyle: {
                borderRadius: 8,
            }
        },
        {
            id: 'dzheirakhsky',
            Component: Dzheirakh,
            style: {
                position: 'absolute',
                left: 150 * scaleDistricts,
                top: 261 * scaleDistricts,
                zIndex: 3,
            },
            width: screenWidth * 0.45,
            height: screenHeight * 0.17,
            hitSlop: {top: 5 * scaleDistricts, bottom: 5 * scaleDistricts, left: 5 * scaleDistricts, right: 5 * scaleDistricts},
            pressableStyle: {
                borderRadius: 10,
            }
        },
    ];

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

    const pinchHandler = useAnimatedGestureHandler({
        onStart: (_, context) => {
            context.startScale = scale.value;
        },
        onActive: (event, context) => {
            scale.value = Math.max(0.5, Math.min(context.startScale * event.scale, 3));
        },
        onEnd: () => {
            scale.value = withSpring(Math.max(0.5, Math.min(scale.value, 3)));
        },
    });

    const panHandler = useAnimatedGestureHandler({
        onStart: (_, context) => {
            context.startX = translateX.value;
            context.startY = translateY.value;
        },
        onActive: (event, context) => {
            translateX.value = context.startX + event.translationX;
            translateY.value = context.startY + event.translationY;
        },
        onEnd: () => {
            translateX.value = withSpring(translateX.value);
            translateY.value = withSpring(translateY.value);
        },
    });

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
    };

    const zoomOut = () => {
        scale.value = withSpring(Math.max(scale.value - 0.5, 0.5));
    };

    const resetView = () => {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
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

    return (
        <SafeAreaView style={styles.container}>
            {/* Заголовок без кнопок управления */}
            <View style={styles.header}>
            </View>

            {/* Карта с боковыми кнопками управления */}
            <View style={styles.mapContainer}>
                {isLoading && renderLoadingState()}

                {/* Боковые кнопки управления */}
                <View style={styles.sideControls} pointerEvents="box-none">
                    <Pressable style={styles.sideControlButton} onPress={zoomIn}>
                        <Text style={styles.sideControlButtonText}>+</Text>
                    </Pressable>
                    <Pressable style={styles.sideControlButton} onPress={zoomOut}>
                        <Text style={styles.sideControlButtonText}>-</Text>
                    </Pressable>
                    <Pressable style={[styles.sideControlButton, styles.sideResetButton]} onPress={resetView}>
                        <Text style={styles.sideResetButtonText}>⌂</Text>
                    </Pressable>
                </View>

                <PinchGestureHandler
                    ref={pinchRef}
                    onGestureEvent={pinchHandler}
                    simultaneousHandlers={[panRef]}
                    minPointers={2}
                >
                    <Animated.View style={styles.gestureContainer}>
                        <PanGestureHandler
                            ref={panRef}
                            onGestureEvent={panHandler}
                            simultaneousHandlers={[pinchRef]}
                            minPointers={1}
                            maxPointers={1}
                        >
                            <Animated.View style={[styles.mapWrapper, animatedStyle]}>
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
                        </PanGestureHandler>
                    </Animated.View>
                </PinchGestureHandler>

                {/* Инструкция */}
                {!showInfo && !isLoading && (
                    <View style={styles.instruction}>
                        <Text style={styles.instructionText}>
                            Нажмите на район - остановки сразу отфильтруются по этому району
                        </Text>
                    </View>
                )}
            </View>

            {/* Нижняя панель с информацией или легендой */}
            <View style={styles.bottomPanel}>
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
        left: 16 * scaleUI,
        top: 200 * scaleUI,
        marginTop: -75 * scaleUI,
        zIndex: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 12,
        padding: 8 * scaleUI,
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
        width: 44 * scaleUI,
        height: 44 * scaleUI,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8 * scaleUI,
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
        fontSize: 20 * scaleUI,
        fontWeight: 'bold',
    },
    sideResetButton: {
        backgroundColor: '#6b7280',
        marginBottom: 0,
    },
    sideResetButtonText: {
        color: '#ffffff',
        fontSize: 18 * scaleUI,
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
        width: screenWidth,
        height: screenHeight * 0.5,
        paddingTop: 20 * scaleUI,
    },
    instruction: {
        position: 'absolute',
        bottom: 2 * scaleUI,
        left: 16 * scaleUI,
        right: 16 * scaleUI,
        backgroundColor: 'rgba(59, 130, 246, 0.9)',
        paddingHorizontal: 16 * scaleUI,
        paddingVertical: 5 * scaleUI,
        borderRadius: 8,
    },
    instructionText: {
        color: '#ffffff',
        textAlign: 'center',
        fontSize: 14 * scaleUI,
        fontWeight: '500',
    },
    bottomPanel: {
        backgroundColor: '#ffffff',
        minHeight: screenHeight * 0.25,
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