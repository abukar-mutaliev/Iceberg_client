import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  BackHandler,
  Keyboard
} from 'react-native';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { logData } from '@/shared/lib/logger';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { useRoute } from '@react-navigation/native';
import { useNavigation } from "@react-navigation/native";
import { getImageUrl } from '@shared/api/api';

import { EditStopHeader } from './EditStopHeader';
import { PhotoUpload } from './PhotoUpload';
import { LocationInput } from '@features/driver/addDriverStop/ui/LocationInput';
import { CustomDatePicker, CustomTimePicker } from '@shared/ui/Pickers/CustomDatePicker';
import { DistrictPicker } from "@shared/ui/Pickers/DistrictPicker";
import { StopProductsSelector } from '@features/driver/addDriverStop/ui/StopProductsSelector';

const WEEK_DAYS = [
  { label: 'Пн', value: 1 },
  { label: 'Вт', value: 2 },
  { label: 'Ср', value: 3 },
  { label: 'Чт', value: 4 },
  { label: 'Пт', value: 5 },
  { label: 'Сб', value: 6 },
  { label: 'Вс', value: 0 }
];

export const EditStopForm = ({ 
  stopData, 
  onClose, 
  onSave, 
  districts = [], 
  renderAsScreen = false, 
  locationChanged,
  locationData: externalLocationData,
  setLocationData: externalSetLocationData,
  onMapOpen: externalOnMapOpen,
  useModalMap = false,
  isLocationLoading: externalIsLocationLoading,
  setIsLocationLoading: externalSetIsLocationLoading,
  addressFromMap: externalAddressFromMap
}) => {
  
  // Вспомогательные функции объявляем до использования
  const processInitialPhoto = (photoData) => {
    if (!photoData) return null;
    if (typeof photoData === 'string') {
      // Нормализуем URL через getImageUrl (включая замену старых IP-адресов)
      const normalizedUri = getImageUrl(photoData);
      return { uri: normalizedUri || photoData };
    }
    // Если это объект с uri, нормализуем uri
    if (photoData.uri && typeof photoData.uri === 'string') {
      // Если это локальный файл, оставляем как есть
      if (photoData.uri.startsWith('file://') || photoData.uri.startsWith('content://')) {
        return photoData;
      }
      // Нормализуем URL
      const normalizedUri = getImageUrl(photoData.uri);
      return { ...photoData, uri: normalizedUri || photoData.uri };
    }
    return photoData;
  };

  // Функция для нормализации координат
  const normalizeMapLocation = (locationData) => {
    try {
      // Если locationData - это строка, проверяем форматы
      if (typeof locationData === 'string') {
        // Если это JSON-строка (начинается с '[' и заканчивается ']')
        if (locationData.trim().startsWith('[') && locationData.trim().endsWith(']')) {
          const coords = JSON.parse(locationData);
          return `${coords[0]},${coords[1]}`;
        }

        // Если это уже строка с запятой (формат "широта,долгота")
        if (locationData.includes(',')) {
          // Проверяем, что это действительно числа, разделенные запятой
          const parts = locationData.split(',');
          if (parts.length === 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]))) {
            return String(locationData);
          }
        }
      }

      // Если это объект с lat и lng или latitude and longitude
      if (locationData && typeof locationData === 'object') {
        const lat = locationData.lat || locationData.latitude;
        const lng = locationData.lng || locationData.longitude;

        if (lat !== undefined && lng !== undefined) {
          return `${lat},${lng}`;
        }
      }

      return locationData ? String(locationData) : '';
    } catch (error) {
      logData('Ошибка при нормализации координат', error);
      return locationData ? String(locationData) : '';
    }
  };

  // Инициализация состояний
  const [address, setAddress] = useState(stopData?.address || '');
  const [photo, setPhoto] = useState(processInitialPhoto(stopData?.photo));
  const [description, setDescription] = useState(stopData?.description || '');
  const [truckModel, setTruckModel] = useState(stopData?.truckModel || '');
  const [truckNumber, setTruckNumber] = useState(stopData?.truckNumber || '');
  const [selectedDistrict, setSelectedDistrict] = useState(stopData?.districtId || null);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [warehouseId, setWarehouseId] = useState(stopData?.warehouseId || null);
  const [selectedProducts, setSelectedProducts] = useState(
    stopData?.products?.map(sp => ({
      productId: sp.product?.id || sp.productId,
      quantity: sp.quantity,
      stopPrice: sp.stopPrice ?? null // Включаем stopPrice из существующих данных
    })) || []
  );
  const [scheduleDays, setScheduleDays] = useState(
    Array.isArray(stopData?.schedule?.daysOfWeek) ? stopData.schedule.daysOfWeek : []
  );
  const [scheduleEnabled, setScheduleEnabled] = useState(
    Array.isArray(stopData?.schedule?.daysOfWeek) && stopData.schedule.daysOfWeek.length > 0
  );

  // Мемоизируем инициализацию mapLocation чтобы избежать бесконечного рендеринга
  const initialMapLocation = useMemo(() => {
    const normalized = normalizeMapLocation(stopData?.mapLocation) || '';
    const result = typeof normalized === 'string' ? normalized : String(normalized || '');
    
    // Логируем только при изменении stopData.mapLocation
    if (__DEV__) {
      console.log('EditStopForm: Инициализация координат', {
        original: stopData?.mapLocation,
        normalized: result
      });
    }
    
    return result;
  }, [stopData?.mapLocation]);

  const [internalLocationData, setInternalLocationData] = useState({
    mapLocation: initialMapLocation
  });
  
  // Используем внешние пропсы если они переданы, иначе внутренние состояния
  const locationData = externalLocationData || internalLocationData;
  const setLocationData = externalSetLocationData || setInternalLocationData;
  const [internalIsLocationLoading, setInternalIsLocationLoading] = useState(false);
  const isLocationLoading = externalIsLocationLoading !== undefined ? externalIsLocationLoading : internalIsLocationLoading;
  const setIsLocationLoading = externalSetIsLocationLoading || setInternalIsLocationLoading;
  
  const navigation = useNavigation();

  const [startDate, setStartDate] = useState(
      stopData && stopData.startTime ? new Date(stopData.startTime) : new Date()
  );
  const [startTime, setStartTime] = useState(
      stopData && stopData.startTime ? new Date(stopData.startTime) : new Date()
  );
  const [endDate, setEndDate] = useState(
      stopData && stopData.endTime ? new Date(stopData.endTime) : new Date()
  );
  const [endTime, setEndTime] = useState(
      stopData && stopData.endTime
          ? new Date(stopData.endTime)
          : new Date(new Date().getTime() + 2 * 60 * 60 * 1000)
  );

  const [photoWasChanged, setPhotoWasChanged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Добавляем состояние для ошибок валидации
  const [errors, setErrors] = useState({
    address: '',
    district: '',
    photo: '',
    location: '',
    truckModel: '',
    truckNumber: '',
    startTime: '',
    endTime: '',
    schedule: ''
  });

  // Состояние видимости модального окна
  const [modalVisible, setModalVisible] = useState(!renderAsScreen);
  const isNavigatingRef = useRef(false);
  const navigationEventListenerRef = useRef(null);
  
  // Состояние для retry при неудачной загрузке
  const [uploadFailed, setUploadFailed] = useState(false);
  const [lastFormData, setLastFormData] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const route = useRoute();

  // Добавляем состояние для отслеживания видимости клавиатуры
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const nextDays = Array.isArray(stopData?.schedule?.daysOfWeek) ? stopData.schedule.daysOfWeek : [];
    setScheduleDays(nextDays);
    setScheduleEnabled(nextDays.length > 0);
  }, [stopData?.schedule?.daysOfWeek]);
  
  // Мониторим открытие и закрытие клавиатуры
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (event) => {
        setKeyboardVisible(true);
        
        // Для Android мы можем получить точный размер клавиатуры
        if (Platform.OS === 'android') {
          const keyboardHeight = event.endCoordinates.height;
          // Прокручиваем контент вверх, чтобы видеть поле ввода
          setTimeout(() => {
            if (scrollViewRef.current) {
              scrollViewRef.current.scrollTo({ y: keyboardHeight * 0.5, animated: true });
            }
          }, 100);
        }
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
  const scrollViewRef = useRef(null);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };
  
  useEffect(() => {
    if (route.params?.selectedLocation) {
      const selectedLocation = route.params.selectedLocation;
      logData('EditStopForm: Получены координаты из параметров навигации', selectedLocation);

      setLocationData(prev => ({...prev, mapLocation: selectedLocation}));
      setErrors(prev => ({...prev, location: ''}));

      navigation.setParams({ selectedLocation: undefined, timestamp: undefined });
    }
  }, [route.params?.selectedLocation, route.params?.timestamp, setLocationData, navigation]);

  // Обновление адреса из внешнего источника
  useEffect(() => {
    if (externalAddressFromMap && externalAddressFromMap !== address) {
      setAddress(externalAddressFromMap);
    }
  }, [externalAddressFromMap]);

  useEffect(() => {
    if (!renderAsScreen) {
      navigationEventListenerRef.current = navigation.addListener('focus', () => {
        if (isNavigatingRef.current) {
          setTimeout(() => {
            setModalVisible(true);
            isNavigatingRef.current = false;
          }, 50);
        }
      });

      return () => {
        if (navigationEventListenerRef.current) {
          navigation.removeListener('focus', navigationEventListenerRef.current);
        }
      };
    }
  }, [navigation, renderAsScreen]);

  const handleModalOverlayPress = (event) => {
    if (event.target === event.currentTarget) {
      Keyboard.dismiss();
      
      setTimeout(() => {
        if (!isNavigatingRef.current) {
          handleClose();
        }
      }, 100);
    }
  };

  const handlePhotoChange = (newPhoto) => {
    setPhoto(newPhoto);
    setPhotoWasChanged(true);
    setErrors(prev => ({ ...prev, photo: '' }));
  };

  const handleClose = () => {
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
  };

  const onStartDateChange = (date) => {
    logData('Изменение даты начала', date);
    setStartDate(date);
    if (date > endDate) {
      setEndDate(date);
    }
    setErrors(prev => ({...prev, startTime: ''}));
  };

  const onStartTimeChange = (time) => {
    logData('Изменение времени начала', time);
    setStartTime(time);
    if (
        startDate.getDate() === endDate.getDate() &&
        startDate.getMonth() === endDate.getMonth() &&
        startDate.getFullYear() === endDate.getFullYear() &&
        time.getHours() >= endTime.getHours() &&
        time.getMinutes() >= endTime.getMinutes()
    ) {
      const newEndTime = new Date(time);
      newEndTime.setHours(time.getHours() + 2);
      setEndTime(newEndTime);
    }
    setErrors(prev => ({...prev, startTime: ''}));
  };

  const onEndDateChange = (date) => {
    logData('Изменение даты окончания', date);
    if (date < startDate) {
      setErrors(prev => ({...prev, endTime: 'Дата окончания не может быть раньше даты начала'}));
      return;
    }
    setEndDate(date);
    setErrors(prev => ({...prev, endTime: ''}));
  };

  const onEndTimeChange = (time) => {
    logData('Изменение времени окончания', time);
    if (
        startDate.getDate() === endDate.getDate() &&
        startDate.getMonth() === endDate.getMonth() &&
        startDate.getFullYear() === endDate.getFullYear() &&
        time.getHours() < startTime.getHours() ||
        (time.getHours() === startTime.getHours() && time.getMinutes() < startTime.getMinutes())
    ) {
      setErrors(prev => ({...prev, endTime: 'Время окончания не может быть раньше времени начала'}));
      return;
    }
    setEndTime(time);
    setErrors(prev => ({...prev, endTime: ''}));
  };

  useEffect(() => {
    if (!scheduleEnabled) return;
    const today = new Date();
    const normalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    setStartDate(normalized);
    setEndDate(normalized);
  }, [scheduleEnabled]);

  const toggleScheduleDay = useCallback((dayValue) => {
    setScheduleDays((prev) => {
      if (prev.includes(dayValue)) {
        return prev.filter((d) => d !== dayValue);
      }
      return [...prev, dayValue];
    });
    setErrors(prev => ({ ...prev, schedule: '' }));
  }, []);

  const handleMapOpen = useCallback((currentLocation) => {
    logData('Открытие карты из EditStopForm', {
      currentLocation,
      timestamp: new Date().toISOString(),
      useModalMap,
      renderAsScreen
    });

    // Если useModalMap=true и передан внешний обработчик, используем модальное окно
    if (useModalMap && externalOnMapOpen) {
      externalOnMapOpen(currentLocation);
      return;
    }

    // Иначе используем навигацию (для модального режима)
    isNavigatingRef.current = true;
    setModalVisible(false);

    const timestamp = new Date().getTime();

    setTimeout(() => {
      navigation.navigate('MapScreen', {
        initialLocation: currentLocation,
        returnScreen: route.name, // Указываем текущий экран для возврата
        timestamp // Добавляем метку времени для отслеживания
      });
    }, 50);
  }, [navigation, route.name, externalOnMapOpen, useModalMap, renderAsScreen]);

  const getFullStartDateTime = () => {
    const dateTime = new Date(startDate);
    dateTime.setHours(
        startTime.getHours(),
        startTime.getMinutes(),
        0,
        0
    );
    logData('Время начала стоянки', {
      startDate: startDate.toISOString(),
      startTime: startTime.toISOString(),
      combinedDateTime: dateTime.toISOString(),
      localString: dateTime.toLocaleString()
    });
    return dateTime;
  };

  const getFullEndDateTime = () => {
    const dateTime = new Date(endDate);
    dateTime.setHours(
        endTime.getHours(),
        endTime.getMinutes(),
        0,
        0
    );
    logData('Время окончания стоянки', {
      endDate: endDate.toISOString(),
      endTime: endTime.toISOString(),
      combinedDateTime: dateTime.toISOString(),
      localString: dateTime.toLocaleString()
    });
    return dateTime;
  };

  const validateForm = () => {
    let isFormValid = true;
    let newErrors = {
      address: '',
      district: '',
      photo: '',
      location: '',
      truckModel: '',
      truckNumber: '',
      startTime: '',
      endTime: '',
      schedule: ''
    };

    if (!address || address.trim() === '') {
      newErrors.address = 'Необходимо указать адрес';
      isFormValid = false;
    }

    if (!selectedDistrict) {
      newErrors.district = 'Необходимо выбрать район';
      isFormValid = false;
    }

    if (!photo) {
      newErrors.photo = 'Необходимо прикрепить фотографию';
      isFormValid = false;
    }

    if (!locationData.mapLocation || locationData.mapLocation.trim() === '') {
      newErrors.location = 'Необходимо указать координаты';
      isFormValid = false;
    }

    if (!truckModel || truckModel.trim() === '') {
      newErrors.truckModel = 'Необходимо указать модель транспорта';
      isFormValid = false;
    }

    if (!truckNumber || truckNumber.trim() === '') {
      newErrors.truckNumber = 'Необходимо указать номер транспорта';
      isFormValid = false;
    }

    const startDateTime = getFullStartDateTime();
    const endDateTime = getFullEndDateTime();

    if (endDateTime <= startDateTime) {
      newErrors.endTime = 'Время окончания должно быть позже времени начала';
      isFormValid = false;
    }

    if (scheduleEnabled && scheduleDays.length === 0) {
      newErrors.schedule = 'Выберите хотя бы один день для графика';
      isFormValid = false;
    }

    setErrors(newErrors);
    return isFormValid;
  };

  const preparePhotoForSubmit = () => {
    if (!photoWasChanged) {
      return null;
    }

    if (photo && photo.uri) {
      return {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'photo.jpg'
      };
    }

    return null;
  };

  // Функция выполнения запроса с retry
  const executeWithRetry = async (formData, currentRetry = 0, maxRetries = 5) => {
    try {
      setRetryCount(currentRetry);
      const result = await onSave(formData);
      logData('Остановка успешно обновлена', result);
      
      // Очищаем состояния retry при успехе
      setUploadFailed(false);
      setLastFormData(null);
      setRetryCount(0);
      
      // Перенаправляем на экран остановки
      const stopId = stopData?.id;
      if (stopId) {
        onClose();
        setTimeout(() => {
          navigation.navigate('StopDetails', {
            stopId: parseInt(stopId),
          });
        }, 100);
      } else {
        onClose();
      }
      
      return result;
    } catch (error) {
      logData('Ошибка при обновлении остановки', error);
      
      // Проверяем, является ли ошибка сетевой
      const isNetworkError = 
        error?.code === 'ERR_NETWORK' || 
        error?.message?.includes('network') || 
        error?.message?.includes('timeout') ||
        error?.message?.includes('Network Error');
      
      // Автоматический retry при сетевой ошибке
      if (isNetworkError && currentRetry < maxRetries) {
        const nextRetry = currentRetry + 1;
        logData(`Повторная попытка ${nextRetry}/${maxRetries}`, { error: error.message });
        setRetryCount(nextRetry);
        
        // Экспоненциальная задержка
        const waitTime = 1000 * Math.pow(2, currentRetry);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        return executeWithRetry(formData, nextRetry, maxRetries);
      }
      
      // Если исчерпаны все попытки при сетевой ошибке
      if (isNetworkError && currentRetry >= maxRetries) {
        logData('Исчерпаны все попытки загрузки', { retries: maxRetries });
        setUploadFailed(true);
        setLastFormData(formData);
        setFormSubmitted(false);
        setIsSubmitting(false);
        return;
      }
      
      // Обработка других ошибок (не сетевых)
      if (error && error.errors && Array.isArray(error.errors)) {
        const stockErrors = error.errors.filter(err => err.type === 'INSUFFICIENT_STOCK');
        const priceErrors = error.errors.filter(err => err.type === 'PRICE_VALIDATION' || err.message?.includes('цена'));
        
        if (stockErrors.length > 0) {
          // Ошибки валидации товаров - просто логируем
          logData('Ошибки валидации товаров', stockErrors);
        } else if (priceErrors.length > 0) {
          // Ошибки валидации цен - просто логируем
          logData('Ошибки валидации цен', priceErrors);
        }
      }
      
      setFormSubmitted(false);
      throw error;
    }
  };

  // Функция повторной отправки после неудачи
  const handleRetryUpload = async () => {
    if (!lastFormData) {
      logData('Ошибка: Нет данных для повторной отправки');
      return;
    }
    
    logData('Повторная отправка остановки пользователем', { retryCount });
    setUploadFailed(false);
    setIsSubmitting(true);
    setFormSubmitted(true);
    
    try {
      await executeWithRetry(lastFormData, 0, 5);
    } catch (error) {
      logData('Ошибка при повторной отправке', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Функция отмены неудачной отправки
  const handleCancelUpload = () => {
    logData('Пользователь отменил отправку остановки');
    setUploadFailed(false);
    setLastFormData(null);
    setRetryCount(0);
    setFormSubmitted(false);
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    setFormSubmitted(true);

    if (!validateForm() || isSubmitting) {
      setFormSubmitted(false);
      return;
    }

    setIsSubmitting(true);
    setUploadFailed(false);
    setRetryCount(0);

    const startDateTime = getFullStartDateTime();
    const endDateTime = getFullEndDateTime();
    const startTimeIso = new Date(startDateTime).toISOString();
    const endTimeIso = new Date(endDateTime).toISOString();

    const photoForSubmit = preparePhotoForSubmit();

    // Создаем данные для отправки
    const formData = new FormData();
    formData.append('address', address);
    formData.append('districtId', selectedDistrict);
    if (warehouseId) {
      formData.append('warehouseId', warehouseId);
    }
    formData.append('startTime', startTimeIso);
    formData.append('endTime', endTimeIso);
    formData.append('mapLocation', locationData.mapLocation);
    formData.append('description', description);
    formData.append('truckModel', truckModel);
    formData.append('truckNumber', truckNumber);

    if (scheduleEnabled) {
      formData.append('schedule', JSON.stringify({ enabled: true, daysOfWeek: scheduleDays }));
    } else if (stopData?.schedule) {
      formData.append('schedule', JSON.stringify({ enabled: false }));
    }

    // Добавляем товары если они выбраны
    if (selectedProducts.length > 0) {
      formData.append('products', JSON.stringify(selectedProducts));
    }

    if (photoWasChanged && photoForSubmit) {
      formData.append('photo', photoForSubmit);
    }

    logData('Данные для отправки', {
      address,
      districtId: selectedDistrict,
      startTime: startTimeIso,
      endTime: endTimeIso,
      mapLocation: locationData.mapLocation,
      description,
      truckModel,
      truckNumber,
      photoChanged: photoWasChanged
    });

    // Сохраняем данные для возможного retry
    setLastFormData(formData);

    try {
      if (onSave && typeof onSave === 'function') {
        await executeWithRetry(formData, 0, 5);
      } else {
        setIsSubmitting(false);
        setFormSubmitted(false);
        logData('Ошибка: Функция сохранения не определена');
      }
    } catch (error) {
      logData('Ошибка при обработке сохранения:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <View style={styles.formContainer}>
                  <View style={styles.formHeader}>
                    {/* Блок для выбора фото */}
                    <View style={styles.leftColumn}>
                      <PhotoUpload
                        photo={photo}
                        setPhoto={handlePhotoChange}
                        error={errors.photo && typeof errors.photo === 'string' ? errors.photo : ''}
                      />

                      {/* Перемещенный блок времени стоянки */}
                      <View style={styles.timeSection}>
                        <Text style={[styles.label, { marginBottom: normalize(10) }]}>
                          {scheduleEnabled ? 'Время стоянки (время)' : 'Время стоянки *'}
                        </Text>
                        {!scheduleEnabled && (
                          <View style={styles.timeRow}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                              <Text style={styles.sublabel}>Дата начала</Text>
                              <CustomDatePicker date={startDate} onDateChange={onStartDateChange} />
                              <View style={[styles.inputUnderline, errors.startTime ? styles.underlineError : null]} />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: normalize(10) }]}>
                              <Text style={styles.sublabel}>Дата окончания</Text>
                              <CustomDatePicker date={endDate} onDateChange={onEndDateChange} />
                              <View style={[styles.inputUnderline, errors.endTime ? styles.underlineError : null]} />
                            </View>
                          </View>
                        )}
                        <View style={styles.timeRow}>
                          <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.sublabel}>Время начала</Text>
                            <CustomTimePicker date={startTime} onTimeChange={onStartTimeChange} />
                            <View style={[styles.inputUnderline, errors.startTime ? styles.underlineError : null]} />
                          </View>
                          <View style={[styles.inputGroup, { flex: 1, marginLeft: normalize(10) }]}>
                            <Text style={styles.sublabel}>Время окончания</Text>
                            <CustomTimePicker date={endTime} onTimeChange={onEndTimeChange} />
                            <View style={[styles.inputUnderline, errors.endTime ? styles.underlineError : null]} />
                          </View>
                        </View>
                        {errors.startTime && typeof errors.startTime === 'string' && errors.startTime.trim() ? (
                          <Text style={styles.errorText}>{String(errors.startTime)}</Text>
                        ) : null}
                        {errors.endTime && typeof errors.endTime === 'string' && errors.endTime.trim() ? (
                          <Text style={styles.errorText}>{String(errors.endTime)}</Text>
                        ) : null}
                      </View>

                      <View style={styles.scheduleSection}>
                        <View style={styles.scheduleToggleRow}>
                          <Text style={styles.scheduleToggleLabel}>Повторять по дням</Text>
                          <TouchableOpacity
                            style={[
                              styles.scheduleToggle,
                              scheduleEnabled && styles.scheduleToggleActive
                            ]}
                            onPress={() => {
                              setScheduleEnabled((prev) => !prev);
                              setErrors(prev => ({ ...prev, schedule: '' }));
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={[
                              styles.scheduleToggleText,
                              scheduleEnabled && styles.scheduleToggleTextActive
                            ]}>
                              {scheduleEnabled ? 'Вкл' : 'Выкл'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {scheduleEnabled && (
                          <>
                            <View style={styles.scheduleDaysRow}>
                              {WEEK_DAYS.map((day) => {
                                const isActive = scheduleDays.includes(day.value);
                                return (
                                  <TouchableOpacity
                                    key={day.value}
                                    style={[
                                      styles.scheduleDayButton,
                                      isActive && styles.scheduleDayButtonActive
                                    ]}
                                    onPress={() => toggleScheduleDay(day.value)}
                                    activeOpacity={0.8}
                                  >
                                    <Text style={[
                                      styles.scheduleDayText,
                                      isActive && styles.scheduleDayTextActive
                                    ]}>
                                      {day.label}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>

                            {errors.schedule ? (
                              <Text style={styles.scheduleErrorText}>{errors.schedule}</Text>
                            ) : null}
                          </>
                        )}
                      </View>
                    </View>

                    {/* Блок для ввода адреса и информации о транспорте */}
                    <View style={styles.rightColumn}>
                      <View style={styles.inputGroup}>
                        {/* Блок для выбора района */}
                        <DistrictPicker
                          districts={districts}
                          selectedDistrict={selectedDistrict}
                          setSelectedDistrict={(districtId) => {
                            setSelectedDistrict(districtId);
                            setErrors(prev => ({...prev, district: ''}));
                            // Сбрасываем склад и товары при смене района
                            setWarehouseId(null);
                            setSelectedProducts([]);
                          }}
                          showDistrictPicker={showDistrictPicker}
                          setShowDistrictPicker={setShowDistrictPicker}
                          error={errors.district && typeof errors.district === 'string' ? errors.district : ''}
                        />
                        
                        <Text style={styles.label}>Адрес остановки *</Text>
                        <TextInput
                          style={[styles.input, errors.address ? styles.inputError : null]}
                          value={address}
                          onChangeText={(text) => {
                            setAddress(text);
                            setErrors(prev => ({...prev, address: ''}));
                            logData('Изменен адрес', text);
                          }}
                          placeholder="Введите адрес"
                        />
                        <View style={[styles.inputUnderline, errors.address ? styles.underlineError : null]}/>
                        {errors.address && typeof errors.address === 'string' && errors.address.trim() ? (
                          <Text style={styles.errorText}>{String(errors.address)}</Text>
                        ) : null}
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Модель транспорта *</Text>
                        <TextInput
                          style={[styles.input, errors.truckModel ? styles.inputError : null]}
                          value={truckModel}
                          onChangeText={(text) => {
                            setTruckModel(text);
                            // Очищаем ошибку при вводе
                            setErrors(prev => ({...prev, truckModel: ''}));
                            logData('Изменена модель транспорта', text);
                          }}
                          placeholder="Введите модель"
                        />
                        <View style={[styles.inputUnderline, errors.truckModel ? styles.underlineError : null]}/>
                        {errors.truckModel && typeof errors.truckModel === 'string' && errors.truckModel.trim() ? (
                          <Text style={styles.errorText}>{String(errors.truckModel)}</Text>
                        ) : null}
                      </View>

                      {/* Блок для ввода номера транспорта */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Номер транспорта *</Text>
                        <TextInput
                          style={[styles.input, errors.truckNumber ? styles.inputError : null]}
                          value={truckNumber}
                          onChangeText={(text) => {
                            setTruckNumber(text);
                            setErrors(prev => ({...prev, truckNumber: ''}));
                            logData('Изменен номер транспорта', text);
                          }}
                          placeholder="А001АА 06"
                        />
                        <View style={[styles.inputUnderline, errors.truckNumber ? styles.underlineError : null]}/>
                        {errors.truckNumber && typeof errors.truckNumber === 'string' && errors.truckNumber.trim() ? (
                          <Text style={styles.errorText}>{String(errors.truckNumber)}</Text>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  {/* Блок для выбора склада и товаров на всю ширину */}
                  {selectedDistrict != null && selectedDistrict !== '' && (
                    <View style={styles.fullWidthContainer}>
                      <StopProductsSelector
                        warehouseId={warehouseId}
                        districtId={selectedDistrict}
                        selectedProducts={selectedProducts}
                        onWarehouseChange={setWarehouseId}
                        onProductsChange={setSelectedProducts}
                      />
                    </View>
                  )}

                  {/* Блок для выбора времени начала и окончания стоянки (напротив друг друга) */}
                  <View style={styles.timeContainer}>
                    <View style={[styles.timeSection, styles.timeLeft]}>
                      {/* Исправлено с "90%" на числовое значение */}
                      <View style={[styles.timeRow, { width: 320 }]}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                          <Text style={styles.sublabel}>Начало</Text>
                          <CustomTimePicker date={startTime} onTimeChange={onStartTimeChange} />
                          <View style={[styles.inputUnderline, errors.startTime ? styles.underlineError : null]} />
                        </View>
                      </View>
                      {errors.startTime && typeof errors.startTime === 'string' && errors.startTime.trim() ? (
                        <Text style={styles.errorText}>{String(errors.startTime)}</Text>
                      ) : null}
                    </View>

                    <View style={[styles.timeSection, styles.timeRight]}>
                      {/* Исправлено с "90%" на числовое значение */}
                      <View style={[styles.timeRow, { width: 320 }]}>
                        <View style={[styles.inputGroup, { flex: 1}]}>
                          <Text style={styles.sublabel}>Окончание</Text>
                          <CustomTimePicker date={endTime} onTimeChange={onEndTimeChange} />
                          <View style={[styles.inputUnderline, errors.endTime ? styles.underlineError : null]} />
                        </View>
                      </View>
                      {errors.endTime && typeof errors.endTime === 'string' && errors.endTime.trim() ? (
                        <Text style={styles.errorText}>{String(errors.endTime)}</Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Блок для ввода описания */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Дополнительный комментарий</Text>
                    <TextInput
                      style={[styles.input, styles.commentInput]}
                      value={description}
                      onChangeText={(text) => {
                        setDescription(text);
                        logData('Изменено описание', text);
                      }}
                      placeholder="Введите дополнительный комментарий"
                      multiline={true}
                      numberOfLines={3}
                    />
                    <View style={styles.inputUnderline}/>
                  </View>

                  {/* Блок координат */}
                  <LocationInput
                    mapLocation={locationData.mapLocation ? String(locationData.mapLocation) : ''}
                    setMapLocation={(text) => {
                      setLocationData(prev => ({...prev, mapLocation: text ? String(text) : ''}));
                      setErrors(prev => ({...prev, location: ''}));
                    }}
                    isLocationLoading={isLocationLoading}
                    setIsLocationLoading={setIsLocationLoading}
                    onOpenMap={handleMapOpen}
                    error={errors.location && typeof errors.location === 'string' ? errors.location : ''}
                    setAddress={setAddress}
                  />

                  {/* Блок с кнопками Повторить/Отмена при неудачной загрузке */}
                  {uploadFailed && (
                    <View style={styles.retryContainer}>
                      <View style={styles.retryIconContainer}>
                        <Text style={styles.retryIcon}>⚠️</Text>
                      </View>
                      <Text style={styles.retryTitle}>Не удалось сохранить данные</Text>
                      <Text style={styles.retryMessage}>
                        Проверьте интернет-соединение и попробуйте снова
                      </Text>
                      <View style={styles.retryButtonsRow}>
                        <TouchableOpacity
                          style={[styles.retryButton, styles.cancelRetryButton]}
                          onPress={handleCancelUpload}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.cancelButtonText}>Отмена</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.retryButton, styles.retryActionButton]}
                          onPress={handleRetryUpload}
                          activeOpacity={0.7}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.retryButtonText}>🔄 Повторить</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Кнопка добавления остановки - скрыта при показе блока retry */}
                  {!uploadFailed && (
                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        (isSubmitting && formSubmitted) && styles.disabledButton
                      ]}
                      onPress={handleSubmit}
                      activeOpacity={0.7}
                      disabled={isSubmitting && formSubmitted}
                    >
                      {isSubmitting && formSubmitted ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator size="small" color="#fff"/>
                          <Text style={styles.submitButtonText}>
                            {retryCount > 0 ? `Попытка ${retryCount}/5...` : 'Сохранение...'}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.submitButtonText}>Готово!</Text>
                      )}
                    </TouchableOpacity>
                  )}
    </View>
  );

  if (renderAsScreen) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          style={styles.scrollView}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: keyboardVisible ? 120 : 20 }}
          onScrollBeginDrag={dismissKeyboard}
          ref={scrollViewRef}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={{ flex: 1 }}
            onPress={dismissKeyboard}
          >
            {formContent}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={handleClose}
      supportedOrientations={['portrait']}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={handleModalOverlayPress}
      >
        <View 
          style={[
            styles.modalContent, 
            { 
              height: keyboardVisible ? (Platform.OS === 'ios' ? '95%' : '92%') : '90%',
              paddingBottom: keyboardVisible ? (Platform.OS === 'ios' ? 30 : 0) : 0
            }
          ]}
        >
          <EditStopHeader onClose={handleClose} />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
          >
            <ScrollView 
              style={styles.scrollView}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: keyboardVisible ? 120 : 20 }}
              onScrollBeginDrag={dismissKeyboard}
              ref={scrollViewRef}
            >
              <TouchableOpacity 
                activeOpacity={1} 
                style={{ flex: 1 }}
                onPress={dismissKeyboard}
              >
                {formContent}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    width: '100%',
    backgroundColor: Color.colorLightMode,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    zIndex: 10,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: normalize(16),
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: normalize(5),
  },
  leftColumn: {
    width: '35%',
  },
  rightColumn: {
    width: '55%',
  },
  fullWidthContainer: {
    width: '100%',
    marginBottom: normalize(5),
  },
  timeLeft: {
    width: '45%',
    marginRight: normalize(5),
  },
  timeRight: {
    width: '45%',
  },
  inputGroup: {
    marginBottom: normalize(20),
  },
  label: {
    fontSize: normalizeFont(15),
    fontWeight: '600',
    color: Color.dark,
    opacity: 0.4,
    marginBottom: 0,
    fontFamily: FontFamily.sFProText,
  },
  sublabel: {
    fontSize: normalizeFont(15),
    fontWeight: '500',
    color: Color.dark,
    opacity: 0.4,
    fontFamily: FontFamily.sFProText,
  },
  input: {
    height: normalize(30),
    fontSize: normalizeFont(FontSize.size_xs),
    color: Color.dark,
    paddingVertical: normalize(5),
    paddingLeft: 0,
    fontFamily: FontFamily.sFProText,
  },
  inputError: {
    color: '#FF3B30',
  },
  commentInput: {
    height: normalize(30),
    textAlignVertical: 'top',
    paddingLeft: 0,
  },
  inputUnderline: {
    height: 1,
    backgroundColor: '#000',
    marginTop: 0,
  },
  underlineError: {
    backgroundColor: '#FF3B30',
    height: 1.5,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: normalizeFont(FontSize.size_xs),
    marginTop: normalize(5),
    fontFamily: FontFamily.sFProText,
  },
  scheduleSection: {
    marginTop: normalize(12),
  },
  scheduleToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: normalize(10),
  },
  scheduleToggleLabel: {
    fontSize: normalizeFont(13),
    color: Color.dark,
    fontFamily: FontFamily.sFProText,
  },
  scheduleToggle: {
    paddingHorizontal: normalize(12),
    paddingVertical: normalize(4),
    borderRadius: 12,
    backgroundColor: '#E5E5EA',
  },
  scheduleToggleActive: {
    backgroundColor: '#3B43A2',
  },
  scheduleToggleText: {
    fontSize: normalizeFont(11),
    color: '#6B7280',
    fontFamily: FontFamily.sFProText,
  },
  scheduleToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scheduleDaysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: normalize(6),
  },
  scheduleDayButton: {
    width: normalize(30),
    height: normalize(30),
    borderRadius: normalize(15),
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleDayButtonActive: {
    backgroundColor: '#3B43A2',
  },
  scheduleDayText: {
    fontSize: normalizeFont(11),
    color: '#6B7280',
    fontFamily: FontFamily.sFProText,
  },
  scheduleDayTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scheduleErrorText: {
    color: '#FF3B30',
    fontSize: normalizeFont(FontSize.size_xs),
    marginTop: normalize(6),
    fontFamily: FontFamily.sFProText,
  },
  dateTimePicker: {
    height: normalize(40),
    justifyContent: 'center',
    paddingLeft: 0,
  },
  dateTimeText: {
    fontSize: normalizeFont(FontSize.size_sm),
    color: Color.dark,
    fontFamily: FontFamily.sFProText,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: normalize(10),
  },
  timeHalf: {
    width: '48%',
  },
  sectionTitle: {
    fontSize: normalizeFont(FontSize.size_sm),
    fontWeight: '600',
    color: Color.dark,
    marginBottom: normalize(10),
    fontFamily: FontFamily.sFProText,
    opacity: 0.4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  submitButton: {
    backgroundColor: '#3B43A2',
    height: normalize(40),
    borderRadius: Border.br_3xs,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: normalize(20),
    marginBottom: normalize(30),
  },
  disabledButton: {
    backgroundColor: '#a0a0a0',
  },
  submitButtonText: {
    color: Color.colorLightMode,
    fontSize: normalizeFont(FontSize.size_sm),
    fontWeight: '500',
    fontFamily: FontFamily.sFProText,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: normalize(10),
  },
  // Стили для блока повторной отправки
  retryContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: normalize(20),
    marginTop: normalize(16),
    marginBottom: normalize(16),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  retryIconContainer: {
    marginBottom: normalize(12),
  },
  retryIcon: {
    fontSize: normalizeFont(32),
  },
  retryTitle: {
    fontSize: normalizeFont(17),
    fontWeight: '600',
    color: '#856404',
    marginBottom: normalize(8),
    textAlign: 'center',
    fontFamily: FontFamily.sFProText,
  },
  retryMessage: {
    fontSize: normalizeFont(14),
    color: '#856404',
    textAlign: 'center',
    marginBottom: normalize(16),
    fontFamily: FontFamily.sFProText,
    opacity: 0.8,
  },
  retryButtonsRow: {
    flexDirection: 'row',
    gap: normalize(12),
    width: '100%',
  },
  retryButton: {
    flex: 1,
    height: normalize(44),
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelRetryButton: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#856404',
  },
  cancelButtonText: {
    fontSize: normalizeFont(15),
    fontWeight: '600',
    color: '#856404',
    fontFamily: FontFamily.sFProText,
  },
  retryActionButton: {
    backgroundColor: '#3B43A2',
  },
  retryButtonText: {
    fontSize: normalizeFont(15),
    fontWeight: '600',
    color: '#fff',
    fontFamily: FontFamily.sFProText,
  },
});