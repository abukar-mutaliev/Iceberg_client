import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Keyboard,
    Alert
} from 'react-native';
import ImageResizer from 'react-native-image-resizer';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { CustomDatePicker, CustomTimePicker } from '@shared/ui/Pickers/CustomDatePicker';
import { selectDriverLoading } from "@entities/driver";
import { PhotoSection } from './PhotoSection';
import { LocationInput } from './LocationInput';
import { DistrictPicker } from '@shared/ui/Pickers/DistrictPicker';
import { logData } from '@shared/lib/logger';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { DriverPicker } from "@features/driver/DriverPicker";
import { createStop } from "@entities/stop";
import { useToast } from '@shared/ui/Toast';
import { useCustomAlert } from '@shared/ui/CustomAlert/CustomAlertProvider';
import { StopProductsSelector } from './StopProductsSelector';
import { FormSection, FormField, FormDivider } from './FormField';
import { FormProgressBar } from './FormProgressIndicator';
import { FormHint, QuickAction, QuickActionsGroup, InfoBanner } from './FormQuickActions';

const WEEK_DAYS = [
    { label: 'Пн', value: 1 },
    { label: 'Вт', value: 2 },
    { label: 'Ср', value: 3 },
    { label: 'Чт', value: 4 },
    { label: 'Пт', value: 5 },
    { label: 'Сб', value: 6 },
    { label: 'Вс', value: 0 }
];

