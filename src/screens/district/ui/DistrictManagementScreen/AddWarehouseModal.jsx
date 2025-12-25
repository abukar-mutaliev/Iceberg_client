import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    SafeAreaView
} from 'react-native';
import { useDispatch } from 'react-redux';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import IconClose from '@shared/ui/Icon/Profile/CloseIcon';
import IconWarehouse from '@shared/ui/Icon/Warehouse/IconWarehouse';
import { MapPinIcon } from '@shared/ui/Icon/DistrictManagement/MapPinIcon';
import { Picker } from '@react-native-picker/picker';
import { fetchAllDistricts } from '@entities/district';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { ReusableModal } from '@shared/ui/Modal';
import { Ionicons } from '@expo/vector-icons';
import { useCustomAlert } from '@shared/ui/CustomAlert/CustomAlertProvider';

export const AddWarehouseModal = ({ visible, onClose, onSubmit, warehouse, isSubmitting }) => {
    const dispatch = useDispatch();
    const { showSuccess, showError, showInfo } = useCustomAlert();
    
    const [formData, setFormData] = useState({
        name: '',
        city: '', // Населенный пункт
        address: '',
        districtId: null,
        latitude: '',
        longitude: '',
        maxDeliveryRadius: '30',
        isActive: true
    });
    const [districts, setDistricts] = useState([]);
    const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
    const [errors, setErrors] = useState({});
    const [mapModalVisible, setMapModalVisible] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [mapRegion, setMapRegion] = useState({
        latitude: 43.3, // Примерные координаты Ингушетии
        longitude: 45.0,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    });
    const [markerPosition, setMarkerPosition] = useState(null);

    // Инициализация формы при открытии модального окна
    useEffect(() => {
        if (visible) {
            if (warehouse) {
                // Режим редактирования
                // Пытаемся разделить адрес на город и улицу
                const addressParts = warehouse.address ? warehouse.address.split(',').map(s => s.trim()) : ['', ''];
                const hasCity = addressParts.length > 1;
                
                setFormData({
                    name: warehouse.name || '',
                    city: hasCity ? addressParts[0] : '',
                    address: hasCity ? addressParts.slice(1).join(', ') : warehouse.address || '',
                    districtId: warehouse.districtId ? parseInt(warehouse.districtId, 10) : null,
                    latitude: warehouse.latitude?.toString() || '',
                    longitude: warehouse.longitude?.toString() || '',
                    maxDeliveryRadius: warehouse.maxDeliveryRadius?.toString() || '30',
                    isActive: warehouse.isActive !== undefined ? warehouse.isActive : true
                });
            } else {
                // Режим создания
                setFormData({
                    name: '',
                    city: '',
                    address: '',
                    districtId: null,
                    latitude: '',
                    longitude: '',
                    maxDeliveryRadius: '30',
                    isActive: true
                });
            }
            setErrors({});
            loadDistricts();
        }
    }, [visible, warehouse]);

    // Загрузка списка районов
    const loadDistricts = async () => {
        try {
            setIsLoadingDistricts(true);
            // Используем Redux для загрузки районов
            const response = await dispatch(fetchAllDistricts()).unwrap();
            const districts = response.data || [];
            
            console.log('Загружены районы для склада:', districts.length);
            setDistricts(districts);
        } catch (error) {
            console.error('Ошибка загрузки районов:', error);
            showError('Ошибка', 'Не удалось загрузить список районов', [{ text: 'OK', style: 'default' }]);
        } finally {
            setIsLoadingDistricts(false);
        }
    };

    // Геокодирование через OpenStreetMap Nominatim (лучше знает российские адреса)
    const geocodeWithNominatim = async (query) => {
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=ru`;
            console.log('🌍 Nominatim запрос:', url);
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'IcebergApp/1.0' // Nominatim требует User-Agent
                }
            });
            
            if (!response.ok) {
                throw new Error('Ошибка запроса к Nominatim');
            }
            
            const results = await response.json();
            console.log('📍 Nominatim результаты:', results);
            
            if (results && results.length > 0) {
                // Возвращаем первый результат
                return {
                    latitude: parseFloat(results[0].lat),
                    longitude: parseFloat(results[0].lon),
                    displayName: results[0].display_name
                };
            }
            
            return null;
        } catch (error) {
            console.error('❌ Ошибка Nominatim:', error);
            return null;
        }
    };

    // Геокодирование адреса для получения координат
    const geocodeAddress = async () => {
        if (!formData.address.trim()) {
            showError('Ошибка', 'Сначала введите адрес склада', [{ text: 'OK', style: 'default' }]);
            return;
        }

        if (!formData.city.trim()) {
            showError('Ошибка', 'Сначала укажите населенный пункт', [{ text: 'OK', style: 'default' }]);
            return;
        }

        try {
            setIsGeocoding(true);
            
            const city = formData.city.trim();
            const street = formData.address.trim();
            
            // Нормализация названия города (убираем лишние слова)
            const normalizeCity = (cityName) => {
                // Убираем префиксы типа "село", "с.", "город", "г."
                return cityName
                    .replace(/^(село|с\.|город|г\.)\s+/i, '')
                    .trim();
            };
            
            const cityNormalized = normalizeCity(city);
            
            // Формируем варианты запросов для OpenStreetMap Nominatim
            // ВАЖНО: Сначала ищем ТОЛЬКО населенный пункт, чтобы убедиться что он есть в базе
            const nominatimQueriesCity = [
                `${cityNormalized}, Назрановский район, Ингушетия, Россия`,
                `${cityNormalized}, Ингушетия, Россия`,
                `${cityNormalized}, Республика Ингушетия, Россия`,
                cityNormalized,
            ];
            
            const nominatimQueriesFullAddress = [
                `${street}, ${cityNormalized}, Назрановский район, Ингушетия`,
                `${street}, ${cityNormalized}, Ингушетия, Россия`,
                `${cityNormalized}, ${street}, Республика Ингушетия`,
                `${street}, ${cityNormalized}`,
            ];
            
            console.log('🔍 Шаг 1: Ищем населенный пункт через OpenStreetMap...');
            console.log('📍 Нормализованное название:', cityNormalized);
            
            let cityResult = null;
            let bestResult = null;
            let bestAddress = '';
            let foundVia = '';
            
            // ШАГ 1: Находим само село/город
            for (const query of nominatimQueriesCity) {
                console.log('🌍 Nominatim (город):', query);
                const nominatimResult = await geocodeWithNominatim(query);
                
                if (nominatimResult) {
                    cityResult = nominatimResult;
                    console.log('✅ Село/город найден:', cityResult);
                    break;
                }
            }
            
            // ШАГ 2: Если село найдено, пробуем найти конкретный адрес
            if (cityResult && street) {
                console.log('🔍 Шаг 2: Ищем конкретный адрес в населенном пункте...');
                
                for (const query of nominatimQueriesFullAddress) {
                    console.log('🌍 Nominatim (адрес):', query);
                    const nominatimResult = await geocodeWithNominatim(query);
                    
                    if (nominatimResult) {
                        bestResult = {
                            latitude: nominatimResult.latitude,
                            longitude: nominatimResult.longitude
                        };
                        bestAddress = nominatimResult.displayName;
                        foundVia = 'OpenStreetMap';
                        console.log('✅ Точный адрес найден через Nominatim:', bestResult);
                        break;
                    }
                }
                
                // Если конкретный адрес не найден, используем координаты населенного пункта
                if (!bestResult) {
                    console.log('⚠️ Точный адрес не найден, используем центр населенного пункта');
                    bestResult = {
                        latitude: cityResult.latitude,
                        longitude: cityResult.longitude
                    };
                    bestAddress = `${cityResult.displayName} (центр населенного пункта)`;
                    foundVia = 'OpenStreetMap (центр)';
                }
            } else if (cityResult) {
                // Если улица не указана, используем центр населенного пункта
                bestResult = {
                    latitude: cityResult.latitude,
                    longitude: cityResult.longitude
                };
                bestAddress = cityResult.displayName;
                foundVia = 'OpenStreetMap';
                console.log('✅ Используем центр населенного пункта:', bestResult);
            }
            
            // Если Nominatim не помог, пробуем через Expo Location (Google Maps)
            if (!bestResult) {
                console.log('🔍 Пробуем Expo Location (Google Maps) как запасной вариант...');
                
                const expoCitiesVariants = [
                    city,
                    city.replace(/^село\s+/i, 'с. '),
                    city.replace(/^с\.\s+/i, 'село '),
                    city.replace(/^(г\.|город)\s+/i, '')
                ];
                
                for (const cityVariant of expoCitiesVariants) {
                    const queries = [
                        `${street}, ${cityVariant}, Ингушетия, Россия`,
                        `${cityVariant}, ${street}, Республика Ингушетия`,
                    ];
                    
                    for (const query of queries) {
                        try {
                            console.log('📱 Expo Location запрос:', query);
                            const result = await Location.geocodeAsync(query);
                            
                            if (result && result.length > 0) {
                                bestResult = result[0];
                                bestAddress = query;
                                foundVia = 'Google Maps';
                                console.log('✅ Найдено через Expo Location:', bestResult);
                                break;
                            }
                        } catch (err) {
                            console.log('❌ Ошибка Expo Location:', err.message);
                            continue;
                        }
                    }
                    
                    if (bestResult) break;
                }
            }
            
            if (bestResult) {
                const { latitude, longitude } = bestResult;
                setFormData(prev => ({
                    ...prev,
                    latitude: latitude.toString(),
                    longitude: longitude.toString()
                }));
                
                // Проверяем, нашли ли мы точный адрес или только населенный пункт
                const isExactAddress = !foundVia.includes('центр');
                const warningText = isExactAddress ? '' : '\n\n⚠️ Точный адрес не найден в базах, используются координаты центра населенного пункта. Рекомендуется уточнить на карте.';
                
                showSuccess(
                    isExactAddress ? 'Адрес найден!' : 'Найден населенный пункт', 
                    `${city}${street ? '\n' + street : ''}\n\nНайдено через: ${foundVia}${bestAddress ? `\n${bestAddress}` : ''}\n\nШирота: ${latitude.toFixed(6)}\nДолгота: ${longitude.toFixed(6)}${warningText}`,
                    [{ text: 'Понятно', style: 'default' }]
                );
                console.log('✅ Геокодирование успешно:', { 
                    service: foundVia,
                    address: bestAddress, 
                    latitude, 
                    longitude,
                    isExactAddress 
                });
            } else {
                showInfo(
                    'Адрес не найден', 
                    `Не удалось найти координаты для:\n"${city}${street ? ', ' + street : ''}"\n\nВозможные причины:\n• Неправильный формат названия\n• Используйте ОБЯЗАТЕЛЬНО с сокращением:\n   ✅ "с. Экажево" (не "село Экажево")\n   ✅ "г. Назрань" (не "город Назрань")\n• Проверьте правильность написания\n\nРекомендация:\n✅ Выберите координаты на карте вручную\n(нажмите кнопку "На карте")`,
                    [{ text: 'Понятно', style: 'default' }]
                );
            }
        } catch (error) {
            console.error('Ошибка геокодирования:', error);
            showError(
                'Ошибка геокодирования', 
                'Не удалось определить координаты. Попробуйте выбрать на карте.',
                [{ text: 'Понятно', style: 'default' }]
            );
        } finally {
            setIsGeocoding(false);
        }
    };

    // Открытие карты для выбора координат
    const handleOpenMap = () => {
        // Если уже есть координаты, используем их как начальную точку
        if (formData.latitude && formData.longitude) {
            const lat = parseFloat(formData.latitude);
            const lng = parseFloat(formData.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                setMapRegion({
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                });
                setMarkerPosition({ latitude: lat, longitude: lng });
            }
        }
        setMapModalVisible(true);
    };

    // Подтверждение выбора координат на карте
    const handleConfirmMapLocation = () => {
        if (markerPosition) {
            setFormData(prev => ({
                ...prev,
                latitude: markerPosition.latitude.toString(),
                longitude: markerPosition.longitude.toString()
            }));
            setMapModalVisible(false);
            showSuccess('Готово', 'Координаты выбраны на карте', [{ text: 'OK', style: 'default' }]);
        } else {
            showError('Ошибка', 'Выберите точку на карте', [{ text: 'OK', style: 'default' }]);
        }
    };

    // Обработка нажатия на карту
    const handleMapPress = (event) => {
        setMarkerPosition(event.nativeEvent.coordinate);
    };

    // Валидация формы
    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Название склада обязательно';
        }

        if (!formData.city.trim()) {
            newErrors.city = 'Населенный пункт обязателен';
        } else {
            // Проверяем формат населенного пункта
            const city = formData.city.trim();
            const hasCorrectFormat = /^(с\.|г\.|ст-ца|хутор|п\.|пос\.|станица)\s+/i.test(city);
            const hasWrongFormat = /^(село|город|станица|поселок)\s+/i.test(city);
            
            if (hasWrongFormat) {
                newErrors.city = 'Используйте сокращение: "с. Экажево" вместо "село Экажево"';
            } else if (!hasCorrectFormat) {
                newErrors.city = 'Начните с сокращения: "с. Экажево", "г. Назрань" и т.д.';
            }
        }

        if (!formData.address.trim()) {
            newErrors.address = 'Адрес (улица, дом) обязателен';
        }

        if (!formData.districtId) {
            newErrors.districtId = 'Необходимо выбрать район';
        }

        if (formData.latitude && isNaN(parseFloat(formData.latitude))) {
            newErrors.latitude = 'Широта должна быть числом';
        }

        if (formData.longitude && isNaN(parseFloat(formData.longitude))) {
            newErrors.longitude = 'Долгота должна быть числом';
        }

        if (formData.maxDeliveryRadius && (isNaN(parseFloat(formData.maxDeliveryRadius)) || parseFloat(formData.maxDeliveryRadius) <= 0)) {
            newErrors.maxDeliveryRadius = 'Радиус доставки должен быть положительным числом';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Обработка отправки формы
    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        // Объединяем город и адрес в один полный адрес
        const fullAddress = formData.city.trim() + ', ' + formData.address.trim();

        const submitData = {
            name: formData.name,
            address: fullAddress, // Полный адрес с городом
            districtId: formData.districtId,
            latitude: formData.latitude ? parseFloat(formData.latitude) : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
            maxDeliveryRadius: parseFloat(formData.maxDeliveryRadius) || 30,
            isActive: formData.isActive
        };

        console.log('Отправка данных склада:', submitData);

        const success = await onSubmit(submitData);
        if (success) {
            onClose();
        }
    };

    // Обработка изменения полей
    const handleFieldChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Очищаем ошибку для поля при изменении
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                {/* Заголовок */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <Text style={styles.title}>
                            {warehouse ? 'Редактировать склад' : 'Добавить склад'}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                    >
                        <IconClose width={24} height={24} color={Color.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* Форма */}
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Название склада */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Название склада *</Text>
                        <TextInput
                            style={[styles.input, errors.name && styles.inputError]}
                            value={formData.name}
                            onChangeText={(value) => handleFieldChange('name', value)}
                            placeholder="Например: Склад Назрань"
                            placeholderTextColor={Color.textSecondary}
                        />
                        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                    </View>

                    {/* Населенный пункт */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Населенный пункт *</Text>
                        <TextInput
                            style={[styles.input, errors.city && styles.inputError]}
                            value={formData.city}
                            onChangeText={(value) => handleFieldChange('city', value)}
                            placeholder="с. Экажево"
                            placeholderTextColor={Color.textSecondary}
                        />
                        {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
                        <Text style={styles.hintText}>✅ Используйте формат с сокращением: "с. Экажево", "с. Плиево", "г. Назрань", "г. Карабулак"</Text>
                    </View>

                    {/* Адрес склада (улица, дом) */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Улица и дом *</Text>
                        <TextInput
                            style={[styles.input, errors.address && styles.inputError]}
                            value={formData.address}
                            onChangeText={(value) => handleFieldChange('address', value)}
                            placeholder="Например: улица Ингушская, 10"
                            placeholderTextColor={Color.textSecondary}
                        />
                        {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
                    </View>

                    {/* Район */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Район *</Text>
                        {isLoadingDistricts ? (
                            <View style={styles.pickerContainer}>
                                <ActivityIndicator size="small" color={Color.blue2} />
                                <Text style={styles.loadingText}>Загрузка районов...</Text>
                            </View>
                        ) : (
                            <View style={[styles.pickerContainer, errors.districtId && styles.inputError]}>
                                <Picker
                                    selectedValue={formData.districtId}
                                    onValueChange={(value) => handleFieldChange('districtId', value === 'null' ? null : parseInt(value, 10))}
                                    style={styles.picker}
                                    mode="dropdown"
                                >
                                    <Picker.Item label="Выберите район" value="null" />
                                    {districts.map((district) => (
                                        <Picker.Item
                                            key={district.id}
                                            label={district.name}
                                            value={district.id}
                                        />
                                    ))}
                                </Picker>
                            </View>
                        )}
                        {errors.districtId && <Text style={styles.errorText}>{errors.districtId}</Text>}
                        {formData.districtId && (
                            <Text style={styles.helperText}>
                                Выбран: {districts.find(d => d.id === formData.districtId)?.name || 'Неизвестно'}
                            </Text>
                        )}
                    </View>

                    {/* Координаты */}
                    <View style={styles.fieldContainer}>
                        <View style={styles.coordinatesHeader}>
                            <Text style={styles.label}>Координаты</Text>
                            <View style={styles.coordinatesButtons}>
                                <TouchableOpacity
                                    style={[styles.coordinateActionButton, isGeocoding && styles.disabledButton]}
                                    onPress={geocodeAddress}
                                    disabled={isGeocoding || isSubmitting}
                                >
                                    {isGeocoding ? (
                                        <ActivityIndicator size="small" color={Color.colorLightMode} />
                                    ) : (
                                        <>
                                            <Ionicons name="search" size={16} color={Color.colorLightMode} />
                                            <Text style={styles.coordinateActionButtonText}>По адресу</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.coordinateActionButton, styles.mapButton]}
                                    onPress={handleOpenMap}
                                    disabled={isSubmitting}
                                >
                                    <Ionicons name="map" size={16} color={Color.colorLightMode} />
                                    <Text style={styles.coordinateActionButtonText}>На карте</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={[styles.fieldContainer, styles.halfWidth]}>
                                <Text style={styles.label}>Широта</Text>
                                <TextInput
                                    style={[styles.input, errors.latitude && styles.inputError]}
                                    value={formData.latitude}
                                    onChangeText={(value) => handleFieldChange('latitude', value)}
                                    placeholder="0.000000"
                                    placeholderTextColor={Color.textSecondary}
                                    keyboardType="decimal-pad"
                                />
                                {errors.latitude && <Text style={styles.errorText}>{errors.latitude}</Text>}
                            </View>
                            <View style={[styles.fieldContainer, styles.halfWidth]}>
                                <Text style={styles.label}>Долгота</Text>
                                <TextInput
                                    style={[styles.input, errors.longitude && styles.inputError]}
                                    value={formData.longitude}
                                    onChangeText={(value) => handleFieldChange('longitude', value)}
                                    placeholder="0.000000"
                                    placeholderTextColor={Color.textSecondary}
                                    keyboardType="decimal-pad"
                                />
                                {errors.longitude && <Text style={styles.errorText}>{errors.longitude}</Text>}
                            </View>
                        </View>
                    </View>

                    {/* Радиус доставки */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Радиус доставки (км)</Text>
                        <TextInput
                            style={[styles.input, errors.maxDeliveryRadius && styles.inputError]}
                            value={formData.maxDeliveryRadius}
                            onChangeText={(value) => handleFieldChange('maxDeliveryRadius', value)}
                            placeholder="30"
                            placeholderTextColor={Color.textSecondary}
                            keyboardType="numeric"
                        />
                        {errors.maxDeliveryRadius && <Text style={styles.errorText}>{errors.maxDeliveryRadius}</Text>}
                    </View>

                    {/* Статус активности */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Статус</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={formData.isActive}
                                onValueChange={(value) => handleFieldChange('isActive', value)}
                                style={styles.picker}
                                mode="dropdown"
                            >
                                <Picker.Item label="Активен" value={true} />
                                <Picker.Item label="Неактивен" value={false} />
                            </Picker>
                        </View>
                        <Text style={styles.helperText}>
                            Текущий статус: {formData.isActive ? 'Активен' : 'Неактивен'}
                        </Text>
                    </View>
                </ScrollView>

                {/* Кнопки действий */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={onClose}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.cancelButtonText}>Отмена</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[styles.saveButton, isSubmitting && styles.disabledButton]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color={Color.colorLightMode} />
                        ) : (
                            <Text style={styles.saveButtonText}>
                                {warehouse ? 'Сохранить' : 'Добавить'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Модальное окно с картой */}
            <ReusableModal
                visible={mapModalVisible}
                onClose={() => setMapModalVisible(false)}
                title="Выберите местоположение склада"
                height={80}
            >
                <View style={mapStyles.container}>
                    <MapView
                        style={mapStyles.map}
                        region={mapRegion}
                        onRegionChangeComplete={setMapRegion}
                        onPress={handleMapPress}
                        showsUserLocation={true}
                        showsMyLocationButton={false}
                    >
                        {markerPosition && (
                            <Marker coordinate={markerPosition} />
                        )}
                    </MapView>

                    <View style={mapStyles.buttonContainer}>
                        <TouchableOpacity
                            style={mapStyles.confirmButton}
                            onPress={handleConfirmMapLocation}
                            disabled={!markerPosition}
                        >
                            <Ionicons name="checkmark-circle" size={24} color="white" style={{ marginRight: 8 }} />
                            <Text style={mapStyles.buttonText}>Подтвердить</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ReusableModal>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
        borderBottomWidth: 1,
        borderBottomColor: Color.border,
        backgroundColor: Color.colorLightMode,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: normalizeFont(FontSize.size_lg),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
    },
    closeButton: {
        padding: normalize(8),
    },
    content: {
        flex: 1,
        paddingHorizontal: normalize(20),
    },
    fieldContainer: {
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
        fontWeight: '600',
        color: Color.textPrimary,
        marginBottom: normalize(6),
    },
    input: {
        borderWidth: 1,
        borderColor: Color.border,
        borderRadius: Border.radius.small,
        paddingHorizontal: normalize(12),
        paddingVertical: normalize(10),
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textPrimary,
        backgroundColor: Color.colorLightMode,
    },
    inputError: {
        borderColor: Color.red,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: Color.border,
        borderRadius: Border.radius.small,
        backgroundColor: Color.colorLightMode,
        overflow: 'hidden',
        minHeight: normalize(44),
    },
    picker: {
        width: '100%',
        height: normalize(44),
        color: Color.textPrimary,
    },
    loadingText: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginLeft: normalize(8),
    },
    errorText: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.red,
        marginTop: normalize(4),
    },
    helperText: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.blue2,
        marginTop: normalize(4),
        fontWeight: '500',
    },
    hintText: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.grey7D7D7D || Color.textSecondary,
        marginTop: normalize(4),
        fontStyle: 'italic',
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
        borderTopWidth: 1,
        borderTopColor: Color.border,
        backgroundColor: Color.colorLightMode,
        gap: normalize(12),
    },
    cancelButton: {
        flex: 1,
        paddingVertical: normalize(12),
        borderRadius: Border.radius.medium,
        borderWidth: 1,
        borderColor: Color.border,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
    },
    saveButton: {
        flex: 1,
        paddingVertical: normalize(12),
        borderRadius: Border.radius.medium,
        backgroundColor: Color.blue2,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: Color.colorLightGray,
    },
    saveButtonText: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.colorLightMode,
    },
    coordinatesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: normalize(8),
    },
    coordinatesButtons: {
        flexDirection: 'row',
        gap: normalize(8),
    },
    coordinateActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Color.blue2,
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
});

const mapStyles = StyleSheet.create({
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
        backgroundColor: Color.success || Color.green || '#28A745',
        padding: normalize(15),
        borderRadius: Border.radius.medium,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadow.light,
    },
    buttonText: {
        color: Color.colorLightMode,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        fontSize: normalizeFont(FontSize.size_md),
    },
});

export default AddWarehouseModal;
