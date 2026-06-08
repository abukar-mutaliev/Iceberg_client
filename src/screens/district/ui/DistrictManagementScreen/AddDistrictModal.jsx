import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import { ReusableModal } from '@shared/ui/Modal/ui/ReusableModal';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

// Регион по умолчанию для карты (центр Ингушетии).
// Совпадает с дефолтом в AddWarehouseModal, чтобы админ видел знакомую область.
const DEFAULT_MAP_REGION = {
    latitude: 43.3,
    longitude: 45.0,
    latitudeDelta: 0.4,
    longitudeDelta: 0.4,
};

// При геокодировании по названию района всегда добавляем регион/страну —
// без этого Nominatim даёт слишком много нерелевантных совпадений.
const GEOCODING_REGION_HINT = 'Республика Ингушетия, Россия';

export const AddDistrictModal = ({ visible, onClose, onSubmit, district, isSubmitting }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const mapStyles = useMemo(() => createMapStyles(colors, isDark), [colors, isDark]);
    const placeholderColor = isDark ? colors.textSecondary : Color.textSecondary;

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        prepositionalCase: '',
        latitude: '',
        longitude: '',
        maxDeliveryRadius: '30',
        maxDeliveryTime: '60',
    });
    const [errors, setErrors] = useState({});
    const [localSubmitting, setLocalSubmitting] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);

    // Состояние карты для выбора координат.
    const [mapModalVisible, setMapModalVisible] = useState(false);
    const [mapRegion, setMapRegion] = useState(DEFAULT_MAP_REGION);
    const [markerPosition, setMarkerPosition] = useState(null);

    // Сбрасываем форму при открытии модалки или смене редактируемого района.
    useEffect(() => {
        if (district) {
            setFormData({
                name: district.name || '',
                description: district.description || '',
                prepositionalCase: district.prepositionalCase || '',
                latitude: district.latitude != null ? String(district.latitude) : '',
                longitude: district.longitude != null ? String(district.longitude) : '',
                maxDeliveryRadius: district.maxDeliveryRadius != null
                    ? String(district.maxDeliveryRadius)
                    : '30',
                maxDeliveryTime: district.maxDeliveryTime != null
                    ? String(district.maxDeliveryTime)
                    : '60',
            });
        } else {
            setFormData({
                name: '',
                description: '',
                prepositionalCase: '',
                latitude: '',
                longitude: '',
                maxDeliveryRadius: '30',
                maxDeliveryTime: '60',
            });
        }
        setErrors({});
    }, [district, visible]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Введите название района';
        }

        const lat = formData.latitude.toString().trim();
        const lon = formData.longitude.toString().trim();

        if (lat && (isNaN(parseFloat(lat)) || parseFloat(lat) < -90 || parseFloat(lat) > 90)) {
            newErrors.latitude = 'Широта должна быть числом от -90 до 90';
        }

        if (lon && (isNaN(parseFloat(lon)) || parseFloat(lon) < -180 || parseFloat(lon) > 180)) {
            newErrors.longitude = 'Долгота должна быть числом от -180 до 180';
        }

        // Координаты должны быть указаны парой — иначе расчёт расстояний на сервере
        // получит «полузаданное» состояние и сервер вернёт ошибку валидации.
        if ((lat && !lon) || (!lat && lon)) {
            const message = 'Укажите и широту, и долготу';
            newErrors.latitude = newErrors.latitude || message;
            newErrors.longitude = newErrors.longitude || message;
        }

        const radius = formData.maxDeliveryRadius.toString().trim();
        if (radius) {
            const radiusNum = parseInt(radius, 10);
            if (isNaN(radiusNum) || radiusNum < 1 || radiusNum > 1000) {
                newErrors.maxDeliveryRadius = 'Радиус должен быть от 1 до 1000 км';
            }
        }

        const time = formData.maxDeliveryTime.toString().trim();
        if (time) {
            const timeNum = parseInt(time, 10);
            if (isNaN(timeNum) || timeNum < 1 || timeNum > 1440) {
                newErrors.maxDeliveryTime = 'Время доставки должно быть от 1 до 1440 минут';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm() || isSubmitting || localSubmitting) {
            return;
        }

        setLocalSubmitting(true);
        try {
            // На сервер отправляем уже типизированные значения: числа для координат
            // и радиуса/времени, null при сбросе. Это совпадает с контрактом
            // express-validator на бэке (см. server/src/validators/district.validator.js).
            const latStr = formData.latitude.toString().trim();
            const lonStr = formData.longitude.toString().trim();
            const radiusStr = formData.maxDeliveryRadius.toString().trim();
            const timeStr = formData.maxDeliveryTime.toString().trim();

            const dataToSubmit = {
                name: formData.name.trim(),
                description: formData.description.trim() || undefined,
                prepositionalCase: formData.prepositionalCase.trim() || (district ? null : undefined),
                latitude: latStr ? parseFloat(latStr) : (district ? null : undefined),
                longitude: lonStr ? parseFloat(lonStr) : (district ? null : undefined),
                maxDeliveryRadius: radiusStr ? parseInt(radiusStr, 10) : undefined,
                maxDeliveryTime: timeStr ? parseInt(timeStr, 10) : undefined,
            };

            const success = await onSubmit(dataToSubmit);

            if (success) {
                setFormData({
                    name: '',
                    description: '',
                    prepositionalCase: '',
                    latitude: '',
                    longitude: '',
                    maxDeliveryRadius: '30',
                    maxDeliveryTime: '60',
                });
            }
        } catch (error) {
            console.error('Error in form submission:', error);
            Alert.alert('Ошибка', 'Произошла ошибка при сохранении района');
        } finally {
            setLocalSubmitting(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));

        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: '',
            }));
        }
    };

    // Геокодирование центра района через OpenStreetMap Nominatim.
    // Используется тот же провайдер, что и в AddWarehouseModal — чтобы не вводить
    // новых зависимостей и не платить за платные API.
    const geocodeDistrictByName = async () => {
        const name = formData.name.trim();
        if (!name) {
            Alert.alert('Ошибка', 'Сначала введите название района');
            return;
        }

        try {
            setIsGeocoding(true);

            // Пробуем несколько вариантов запроса — от самого специфичного к общему.
            const queries = [
                `${name}, ${GEOCODING_REGION_HINT}`,
                `${name} район, ${GEOCODING_REGION_HINT}`,
                name,
            ];

            let found = null;
            for (const query of queries) {
                try {
                    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=ru`;
                    const response = await fetch(url, {
                        headers: { 'User-Agent': 'IcebergApp/1.0' },
                    });
                    if (!response.ok) continue;
                    const results = await response.json();
                    if (results && results.length > 0) {
                        found = {
                            latitude: parseFloat(results[0].lat),
                            longitude: parseFloat(results[0].lon),
                            displayName: results[0].display_name,
                            query,
                        };
                        break;
                    }
                } catch (err) {
                    console.warn('Nominatim запрос провалился:', err?.message);
                }
            }

            if (found) {
                setFormData(prev => ({
                    ...prev,
                    latitude: found.latitude.toFixed(6),
                    longitude: found.longitude.toFixed(6),
                }));
                setErrors(prev => ({ ...prev, latitude: '', longitude: '' }));
                Alert.alert(
                    'Координаты найдены',
                    `${found.displayName}\n\nШирота: ${found.latitude.toFixed(6)}\nДолгота: ${found.longitude.toFixed(6)}\n\nРекомендуется уточнить точку на карте.`
                );
            } else {
                Alert.alert(
                    'Не найдено',
                    'Не удалось определить координаты по названию района. Выберите точку вручную на карте.'
                );
            }
        } catch (error) {
            console.error('Ошибка геокодирования района:', error);
            Alert.alert('Ошибка', 'Не удалось выполнить геокодирование. Попробуйте позже или выберите точку на карте.');
        } finally {
            setIsGeocoding(false);
        }
    };

    const handleOpenMap = () => {
        const lat = parseFloat(formData.latitude);
        const lon = parseFloat(formData.longitude);
        if (!isNaN(lat) && !isNaN(lon)) {
            setMapRegion({
                latitude: lat,
                longitude: lon,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
            });
            setMarkerPosition({ latitude: lat, longitude: lon });
        } else {
            setMapRegion(DEFAULT_MAP_REGION);
            setMarkerPosition(null);
        }
        setMapModalVisible(true);
    };

    const handleMapPress = (event) => {
        setMarkerPosition(event.nativeEvent.coordinate);
    };

    const handleConfirmMapLocation = () => {
        if (!markerPosition) {
            Alert.alert('Ошибка', 'Выберите точку на карте');
            return;
        }
        setFormData(prev => ({
            ...prev,
            latitude: markerPosition.latitude.toFixed(6),
            longitude: markerPosition.longitude.toFixed(6),
        }));
        setErrors(prev => ({ ...prev, latitude: '', longitude: '' }));
        setMapModalVisible(false);
    };

    const handleClearCoordinates = () => {
        setFormData(prev => ({ ...prev, latitude: '', longitude: '' }));
        setErrors(prev => ({ ...prev, latitude: '', longitude: '' }));
    };

    const isProcessing = isSubmitting || localSubmitting;

    return (
        <>
        <ReusableModal
            visible={visible && !mapModalVisible}
            onClose={isProcessing ? null : onClose}
            title={district ? "Редактирование района" : "Добавление района"}
            height={85}
        >
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContentContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.container}>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Название района *</Text>
                        <TextInput
                            style={[styles.input, errors.name && styles.inputError]}
                            value={formData.name}
                            onChangeText={(text) => handleChange('name', text)}
                            placeholder="Например: Назрановский"
                            placeholderTextColor={placeholderColor}
                            editable={!isProcessing}
                        />
                        {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Название в предложном падеже</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.prepositionalCase}
                            onChangeText={(text) => handleChange('prepositionalCase', text)}
                            placeholder="Например: Назрановском"
                            placeholderTextColor={placeholderColor}
                            editable={!isProcessing}
                        />
                        <Text style={styles.hintText}>
                            Используется в UI: «доставка в Назрановском районе»
                        </Text>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Описание</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={formData.description}
                            onChangeText={(text) => handleChange('description', text)}
                            placeholder="Введите описание (необязательно)"
                            placeholderTextColor={placeholderColor}
                            multiline
                            numberOfLines={3}
                            editable={!isProcessing}
                        />
                    </View>

                    {/* Координаты центра района — нужны для расчёта стоимости доставки */}
                    <View style={styles.formGroup}>
                        <View style={styles.coordinatesHeader}>
                            <Text style={styles.label}>Координаты центра района</Text>
                            <View style={styles.coordinatesButtons}>
                                <TouchableOpacity
                                    style={[styles.coordinateActionButton, isGeocoding && styles.disabledButton]}
                                    onPress={geocodeDistrictByName}
                                    disabled={isGeocoding || isProcessing}
                                >
                                    {isGeocoding ? (
                                        <ActivityIndicator size="small" color={Color.colorLightMode} />
                                    ) : (
                                        <>
                                            <Ionicons name="search" size={16} color={Color.colorLightMode} />
                                            <Text style={styles.coordinateActionButtonText}>По названию</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.coordinateActionButton, styles.mapButton]}
                                    onPress={handleOpenMap}
                                    disabled={isProcessing}
                                >
                                    <Ionicons name="map" size={16} color={Color.colorLightMode} />
                                    <Text style={styles.coordinateActionButtonText}>На карте</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.formGroup, styles.halfWidth]}>
                                <Text style={styles.subLabel}>Широта</Text>
                                <TextInput
                                    style={[styles.input, errors.latitude && styles.inputError]}
                                    value={formData.latitude}
                                    onChangeText={(text) => handleChange('latitude', text)}
                                    placeholder="0.000000"
                                    placeholderTextColor={placeholderColor}
                                    keyboardType="decimal-pad"
                                    editable={!isProcessing}
                                />
                                {errors.latitude ? <Text style={styles.errorText}>{errors.latitude}</Text> : null}
                            </View>
                            <View style={[styles.formGroup, styles.halfWidth]}>
                                <Text style={styles.subLabel}>Долгота</Text>
                                <TextInput
                                    style={[styles.input, errors.longitude && styles.inputError]}
                                    value={formData.longitude}
                                    onChangeText={(text) => handleChange('longitude', text)}
                                    placeholder="0.000000"
                                    placeholderTextColor={placeholderColor}
                                    keyboardType="decimal-pad"
                                    editable={!isProcessing}
                                />
                                {errors.longitude ? <Text style={styles.errorText}>{errors.longitude}</Text> : null}
                            </View>
                        </View>

                        {(formData.latitude || formData.longitude) ? (
                            <TouchableOpacity
                                style={styles.clearCoordinatesButton}
                                onPress={handleClearCoordinates}
                                disabled={isProcessing}
                            >
                                <Ionicons name="close-circle-outline" size={16} color={Color.red} />
                                <Text style={styles.clearCoordinatesText}>Сбросить координаты</Text>
                            </TouchableOpacity>
                        ) : null}

                        <Text style={styles.hintText}>
                            Используются как fallback для расчёта стоимости доставки,
                            если у адреса клиента ещё нет точных координат.
                        </Text>
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.formGroup, styles.halfWidth]}>
                            <Text style={styles.label}>Радиус доставки (км)</Text>
                            <TextInput
                                style={[styles.input, errors.maxDeliveryRadius && styles.inputError]}
                                value={formData.maxDeliveryRadius}
                                onChangeText={(text) => handleChange('maxDeliveryRadius', text)}
                                placeholder="30"
                                placeholderTextColor={placeholderColor}
                                keyboardType="numeric"
                                editable={!isProcessing}
                            />
                            {errors.maxDeliveryRadius ? <Text style={styles.errorText}>{errors.maxDeliveryRadius}</Text> : null}
                        </View>
                        <View style={[styles.formGroup, styles.halfWidth]}>
                            <Text style={styles.label}>Время доставки (мин)</Text>
                            <TextInput
                                style={[styles.input, errors.maxDeliveryTime && styles.inputError]}
                                value={formData.maxDeliveryTime}
                                onChangeText={(text) => handleChange('maxDeliveryTime', text)}
                                placeholder="60"
                                placeholderTextColor={placeholderColor}
                                keyboardType="numeric"
                                editable={!isProcessing}
                            />
                            {errors.maxDeliveryTime ? <Text style={styles.errorText}>{errors.maxDeliveryTime}</Text> : null}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, isProcessing && styles.disabledButton]}
                        onPress={handleSubmit}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <ActivityIndicator size="small" color={Color.colorLightMode} />
                        ) : (
                            <Text style={styles.submitButtonText}>
                                {district ? 'Сохранить изменения' : 'Добавить район'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </ReusableModal>

        {/* Модальное окно с картой — на верхнем уровне, чтобы не сталкиваться
            с ограничением iOS на вложенные нативные Modal. Видимость родителя
            гасится через visible={visible && !mapModalVisible}. */}
        <ReusableModal
            visible={mapModalVisible}
            onClose={() => setMapModalVisible(false)}
            title="Выберите центр района"
            height={80}
        >
            <View style={mapStyles.container}>
                <MapView
                    style={mapStyles.map}
                    region={mapRegion}
                    onRegionChangeComplete={setMapRegion}
                    onPress={handleMapPress}
                    showsUserLocation
                    showsMyLocationButton={false}
                >
                    {markerPosition ? (
                        <Marker coordinate={markerPosition} />
                    ) : null}
                </MapView>

                <View style={mapStyles.buttonContainer}>
                    <TouchableOpacity
                        style={[mapStyles.confirmButton, !markerPosition && mapStyles.confirmButtonDisabled]}
                        onPress={handleConfirmMapLocation}
                        disabled={!markerPosition}
                    >
                        <Ionicons name="checkmark-circle" size={24} color="white" style={{ marginRight: 8 }} />
                        <Text style={mapStyles.buttonText}>Подтвердить</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ReusableModal>
        </>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingBottom: normalize(100),
    },
    container: {
        padding: normalize(16),
    },
    formGroup: {
        marginBottom: normalize(16),
    },
    row: {
        flexDirection: 'row',
        gap: normalize(12),
    },
    halfWidth: {
        flex: 1,
    },
    label: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
        color: isDark ? (colors.textPrimary || colors.text || Color.colorLightMode) : Color.textPrimary,
        marginBottom: normalize(4),
    },
    subLabel: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: isDark ? colors.textSecondary : Color.textSecondary,
        marginBottom: normalize(4),
    },
    input: {
        backgroundColor: isDark ? colors.cardBackground : Color.colorLightMode,
        borderWidth: 1,
        borderColor: isDark ? colors.divider : Color.border,
        borderRadius: Border.radius.small,
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(8),
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: isDark ? (colors.textPrimary || colors.text || Color.colorLightMode) : Color.textPrimary,
    },
    inputError: {
        borderColor: Color.red,
    },
    textArea: {
        minHeight: normalize(80),
        textAlignVertical: 'top',
    },
    errorText: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.red,
        marginTop: normalize(4),
    },
    hintText: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: isDark ? colors.textSecondary : Color.textSecondary,
        marginTop: normalize(4),
        fontStyle: 'italic',
    },
    coordinatesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: normalize(8),
        flexWrap: 'wrap',
        gap: normalize(8),
    },
    coordinatesButtons: {
        flexDirection: 'row',
        gap: normalize(8),
    },
    coordinateActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? colors.primary : Color.blue2,
        paddingHorizontal: normalize(10),
        paddingVertical: normalize(6),
        borderRadius: Border.radius.small,
        gap: normalize(4),
    },
    mapButton: {
        backgroundColor: Color.green || '#28A745',
    },
    coordinateActionButtonText: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
        color: Color.colorLightMode,
    },
    clearCoordinatesButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginTop: normalize(8),
        gap: normalize(4),
    },
    clearCoordinatesText: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.red,
        fontWeight: '500',
    },
    submitButton: {
        backgroundColor: isDark ? colors.primary : Color.blue2,
        borderRadius: Border.radius.small,
        paddingVertical: normalize(12),
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: normalize(16),
    },
    disabledButton: {
        backgroundColor: isDark ? colors.divider : Color.gray,
        opacity: 0.7,
    },
    submitButtonText: {
        color: Color.colorLightMode,
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
});

const createMapStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    buttonContainer: {
        position: 'absolute',
        bottom: normalize(20),
        left: normalize(20),
        right: normalize(20),
    },
    confirmButton: {
        flexDirection: 'row',
        backgroundColor: isDark ? (colors.success || Color.green || '#28A745') : (Color.success || Color.green || '#28A745'),
        padding: normalize(15),
        borderRadius: Border.radius.medium,
        alignItems: 'center',
        justifyContent: 'center',
        ...(isDark ? {} : Shadow?.light || {}),
    },
    confirmButtonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: Color.colorLightMode,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        fontSize: normalizeFont(FontSize.size_md),
    },
});