const toLocalISOString = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return '';
    }
    const pad = (value) => String(value).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    const millis = String(date.getMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${millis}`;
};

const getTimezoneOffsetString = () => {
    const offsetMinutes = -new Date().getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absMinutes = Math.abs(offsetMinutes);
    const hours = String(Math.floor(absMinutes / 60)).padStart(2, '0');
    const minutes = String(absMinutes % 60).padStart(2, '0');
    return `${sign}${hours}:${minutes}`;
};

export const StopForm = memo(({
                                  districts,
                                  locationData,
                                  setLocationData,
                                  formSubmitted,
                                  setFormSubmitted,
                                  userRole,
                                  isLocationLoading,
                                  setIsLocationLoading,
                                  addressFromMap,
                                  scrollToInput,
                                  scrollToEnd,
                                  onMapOpen,
                                  useModalMap = false
                              }) => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const route = useRoute();
    const scrollViewRef = useRef(null);
    const commentInputRef = useRef(null);
    const commentInputYPosition = useRef(0);
    const isLoading = useSelector(selectDriverLoading);
    const allDrivers = useSelector(state => state.driver?.allDrivers || []);
    const { showError, showInfo } = useToast();
    const { 
        showWarning: showAlertWarning,
        showError: showAlertError
    } = useCustomAlert();

    const isAdminOrEmployee = userRole === 'ADMIN' || userRole === 'EMPLOYEE';

    const [address, setAddress] = useState('');
    const [photo, setPhoto] = useState(null);
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [startTime, setStartTime] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [endTime, setEndTime] = useState(new Date(new Date().getTime() + 2 * 60 * 60 * 1000));
    const [selectedDistrict, setSelectedDistrict] = useState(null);
    const [showDistrictPicker, setShowDistrictPicker] = useState(false);
    const [truckModel, setTruckModel] = useState('');
    const [truckNumber, setTruckNumber] = useState('');
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [showDriverPicker, setShowDriverPicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [warehouseId, setWarehouseId] = useState(null);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [priceValidationErrors, setPriceValidationErrors] = useState({}); // Ошибки валидации цен по productId
    const [uploadFailed, setUploadFailed] = useState(false); // Флаг неудачной загрузки после всех попыток
    const [lastSubmitData, setLastSubmitData] = useState(null); // Данные для повторной отправки
    const [retryCount, setRetryCount] = useState(0); // Счетчик попыток для отображения
    const [scheduleEnabled, setScheduleEnabled] = useState(false);
    const [scheduleDays, setScheduleDays] = useState([]);
    const [errors, setErrors] = useState({
        address: '',
        district: '',
        photo: '',
        location: '',
        truckModel: '',
        truckNumber: '',
        startTime: '',
        endTime: '',
        driver: '',
        schedule: ''
    });

    const isNavigatingRef = useRef(false);
    const isFormInitialized = useRef(false);
    const [showHint, setShowHint] = useState(true);
    const lastAddressFromMapRef = useRef('');

    // Функция повторной отправки после неудачи
    const handleRetryUpload = useCallback(async () => {
        if (!lastSubmitData) {
            showError('Нет данных для повторной отправки');
            return;
        }
        
        logData('Повторная отправка остановки пользователем', { retryCount });
        setUploadFailed(false);
        setIsSubmitting(true);
        setFormSubmitted(true);
        
        try {
            const result = await dispatch(createStop(lastSubmitData)).unwrap();
            logData('Остановка успешно создана при повторной отправке', result);
            
            setPriceValidationErrors({});
            setUploadFailed(false);
            setLastSubmitData(null);
            setRetryCount(0);
            
            // Показываем краткое уведомление
            showInfo('✅ Остановка успешно добавлена');
            
            // Переходим к деталям созданной остановки
            const stopId = result?.data?.id || result?.id;
            logData('Навигация к остановке (повторная отправка)', { stopId, result });
            
            setTimeout(() => {
                if (stopId) {
                    navigation.replace('StopDetails', { stopId });
                } else {
                    logData('Не удалось получить ID остановки для навигации', result);
                    navigation.goBack();
                }
            }, 300);
        } catch (error) {
            logData('Ошибка при повторной отправке', error);
            setUploadFailed(true);
            showError('Не удалось отправить. Попробуйте еще раз.');
        } finally {
            setIsSubmitting(false);
            setFormSubmitted(false);
        }
    }, [lastSubmitData, dispatch, navigation, showInfo, showError, retryCount]);

    // Функция отмены неудачной отправки
    const handleCancelUpload = useCallback(() => {
        logData('Пользователь отменил отправку остановки');
        setUploadFailed(false);
        setLastSubmitData(null);
        setRetryCount(0);
        setFormSubmitted(false);
        setIsSubmitting(false);
        showInfo('Отправка отменена. Вы можете изменить данные и попробовать снова.');
    }, [showInfo]);

    // Подсчет заполненных обязательных полей для индикатора прогресса
    const { totalFields, filledFields } = useMemo(() => {
        const requiredFields = [
            address,
            selectedDistrict,
            // TODO: Временно убран для первой версии. Раскомментировать когда понадобится функционал выбора склада
            // warehouseId,
            photo,
            locationData.mapLocation,
            truckModel,
            truckNumber,
            startDate,
            startTime,
            endDate,
            endTime,
            ...(isAdminOrEmployee ? [selectedDriver] : [])
        ];
        const filled = requiredFields.filter(field => {
            if (field === null || field === undefined) return false;
            if (typeof field === 'string') return field.trim() !== '';
            if (field instanceof Date) return true;
            return !!field;
        }).length;
        return { 
            totalFields: requiredFields.length, 
            filledFields: filled 
        };
    }, [
        address, 
        selectedDistrict, 
        // TODO: Временно убран для первой версии
        // warehouseId, 
        photo, 
        locationData.mapLocation, 
        truckModel, 
        truckNumber, 
        startDate, 
        startTime, 
        endDate, 
        endTime,
        isAdminOrEmployee,
        selectedDriver
    ]);

    const compressImage = async (imageUri) => {
        try {
            const resizedImage = await ImageResizer.createResizedImage(
                imageUri,
                800,
                600,
                'JPEG',
                80,
                0,
                undefined,
                false,
                { mode: 'contain', onlyScaleDown: true }
            );
            return resizedImage.uri;
        } catch (error) {
            console.log('Ошибка при сжатии изображения:', error);
            return imageUri;
        }
    };

    useEffect(() => {
        if (!isFormInitialized.current) {
            isFormInitialized.current = true;
            logData('StopForm: Инициализация формы для пользователя с ролью', userRole);
        }
    }, [userRole]);

    useEffect(() => {
        if (!addressFromMap || addressFromMap.trim() === '') {
            return;
        }

        if (addressFromMap === lastAddressFromMapRef.current) {
            return;
        }

        lastAddressFromMapRef.current = addressFromMap;
        logData('StopForm: Получен адрес из карты', addressFromMap);
        setAddress(addressFromMap);
        setErrors(prev => ({ ...prev, address: '' }));
    }, [addressFromMap]);

    const onStartDateChange = useCallback((date) => {
        logData('Изменение даты начала', date);
        setStartDate(date);
        if (date > endDate) {
            setEndDate(date);
        }
        setErrors(prev => ({...prev, startTime: ''}));
    }, [endDate]);

    const onStartTimeChange = useCallback((time) => {
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
    }, [startDate, endDate, endTime]);

    const onEndDateChange = useCallback((date) => {
        logData('Изменение даты окончания', date);
        if (date < startDate) {
            setErrors(prev => ({...prev, endTime: 'Дата окончания не может быть раньше даты начала'}));
            return;
        }
        setEndDate(date);
        setErrors(prev => ({...prev, endTime: ''}));
    }, [startDate]);

    useEffect(() => {
        if (!scheduleEnabled) return;
        const today = new Date();
        const normalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        setStartDate(normalized);
        setEndDate(normalized);
    }, [scheduleEnabled]);

    const onEndTimeChange = useCallback((time) => {
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
    }, [startDate, endDate, startTime]);

    const toggleScheduleDay = useCallback((dayValue) => {
        setScheduleDays((prev) => {
            if (prev.includes(dayValue)) {
                return prev.filter((d) => d !== dayValue);
            }
            return [...prev, dayValue];
        });
        setErrors(prev => ({ ...prev, schedule: '' }));
    }, []);

    const getFullStartDateTime = useCallback(() => {
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
    }, [startDate, startTime]);

    const getFullEndDateTime = useCallback(() => {
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
    }, [endDate, endTime]);

    const handleMapOpen = useCallback((currentLocation) => {
        if (isNavigatingRef.current || isLocationLoading) return;

        Keyboard.dismiss();

        logData('Открытие карты из StopForm', {
            currentLocation,
            timestamp: new Date().toISOString(),
            useModalMap
        });

        // Если передан prop onMapOpen (для модального окна), используем его
        if (useModalMap && onMapOpen) {
            onMapOpen(currentLocation);
            return;
        }

        // Иначе используем навигацию (старый способ)
        isNavigatingRef.current = true;
        const timestamp = new Date().getTime();

        setTimeout(() => {
            navigation.navigate('MapScreen', {
                initialLocation: currentLocation,
                returnScreen: route.name,
                timestamp
            });

            setTimeout(() => {
                isNavigatingRef.current = false;
            }, 500);
        }, 0);
    }, [navigation, route.name, isLocationLoading, useModalMap, onMapOpen]);

    const validateForm = useCallback(() => {
        let isFormValid = true;
        let newErrors = {
            address: '',
            district: '',
            warehouse: '',
            photo: '',
            location: '',
            truckModel: '',
            truckNumber: '',
            startTime: '',
            endTime: '',
            driver: '',
        };

        if (isAdminOrEmployee && !selectedDriver) {
            newErrors.driver = 'Необходимо выбрать водителя';
            isFormValid = false;
        }

        if (!address || address.trim() === '') {
            newErrors.address = 'Необходимо указать адрес';
            isFormValid = false;
        }

        if (!selectedDistrict) {
            newErrors.district = 'Необходимо выбрать район';
            isFormValid = false;
        }

        // TODO: Временно отключена валидация склада для первой версии. Раскомментировать когда понадобится функционал
        // if (!warehouseId) {
        //     newErrors.warehouse = 'Необходимо выбрать склад';
        //     isFormValid = false;
        // }

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
        
        if (!isFormValid) {
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }
        
        return isFormValid;
    }, [
        isAdminOrEmployee,
        selectedDriver,
        address,
        selectedDistrict,
        // TODO: Временно убран для первой версии
        // warehouseId,
        photo,
        locationData.mapLocation,
        truckModel,
        truckNumber,
        getFullStartDateTime,
        getFullEndDateTime,
        scheduleEnabled,
        scheduleDays.length
    ]);

    const handleSubmit = useCallback(async () => {
        Keyboard.dismiss();
        
        setIsSubmitting(true);
        setFormSubmitted(true);

        if (!validateForm()) {
            setFormSubmitted(false);
            setIsSubmitting(false);
            showError('Пожалуйста, заполните все обязательные поля');
            return;
        }

        try {
            const NetInfo = require('@react-native-community/netinfo');
            const networkState = await NetInfo.fetch();
            
            if (!networkState.isConnected) {
                logData('Отсутствует подключение к сети', networkState);
                setFormSubmitted(false);
                setIsSubmitting(false);
                showError('Отсутствует подключение к интернету. Пожалуйста, проверьте ваше соединение и попробуйте снова.');
                return;
            }
        } catch (netInfoError) {
            logData('Ошибка при проверке сети', netInfoError);
        }

        try {
            let photoForUpload = null;
            
            if (photo && photo.uri) {
                try {
                    const fileExtension = photo.uri.split('.').pop() || 'jpg';
                    const mimeType = photo.mimeType || (fileExtension === 'png' ? 'image/png' : 'image/jpeg');
                    const MAX_FILE_SIZE = 700 * 1024;
                    
                    if (photo.fileSize && photo.fileSize > MAX_FILE_SIZE) {
                        logData('Фото слишком большое, снижаем качество', {
                            originalSize: photo.fileSize,
                            maxSize: MAX_FILE_SIZE
                        });
                        
                        try {
                            const ImageManipulator = require('expo-image-manipulator');
                            const resizedPhoto = await ImageManipulator.manipulateAsync(
                                photo.uri,
                                [{ resize: { width: 800 } }],
                                { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
                            );
                            
                            logData('Фото успешно сжато', {
                                originalSize: photo.fileSize,
                                newUri: resizedPhoto.uri
                            });
                            
                            photoForUpload = {
                                uri: resizedPhoto.uri,
                                type: 'image/jpeg',
                                name: `photo_${Date.now()}.jpg`
                            };
                        } catch (resizeError) {
                            logData('Ошибка при сжатии, используем оригинал', resizeError);
                            photoForUpload = {
                                uri: photo.uri,
                                type: mimeType,
                                name: `photo_${Date.now()}.${fileExtension}`
                            };
                        }
                    } else {
                        photoForUpload = {
                            uri: photo.uri,
                            type: mimeType,
                            name: `photo_${Date.now()}.${fileExtension}`
                        };
                    }
                    
                    logData('Подготовлено фото для отправки', { 
                        uri: photoForUpload.uri,
                        type: photoForUpload.type,
                        name: photoForUpload.name,
                        size: photo.fileSize || 'unknown'
                    });
                } catch (error) {
                    logData('Ошибка при подготовке фото', error);
                    showInfo('Возникла проблема с обработкой фото, но форма будет отправлена');
                    
                    photoForUpload = {
                        uri: photo.uri,
                        type: 'image/jpeg',
                        name: `photo_${Date.now()}.jpg`
                    };
                }
            }

            const startDateTime = getFullStartDateTime();
            const endDateTime = getFullEndDateTime();
            const startTimeIso = toLocalISOString(startDateTime);
            const endTimeIso = toLocalISOString(endDateTime);

            const stopData = {
                address,
                districtId: selectedDistrict,
                warehouseId: warehouseId,
                startTime: startTimeIso,
                endTime: endTimeIso,
                mapLocation: locationData.mapLocation,
                description,
                photo: photoForUpload,
                truckModel,
                truckNumber,
                products: selectedProducts.length > 0 ? selectedProducts : undefined,
            };

            if (scheduleEnabled) {
                stopData.schedule = {
                    enabled: true,
                    daysOfWeek: scheduleDays,
                    timezone: getTimezoneOffsetString()
                };
            }

            if (isAdminOrEmployee && selectedDriver) {
                stopData.driverId = selectedDriver;
            }

            logData('Данные для отправки', {
                ...stopData,
                photo: photoForUpload ? 'Photo included' : null
            });

            // Сохраняем данные для возможной повторной отправки
            setLastSubmitData(stopData);
            setUploadFailed(false);
            setRetryCount(0);

            try {
                // Callback для обновления UI во время retry
                const onRetryCallback = (attempt, error) => {
                    setRetryCount(attempt);
                    showInfo(`📶 Повторная попытка ${attempt} из 5...`);
                    logData(`Повторная попытка загрузки остановки ${attempt}/5`, {
                        error: error.message,
                        code: error.code
                    });
                };

                // Добавляем onRetry callback в данные
                const stopDataWithRetry = {
                    ...stopData,
                    onRetry: onRetryCallback
                };

                const result = await dispatch(createStop(stopDataWithRetry)).unwrap();
                logData('Остановка успешно создана', result);
                
                if (result && result.data) {
                    const photoUrl = result.data.photo;
                    logData('Информация о созданной остановке', {
                        stopId: result.data.id,
                        photoUrl: photoUrl
                    });
                }
                
                // Очищаем ошибки валидации цен и состояние retry при успешной отправке
                setPriceValidationErrors({});
                setUploadFailed(false);
                setLastSubmitData(null);
                setRetryCount(0);
                
                // Показываем краткое уведомление
                showInfo('✅ Остановка успешно добавлена');
                
                // Переходим к деталям созданной остановки
                const stopId = result?.data?.id || result?.id;
                logData('Навигация к остановке', { stopId, result });
                
                setTimeout(() => {
                    if (stopId) {
                        navigation.replace('StopDetails', { stopId });
                    } else {
                        logData('Не удалось получить ID остановки для навигации', result);
                        navigation.goBack();
                    }
                }, 300);
                
            } catch (error) {
                logData('Ошибка при создании остановки', error);
                
                // Проверяем, является ли это сетевой ошибкой или timeout
                const isNetworkError = 
                    error?.code === 'ERR_NETWORK' || 
                    error?.code === 'TIMEOUT' ||
                    error?.code === 'ECONNABORTED' ||
                    error?.message?.includes('Network') ||
                    error?.message?.includes('network') || 
                    error?.message?.includes('timeout') ||
                    error?.message?.includes('Превышено время') ||
                    error?.originalError?.code === 'ERR_NETWORK' ||
                    error?.originalError?.code === 'ECONNABORTED';
                
                logData('Проверка типа ошибки', {
                    isNetworkError,
                    errorCode: error?.code,
                    errorMessage: error?.message
                });
                
                // Если исчерпаны все попытки при сетевой ошибке - показываем кнопки Повторить/Отмена
                if (isNetworkError) {
                    logData('Исчерпаны все попытки загрузки (5 попыток)', { error: error.message });
                    setUploadFailed(true);
                    setFormSubmitted(false);
                    setIsSubmitting(false);
                    setRetryCount(0);
                    showError('Не удалось отправить данные после 5 попыток. Проверьте интернет-соединение.');
                    return;
                }
                
                // Извлекаем ошибки из разных возможных мест (Redux thunk использует payload)
                // createProtectedRequest выбрасывает error.response?.data, который попадает в payload
                let errorData = error?.payload || error?.response?.data || error?.data || error;
                
                // Если errorData это строка, пытаемся найти объект в других местах
                if (typeof errorData === 'string') {
                    // Пытаемся найти объект в других местах
                    const alternativeData = error?.response?.data || error?.data;
                    if (alternativeData && typeof alternativeData === 'object') {
                        errorData = alternativeData;
                    } else {
                        errorData = { message: errorData };
                    }
                }
                
                // Извлекаем массив ошибок и сообщение
                const errorsArray = errorData?.errors || error?.errors;
                const errorMessage = errorData?.message || errorData?.error || error?.message || (typeof errorData === 'string' ? errorData : String(error));
                
                logData('Подробная структура ошибки', {
                    hasErrors: !!errorsArray,
                    errorsIsArray: Array.isArray(errorsArray),
                    errorKeys: error ? Object.keys(error) : null,
                    errorPayload: error?.payload,
                    errorResponseData: error?.response?.data,
                    errorData: errorData,
                    errorMessage: errorMessage,
                    errorsArray: errorsArray
                });
                
                // Проверяем, есть ли ошибка валидации цены в сообщении
                const hasPriceError = errorMessage?.includes('валидации цены') || errorMessage?.includes('цена') || errorMessage?.includes('не должна быть меньше');
                
                // Обработка ошибок валидации товаров (недостаток товара, цены и т.д.)
                if (errorsArray && Array.isArray(errorsArray)) {
                        const stockErrors = errorsArray.filter(err => err.type === 'INSUFFICIENT_STOCK');
                        const priceErrors = errorsArray.filter(err => err.type === 'PRICE_VALIDATION' || err.message?.includes('цена'));
                        const fieldErrors = {};
                        
                        // Обработка ошибок недостатка товара
                        if (stockErrors.length > 0) {
                            const errorMessages = stockErrors.map(err => {
                                const productName = err.productName || `Товар #${err.productId}`;
                                const requested = err.requested || 0;
                                const available = err.available || 0;
                                const shortage = err.shortage || 0;
                                return `${productName}: запрошено ${requested}, доступно ${available} (не хватает ${shortage})`;
                            });
                            
                            const errorTitle = stockErrors.length === 1 
                                ? 'Недостаточно товара на складе'
                                : `Недостаточно товара на складе (${stockErrors.length} товаров)`;
                            
                            showError(errorTitle);
                            showAlertError(
                                errorTitle,
                                errorMessages.join('\n\n') + '\n\nПожалуйста, уменьшите количество товаров или выберите другой склад.',
                                [{ text: 'OK' }]
                            );
                            
                            // Обновляем выбранные товары, уменьшая количество до доступного
                            const updatedProducts = selectedProducts.map(product => {
                                const stockError = stockErrors.find(err => err.productId === product.productId);
                                if (stockError && stockError.available !== undefined) {
                                    return {
                                        ...product,
                                        quantity: Math.min(product.quantity, stockError.available)
                                    };
                                }
                                return product;
                            });
                            setSelectedProducts(updatedProducts);
                            
                            setFormSubmitted(false);
                            setIsSubmitting(false);
                            return;
                        }
                        
                        // Обработка ошибок валидации цен
                        if (priceErrors.length > 0) {
                            // Сохраняем ошибки для отображения под полями
                            const priceErrorsMap = {};
                            priceErrors.forEach(err => {
                                priceErrorsMap[err.productId] = err.message;
                            });
                            setPriceValidationErrors(priceErrorsMap);
                            
                            showError('Ошибка валидации цен. Проверьте поля ввода цен.');
                            
                            setFormSubmitted(false);
                            setIsSubmitting(false);
                            return;
                        }
                        
                        // Очищаем ошибки валидации цен при успешной отправке
                        setPriceValidationErrors({});
                        
                        // Обработка остальных ошибок полей формы
                        errorsArray.forEach(err => {
                            if (err.message.includes('Адрес')) {
                                fieldErrors.address = err.message;
                            } else if (err.message.includes('координат')) {
                                fieldErrors.location = err.message;
                            } else if (err.message.includes('модел')) {
                                fieldErrors.truckModel = err.message;
                            } else if (err.message.includes('номер')) {
                                fieldErrors.truckNumber = err.message;
                            } else if (err.message.includes('район')) {
                                fieldErrors.district = err.message;
                            } else if (err.message.includes('фот')) {
                                fieldErrors.photo = err.message;
                            } else if (err.message.includes('начал')) {
                                fieldErrors.startTime = err.message;
                            } else if (err.message.includes('окончан')) {
                                fieldErrors.endTime = err.message;
                            } else if (err.message.includes('водит')) {
                                fieldErrors.driver = err.message;
                            }
                        });
                        
                        if (Object.keys(fieldErrors).length > 0) {
                            setErrors(prev => ({
                                ...prev,
                                ...fieldErrors
                            }));
                            
                            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                            showError('Пожалуйста, исправьте ошибки в форме');
                            setFormSubmitted(false);
                            setIsSubmitting(false);
                        } else {
                            // Показываем конкретное сообщение об ошибке, если оно есть
                            const finalErrorMessage = errorMessage && errorMessage !== String(error) 
                                ? errorMessage 
                                : 'Произошла ошибка при создании остановки. Пожалуйста, попробуйте еще раз.';
                            showError(finalErrorMessage);
                            setIsSubmitting(false);
                        }
                    }
                    
                    // Обработка ошибки валидации цены из сообщения (когда ошибка не в формате массива)
                    if (hasPriceError && errorMessage && (!errorsArray || !Array.isArray(errorsArray))) {
                        showError('Ошибка валидации цены');
                        showAlertError(
                            'Ошибка валидации цены',
                            errorMessage + '\n\nПожалуйста, исправьте цену товара или оставьте поле пустым для использования цены склада.',
                            [{ text: 'OK' }]
                        );
                        
                        setFormSubmitted(false);
                        setIsSubmitting(false);
                        return;
                    }
                    
                // Если ошибка не была обработана выше, показываем общее сообщение
                if (!hasPriceError || (errorsArray && Array.isArray(errorsArray))) {
                    const finalErrorMessage = errorMessage && errorMessage !== String(error) 
                        ? errorMessage 
                        : 'Произошла ошибка при создании остановки. Пожалуйста, попробуйте еще раз.';
                    showError(finalErrorMessage);
                    setIsSubmitting(false);
                }
            } finally {
                // Всегда сбрасываем флаг отправки в конце
                if (!uploadFailed) {
                    setIsSubmitting(false);
                    setFormSubmitted(false);
                }
            }
        } catch (error) {
            logData('Ошибка при обработке формы', error);
            showError('Ошибка при обработке данных. Пожалуйста, попробуйте еще раз.');
            setFormSubmitted(false);
            setIsSubmitting(false);
        }
    }, [
        validateForm,
        getFullStartDateTime,
        getFullEndDateTime,
        address,
        selectedDistrict,
        locationData.mapLocation,
        description,
        photo,
        truckModel,
        truckNumber,
        isAdminOrEmployee,
        selectedDriver,
        dispatch,
        navigation,
        addressFromMap,
        showError,
        showInfo,
        warehouseId,
        selectedProducts,
        priceValidationErrors
    ]);

    return (
        <View 
            style={styles.formContainer}
            onLayout={(event) => {
                const { height } = event.nativeEvent.layout;
                console.log('[StopForm] Form container height:', height);
            }}
        >
                {/* Индикатор прогресса */}
                <FormProgressBar 
                    totalFields={totalFields} 
                    filledFields={filledFields} 
                />

                {/* Информационный баннер */}
                {showHint && (
                    <InfoBanner
                        type="info"
                        title="Совет"
                        message="Заполните все поля со звездочкой (*) для успешного создания остановки"
                        onClose={() => setShowHint(false)}
                    />
                )}

      

                {isAdminOrEmployee && (
                    <FormSection title="Водитель">
                        <FormField
                            required={isAdminOrEmployee}
                            error={errors.driver}
                        >
                            <DriverPicker
                                drivers={allDrivers}
                                selectedDriver={selectedDriver}
                                setSelectedDriver={(driverId) => {
                                    setSelectedDriver(driverId);
                                    setErrors(prev => ({...prev, driver: ''}));
                                }}
                                showDriverPicker={showDriverPicker}
                                setShowDriverPicker={setShowDriverPicker}
                                error={errors.driver}
                            />
                        </FormField>
                    </FormSection>
                )}

                <FormSection title="Фотография" subtitle="Прикрепите фотографию остановки">
                    <FormField
                        required
                        error={errors.photo}
                    >
                        <PhotoSection
                            photo={photo}
                            setPhoto={(newPhoto) => {
                                setPhoto(newPhoto);
                                setErrors(prev => ({...prev, photo: ''}));
                            }}
                            error={errors.photo}
                        />
                    </FormField>
                </FormSection>

                <FormSection 
                    title="Местоположение" 
                >
                    <FormField
                        required
                        error={errors.district}
                    >
                        <DistrictPicker
                            districts={districts}
                            selectedDistrict={selectedDistrict}
                            setSelectedDistrict={(districtId) => {
                            setSelectedDistrict(districtId);
                            setErrors(prev => ({...prev, district: ''}));
                            setWarehouseId(null);
                            setSelectedProducts([]);
                            setPriceValidationErrors({});
                        }}
                            showDistrictPicker={showDistrictPicker}
                            setShowDistrictPicker={setShowDistrictPicker}
                            error={errors.district}
                        />
                    </FormField>

                    {/* TODO: Временно скрыто для первой версии. Раскомментировать когда понадобится функционал выбора склада и товаров */}
                    {false && selectedDistrict && (
                        <FormField
                            label="Склад и товары"
                            required
                            error={errors.warehouse}
                        >
                            <StopProductsSelector
                                warehouseId={warehouseId}
                                districtId={selectedDistrict}
                                selectedProducts={selectedProducts}
                                onWarehouseChange={(newWarehouseId) => {
                                    setWarehouseId(newWarehouseId);
                                    // Очищаем ошибки валидации цен при смене склада
                                    setPriceValidationErrors({});
                                }}
                                onProductsChange={setSelectedProducts}
                                showAlertError={showAlertError}
                                showAlertWarning={showAlertWarning}
                                priceValidationErrors={priceValidationErrors}
                                onPriceErrorClear={(productId) => {
                                    setPriceValidationErrors(prev => {
                                        const newErrors = { ...prev };
                                        delete newErrors[productId];
                                        return newErrors;
                                    });
                                }}
                            />
                        </FormField>
                    )}

                    <FormHint
                        title="Используйте карту"
                        description="Нажмите на кнопку ниже, чтобы выбрать точное местоположение на карте"
                        onPress={() => {
                            if (locationData.mapLocation) {
                                handleMapOpen(locationData.mapLocation);
                            } else {
                                handleMapOpen(null);
                            }
                        }}
                    />
                    
                    <FormField
                        label="Адрес остановки"
                        required
                        hint="Полный адрес остановки"
                        error={errors.address}
                    >
                        <TextInput
                            style={[styles.input, errors.address ? styles.inputError : null]}
                            value={address}
                            onChangeText={(text) => {
                                setAddress(text);
                                setErrors(prev => ({...prev, address: ''}));
                                logData('Изменен адрес', text);
                            }}
                            placeholder="Введите адрес"
                            placeholderTextColor="#999"
                        />
                        <View style={[styles.inputUnderline, errors.address ? styles.underlineError : null]}/>
                    </FormField>

                    <FormField
                        label="Координаты"
                        required
                        error={errors.location}
                    >
                        <LocationInput
                            mapLocation={locationData.mapLocation}
                            setMapLocation={(text) => {
                                setLocationData(prev => ({...prev, mapLocation: text}));
                                setErrors(prev => ({...prev, location: ''}));
                            }}
                            isLocationLoading={isLocationLoading}
                            setIsLocationLoading={setIsLocationLoading}
                            onOpenMap={handleMapOpen}
                            error={errors.location}
                            setAddress={setAddress}
                        />
                    </FormField>
                </FormSection>

                <FormSection 
                    title="Транспорт" 
                    subtitle="Информация о транспортном средстве"
                >
                    <FormField
                        label="Модель транспорта"
                        required
                        error={errors.truckModel}
                    >
                        <TextInput
                            style={[styles.input, errors.truckModel ? styles.inputError : null]}
                            value={truckModel}
                            onChangeText={(text) => {
                                setTruckModel(text);
                                setErrors(prev => ({...prev, truckModel: ''}));
                                logData('Изменена модель транспорта', text);
                            }}
                            placeholder="LADA Largus"
                            placeholderTextColor="#999"
                        />
                        <View style={[styles.inputUnderline, errors.truckModel ? styles.underlineError : null]}/>
                    </FormField>

                    <FormField
                        label="Номер транспорта"
                        required
                        error={errors.truckNumber}
                    >
                        <TextInput
                            style={[styles.input, errors.truckNumber ? styles.inputError : null]}
                            value={truckNumber}
                            onChangeText={(text) => {
                                setTruckNumber(text);
                                setErrors(prev => ({...prev, truckNumber: ''}));
                                logData('Изменен номер транспорта', text);
                            }}
                            placeholder="А001АА 06"
                            placeholderTextColor="#999"
                            autoCapitalize="characters"
                        />
                        <View style={[styles.inputUnderline, errors.truckNumber ? styles.underlineError : null]}/>
                    </FormField>
                </FormSection>

                <FormSection
                    title="График остановки"
                    subtitle="Повторять остановку по выбранным дням недели"
                >
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
                </FormSection>

                <FormSection 
                    title="Время стоянки" 
                    subtitle="Укажите дату и время начала и окончания работы остановки"
                >
                    <FormField
                        label={scheduleEnabled ? 'Время начала' : 'Дата и время начала'}
                        required
                        error={errors.startTime}
                    >
                        <View style={styles.dateTimeRow}>
                            {!scheduleEnabled && (
                                <View style={styles.dateTimeColumn}>
                                    <Text style={styles.sublabel}>Дата</Text>
                                    <CustomDatePicker date={startDate} onDateChange={onStartDateChange} />
                                    <View style={[styles.inputUnderline, errors.startTime ? styles.underlineError : null]} />
                                </View>
                            )}

                            <View style={styles.dateTimeColumn}>
                                <Text style={styles.sublabel}>Время</Text>
                                <CustomTimePicker date={startTime} onTimeChange={onStartTimeChange} />
                                <View style={[styles.inputUnderline, errors.startTime ? styles.underlineError : null]} />
                            </View>
                        </View>
                    </FormField>

                    <FormField
                        label={scheduleEnabled ? 'Время окончания' : 'Дата и время окончания'}
                        required
                        error={errors.endTime}
                    >
                        <View style={styles.dateTimeRow}>
                            {!scheduleEnabled && (
                                <View style={styles.dateTimeColumn}>
                                    <Text style={styles.sublabel}>Дата</Text>
                                    <CustomDatePicker date={endDate} onDateChange={onEndDateChange} />
                                    <View style={[styles.inputUnderline, errors.endTime ? styles.underlineError : null]} />
                                </View>
                            )}

                            <View style={styles.dateTimeColumn}>
                                <Text style={styles.sublabel}>Время</Text>
                                <CustomTimePicker date={endTime} onTimeChange={onEndTimeChange} />
                                <View style={[styles.inputUnderline, errors.endTime ? styles.underlineError : null]} />
                            </View>
                        </View>
                    </FormField>
                </FormSection>

                <FormSection title="Дополнительная информация">
                    <FormField label="Комментарий">
                        <View
                            onLayout={(event) => {
                                const { y } = event.nativeEvent.layout;
                                commentInputYPosition.current = y;
                            }}
                        >
                            <TextInput
                                ref={commentInputRef}
                                style={[styles.input, styles.commentInput]}
                                value={description}
                                onChangeText={(text) => {
                                    setDescription(text);
                                    logData('Изменено описание', text);
                                }}
                                onFocus={() => {
                                    if (scrollToEnd) {
                                        scrollToEnd();
                                    } else if (scrollToInput && commentInputYPosition.current > 0) {
                                        setTimeout(() => {
                                            scrollToInput(commentInputYPosition.current - 150);
                                        }, 300);
                                    }
                                }}
                                placeholder="Введите дополнительную информацию"
                                placeholderTextColor="#999"
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>
                        <View style={styles.inputUnderline}/>
                    </FormField>
                </FormSection>

                {/* Подсказка перед отправкой */}
                {filledFields === totalFields && !uploadFailed && (
                    <InfoBanner
                        type="success"
                        title="Готово к отправке!"
                        message="Все обязательные поля заполнены. Проверьте данные и нажмите кнопку отправки."
                    />
                )}

                {/* Блок с кнопками Повторить/Отмена при неудачной загрузке */}
                {uploadFailed && (
                    <View style={styles.retryContainer}>
                        <View style={styles.retryIconContainer}>
                            <Text style={styles.retryIcon}>⚠️</Text>
                        </View>
                        <Text style={styles.retryTitle}>Не удалось отправить данные</Text>
                        <Text style={styles.retryMessage}>
                            Проверьте интернет-соединение и попробуйте снова
                        </Text>
                        <View style={styles.retryButtonsRow}>
                            <TouchableOpacity
                                style={[styles.retryButton, styles.cancelButton]}
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

                {/* Кнопка отправки - скрыта при показе блока retry */}
                {!uploadFailed && (
                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            isSubmitting && styles.disabledButton
                        ]}
                        onPress={handleSubmit}
                        activeOpacity={0.7}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color="#fff"/>
                                <Text style={styles.submitButtonText}>
                                    {retryCount > 0 ? `Попытка ${retryCount}/5...` : 'Добавление...'}
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.submitButtonText}>Добавить остановку</Text>
                        )}
                    </TouchableOpacity>
                )}
        </View>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.formSubmitted === nextProps.formSubmitted &&
        prevProps.isLocationLoading === nextProps.isLocationLoading &&
        prevProps.locationData.mapLocation === nextProps.locationData.mapLocation &&
        prevProps.userRole === nextProps.userRole &&
        prevProps.districts.length === nextProps.districts.length
    );
});

const styles = StyleSheet.create({
    formContainer: {
        padding: normalize(20),
        paddingBottom: normalize(30),
        width: '100%',
    },
    section: {
        marginBottom: normalize(28),
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: normalize(16),
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: normalizeFont(17),
        fontWeight: '600',
        color: Color.dark,
        marginBottom: normalize(16),
        fontFamily: FontFamily.sFProText,
    },
    inputGroup: {
        marginBottom: normalize(16),
    },
    label: {
        fontSize: normalizeFont(15),
        fontWeight: '500',
        color: Color.dark,
        opacity: 0.6,
        marginBottom: normalize(8),
        fontFamily: FontFamily.sFProText,
    },
    sublabel: {
        fontSize: normalizeFont(14),
        fontWeight: '500',
        color: Color.dark,
        opacity: 0.6,
        marginBottom: normalize(8),
        fontFamily: FontFamily.sFProText,
    },
    input: {
        height: normalize(44),
        fontSize: normalizeFont(FontSize.size_sm),
        color: Color.dark,
        paddingVertical: normalize(8),
        paddingHorizontal: 0,
        fontFamily: FontFamily.sFProText,
    },
    inputError: {
        color: '#FF3B30',
    },
    commentInput: {
        height: normalize(100),
        textAlignVertical: 'top',
        paddingTop: normalize(8),
    },
    inputUnderline: {
        height: 1,
        backgroundColor: '#E5E5EA',
        marginTop: normalize(4),
    },
    underlineError: {
        backgroundColor: '#FF3B30',
        height: 1.5,
    },
    errorText: {
        color: '#FF3B30',
        fontSize: normalizeFont(13),
        marginTop: normalize(6),
        fontFamily: FontFamily.sFProText,
    },
    scheduleToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: normalize(12),
    },
    scheduleToggleLabel: {
        fontSize: normalizeFont(14),
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    scheduleToggle: {
        paddingHorizontal: normalize(14),
        paddingVertical: normalize(6),
        borderRadius: 14,
        backgroundColor: '#E5E5EA',
    },
    scheduleToggleActive: {
        backgroundColor: '#3B43A2',
    },
    scheduleToggleText: {
        fontSize: normalizeFont(12),
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
        gap: normalize(8),
        marginBottom: normalize(8),
    },
    scheduleDayButton: {
        width: normalize(36),
        height: normalize(36),
        borderRadius: normalize(18),
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scheduleDayButtonActive: {
        backgroundColor: '#3B43A2',
    },
    scheduleDayText: {
        fontSize: normalizeFont(12),
        color: '#6B7280',
        fontFamily: FontFamily.sFProText,
    },
    scheduleDayTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    scheduleErrorText: {
        color: '#FF3B30',
        fontSize: normalizeFont(12),
        marginTop: normalize(4),
        fontFamily: FontFamily.sFProText,
    },
    dateTimeRow: {
        flexDirection: 'row',
        gap: normalize(12),
    },
    dateTimeColumn: {
        flex: 1,
    },
    submitButton: {
        backgroundColor: '#3B43A2',
        height: normalize(52),
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: normalize(8),
        shadowColor: '#3B43A2',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    disabledButton: {
        backgroundColor: '#a0a0a0',
        shadowOpacity: 0.1,
    },
    submitButtonText: {
        color: Color.colorLightMode,
        fontSize: normalizeFont(17),
        fontWeight: '600',
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
    cancelButton: {
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