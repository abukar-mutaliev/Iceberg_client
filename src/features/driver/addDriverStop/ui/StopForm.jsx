import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
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

export const StopForm = memo(({
                                  districts,
                                  locationData,
                                  setLocationData,
                                  formSubmitted,
                                  setFormSubmitted,
                                  userRole,
                                  isLocationLoading,
                                  setIsLocationLoading,
                                  addressFromMap
                              }) => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const route = useRoute();
    const isLoading = useSelector(selectDriverLoading);
    const allDrivers = useSelector(state => state.driver?.allDrivers || []);

    const isAdminOrEmployee = userRole === 'ADMIN' || userRole === 'EMPLOYEE';

    const [address, setAddress] = useState('');
    const [photo, setPhoto] = useState(null);
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [startTime, setStartTime] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [endTime, setEndTime] = useState(new Date(new Date().getTime() + 2 * 60 * 60 * 1000)); // +2 часа по умолчанию
    const [selectedDistrict, setSelectedDistrict] = useState(null);
    const [showDistrictPicker, setShowDistrictPicker] = useState(false);
    const [truckModel, setTruckModel] = useState('');
    const [truckNumber, setTruckNumber] = useState('');
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [showDriverPicker, setShowDriverPicker] = useState(false);

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
        driver: '',
    });

    // Флаг для отслеживания навигации
    const isNavigatingRef = useRef(false);
    const isFormInitialized = useRef(false);

    const compressImage = async (imageUri) => {
        try {
            const resizedImage = await ImageResizer.createResizedImage(
                imageUri,
                800, // ширина
                600, // высота
                'JPEG',
                80, // качество (0-100)
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

    // Инициализация формы только один раз
    useEffect(() => {
        if (!isFormInitialized.current) {
            isFormInitialized.current = true;
            logData('StopForm: Инициализация формы для пользователя с ролью', userRole);
        }
    }, [userRole]);

    // Улучшенный эффект для обработки адреса из props (с картой или геолокацией)
    useEffect(() => {
        if (addressFromMap && addressFromMap.trim() !== '') {
            logData('StopForm: Получен адрес из карты', addressFromMap);
            // Обновляем адрес и сбрасываем ошибку
            setAddress(addressFromMap);
            setErrors(prev => ({...prev, address: ''}));
            // Дополнительная проверка обновления адреса
            setTimeout(() => {
                logData('StopForm: Адрес после обновления', {
                    currentAddress: address,
                    setToAddress: addressFromMap,
                    addressMatch: address === addressFromMap
                });
                // Если адрес не обновился, повторим попытку
                if (address !== addressFromMap) {
                    setAddress(addressFromMap);
                    logData('StopForm: Повторная попытка обновления адреса');
                }
            }, 150);
        }
    }, [addressFromMap, address]);

    // Обработчики для выбора дат и времени - мемоизированы для избежания лишних ререндеров
    const onStartDateChange = useCallback((date) => {
        logData('Изменение даты начала', date);
        setStartDate(date);
        if (date > endDate) {
            setEndDate(date);
        }
        // Очищаем ошибку при изменении значения
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

    // Функции для работы с датами и временем
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

    // Обработчик открытия карты
    const handleMapOpen = useCallback((currentLocation) => {
        // Если уже выполняем навигацию, выходим
        if (isNavigatingRef.current || isLocationLoading) return;

        logData('Открытие карты из StopForm', {
            currentLocation,
            timestamp: new Date().toISOString()
        });

        // Устанавливаем флаг, что начали навигацию
        isNavigatingRef.current = true;

        // Используем временную метку для гарантии уникальности параметра
        const timestamp = new Date().getTime();

        // Добавляем небольшую задержку для более плавного перехода
        setTimeout(() => {
            navigation.navigate('MapScreen', {
                initialLocation: currentLocation,
                returnScreen: route.name, // Указываем текущий экран для возврата
                timestamp // Добавляем метку времени для отслеживания
            });

            // Сбрасываем флаг через небольшую задержку после начала навигации
            setTimeout(() => {
                isNavigatingRef.current = false;
            }, 500);
        }, 0);
    }, [navigation, route.name, isLocationLoading]);

    // Функция валидации формы перед отправкой
    const validateForm = useCallback(() => {
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
            driver: '',
        };

        // Если пользователь админ или сотрудник, проверяем выбор водителя
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

        setErrors(newErrors);
        return isFormValid;
    }, [
        isAdminOrEmployee,
        selectedDriver,
        address,
        selectedDistrict,
        photo,
        locationData.mapLocation,
        truckModel,
        truckNumber,
        getFullStartDateTime,
        getFullEndDateTime
    ]);

    // Обработчик отправки формы
    const handleSubmit = useCallback(async () => {
        setFormSubmitted(true);

        if (!validateForm()) {
            setFormSubmitted(false);
            return;
        }

        // Проверяем соединение с сетью перед отправкой
        try {
            const NetInfo = require('@react-native-community/netinfo');
            const networkState = await NetInfo.fetch();
            
            if (!networkState.isConnected) {
                logData('Отсутствует подключение к сети', networkState);
                setFormSubmitted(false);
                Alert.alert(
                    'Проблема с подключением',
                    'Отсутствует подключение к интернету. Пожалуйста, проверьте ваше соединение и попробуйте снова.',
                    [{ text: 'OK' }]
                );
                return;
            }
        } catch (netInfoError) {
            logData('Ошибка при проверке сети', netInfoError);
            // Продолжаем выполнение даже при ошибке проверки сети
        }

        try {
            // Улучшаем формирование объекта для фото
            let photoForUpload = null;
            
            if (photo && photo.uri) {
                try {
                    // Определяем расширение файла
                    const fileExtension = photo.uri.split('.').pop() || 'jpg';
                    const mimeType = photo.mimeType || (fileExtension === 'png' ? 'image/png' : 'image/jpeg');
                    
                    // Максимальный размер файла для отправки (700KB - оптимальное значение)
                    const MAX_FILE_SIZE = 700 * 1024; // 700KB
                    
                    if (photo.fileSize && photo.fileSize > MAX_FILE_SIZE) {
                        // Если файл слишком большой, снижаем качество
                        logData('Фото слишком большое, снижаем качество', {
                            originalSize: photo.fileSize,
                            maxSize: MAX_FILE_SIZE
                        });
                        
                        // Используем expo-image-manipulator для сжатия
                        try {
                            const ImageManipulator = require('expo-image-manipulator');
                            
                            // Сжимаем изображение с пониженным качеством
                            const resizedPhoto = await ImageManipulator.manipulateAsync(
                                photo.uri,
                                [{ resize: { width: 800 } }], // изменение размера до ширины 800px
                                { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG } // сжатие 60%
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
                        // Если файл нормального размера, используем как есть
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
                    Alert.alert('Предупреждение', 'Возникла проблема с обработкой фото, но форма будет отправлена');
                    
                    // Создаем базовый объект фотографии для загрузки
                    photoForUpload = {
                        uri: photo.uri,
                        type: 'image/jpeg',
                        name: `photo_${Date.now()}.jpg`
                    };
                }
            }

            const startDateTime = getFullStartDateTime();
            const endDateTime = getFullEndDateTime();
            const startTimeIso = new Date(startDateTime).toISOString();
            const endTimeIso = new Date(endDateTime).toISOString();

            const stopData = {
                address,
                districtId: selectedDistrict,
                startTime: startTimeIso,
                endTime: endTimeIso,
                mapLocation: locationData.mapLocation,
                description,
                photo: photoForUpload,
                truckModel,
                truckNumber,
            };

            // Если пользователь админ или сотрудник, добавляем ID водителя
            if (isAdminOrEmployee && selectedDriver) {
                stopData.driverId = selectedDriver;
            }

            logData('Данные для отправки', {
                ...stopData,
                photo: photoForUpload ? 'Photo included' : null
            });

            // Добавляем функцию для повторной отправки запроса при ошибке сети
            const retryRequest = async (retryCount = 0, maxRetries = 3) => {
                try {
                    const result = await dispatch(createStop(stopData)).unwrap();
                    logData('Остановка успешно создана', result);
                    
                    // Логируем информацию о созданной остановке и URL фото
                    if (result && result.data) {
                        const photoUrl = result.data.photo;
                        
                        logData('Информация о созданной остановке', {
                            stopId: result.data.id,
                            photoUrl: photoUrl
                        });
                    }
                    
                    Alert.alert('Успех', 'Остановка успешно добавлена', [
                        {text: 'OK', onPress: () => navigation.goBack()}
                    ]);
                    
                    return result;
                } catch (error) {
                    logData('Ошибка при создании остановки', error);
                    
                    // Проверяем состояние сети при ошибке
                    let isNetworkError = false;
                    try {
                        const NetInfo = require('@react-native-community/netinfo');
                        const networkState = await NetInfo.fetch();
                        isNetworkError = !networkState.isConnected || error?.code === 'ERR_NETWORK';
                        
                        logData('Проверка сети при ошибке', {
                            isConnected: networkState.isConnected,
                            errorCode: error?.code,
                            isNetworkError: isNetworkError
                        });
                    } catch (netInfoError) {
                        logData('Ошибка при проверке сети после ошибки запроса', netInfoError);
                    }
                    
                    // Если это сетевая ошибка и у нас есть еще попытки
                    if ((isNetworkError || error?.code === 'ERR_NETWORK' || error?.message?.includes('network')) && retryCount < maxRetries) {
                        const nextRetry = retryCount + 1;
                        logData(`Повторная попытка ${nextRetry}/${maxRetries}`, { error: error.message });
                        
                        // Показываем сообщение о повторной попытке
                        Alert.alert(
                            'Проблема с сетью',
                            `Повторная попытка ${nextRetry} из ${maxRetries}...`,
                            [{ text: 'OK' }],
                            { cancelable: false }
                        );
                        
                        // Увеличиваем время ожидания с каждой попыткой (экспоненциальная задержка)
                        const waitTime = 1000 * Math.pow(2, retryCount); // 1s, 2s, 4s, ...
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        
                        // Повторяем запрос
                        return retryRequest(nextRetry, maxRetries);
                    }
                    
                    // Подробное логирование структуры ошибки для отладки
                    logData('Подробная структура ошибки', {
                        hasErrors: !!error?.errors,
                        errorsIsArray: Array.isArray(error?.errors),
                        errorKeys: error ? Object.keys(error) : null,
                        errorResponseData: error?.response?.data,
                        errorMessage: error?.message
                    });
                    
                    // Улучшенная обработка ошибок валидации от сервера
                    if (error && error.errors && Array.isArray(error.errors)) {
                        // Создаем объект с ошибками из массива ошибок, полученных от сервера
                        const fieldErrors = {};
                        
                        error.errors.forEach(err => {
                            // Определяем поле на основе сообщения об ошибке
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
                        
                        // Если есть ошибки полей, обновляем состояние ошибок
                        if (Object.keys(fieldErrors).length > 0) {
                            setErrors(prev => ({
                                ...prev,
                                ...fieldErrors
                            }));
                            
                            // Прокручиваем к первой ошибке
                            setTimeout(() => {
                                scrollToFirstError(fieldErrors);
                            }, 100);

                            // Показываем сообщение об ошибке валидации
                            Alert.alert(
                                'Ошибка валидации', 
                                'Пожалуйста, исправьте ошибки в форме',
                                [{ text: 'OK', onPress: () => setFormSubmitted(false) }]
                            );
                        } else {
                            // Если не удалось определить поля ошибок, показываем общее сообщение
                            Alert.alert('Ошибка', 'Произошла ошибка при создании остановки. Пожалуйста, попробуйте еще раз.');
                        }
                    } else {
                        // Обработка других типов ошибок
                        Alert.alert('Ошибка', 'Произошла ошибка при создании остановки. Пожалуйста, попробуйте еще раз.');
                    }
                    
                    throw error;
                }
            };

            // Запускаем запрос с возможностью повторения
            await retryRequest();
            
        } catch (error) {
            logData('Ошибка при обработке формы', error);
            Alert.alert('Ошибка', 'Ошибка при обработке данных. Пожалуйста, попробуйте еще раз.');
            setFormSubmitted(false);
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
        addressFromMap
    ]);

    return (
        <ScrollView style={styles.scrollView}>
            <View style={styles.formContainer}>
                <View style={styles.formHeader}>
                    {/* Блок для выбора фото */}
                    <View style={styles.leftColumn}>
                        <PhotoSection
                            photo={photo}
                            setPhoto={(newPhoto) => {
                                setPhoto(newPhoto);
                                setErrors(prev => ({...prev, photo: ''}));
                            }}
                            error={errors.photo}
                        />

                        {/* Перемещенный блок времени стоянки */}
                        <View style={styles.timeSection}>
                            <Text style={[styles.label, { marginBottom: normalize(10) }]}>Время стоянки *</Text>
                            <View style={styles.timeRow}>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.sublabel}>Дата</Text>
                                    <CustomDatePicker date={startDate} onDateChange={onStartDateChange} />
                                    <View style={[styles.inputUnderline, errors.startTime ? styles.underlineError : null]} />
                                </View>
                            </View>
                            {errors.startTime ? <Text style={styles.errorText}>{errors.startTime}</Text> : null}
                        </View>
                    </View>

                    {/* Блок для ввода адреса и информации о транспорте */}
                    <View style={styles.rightColumn}>
                        {/* Показываем выбор водителя только админам и сотрудникам */}
                        {isAdminOrEmployee && (
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
                        )}

                        <View style={styles.inputGroup}>
                            {/* Блок для выбора района */}
                            <DistrictPicker
                                districts={districts}
                                selectedDistrict={selectedDistrict}
                                setSelectedDistrict={(districtId) => {
                                    setSelectedDistrict(districtId);
                                    setErrors(prev => ({...prev, district: ''}));
                                }}
                                showDistrictPicker={showDistrictPicker}
                                setShowDistrictPicker={setShowDistrictPicker}
                                error={errors.district}
                            />
                            <Text style={styles.label}> Адрес остановки *</Text>
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
                            {errors.address ? <Text style={styles.errorText}>{errors.address}</Text> : null}
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
                            {errors.truckModel ? <Text style={styles.errorText}>{errors.truckModel}</Text> : null}
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
                            {errors.truckNumber ? <Text style={styles.errorText}>{errors.truckNumber}</Text> : null}
                        </View>
                    </View>
                </View>

                {/* Блок для выбора времени начала и окончания стоянки (напротив друг друга) */}
                <View style={styles.timeContainer}>
                    <View style={[styles.timeSection, styles.timeLeft]}>
                        <View style={[styles.timeRow, { width: 320 }]}> {/* Исправлено с "90%" на числовое значение */}
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.sublabel}>Начало</Text>
                                <CustomTimePicker date={startTime} onTimeChange={onStartTimeChange} />
                                <View style={[styles.inputUnderline, errors.startTime ? styles.underlineError : null]} />
                            </View>
                        </View>
                        {errors.startTime ? <Text style={styles.errorText}>{errors.startTime}</Text> : null}
                    </View>

                    <View style={[styles.timeSection, styles.timeRight]}>
                        <View style={[styles.timeRow, { width: 320 }]}> {/* Исправлено с "90%" на числовое значение */}
                            <View style={[styles.inputGroup, { flex: 1}]}>
                                <Text style={styles.sublabel}>Окончание</Text>
                                <CustomTimePicker date={endTime} onTimeChange={onEndTimeChange} />
                                <View style={[styles.inputUnderline, errors.endTime ? styles.underlineError : null]} />
                            </View>
                        </View>
                        {errors.endTime ? <Text style={styles.errorText}>{errors.endTime}</Text> : null}
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

                {/* Кнопка добавления остановки */}
                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        (isLoading && formSubmitted) && styles.disabledButton
                    ]}
                    onPress={handleSubmit}
                    activeOpacity={0.7}
                    disabled={isLoading && formSubmitted}
                >
                    {isLoading && formSubmitted ? (
                        <ActivityIndicator size="small" color="#fff"/>
                    ) : (
                        <Text style={styles.submitButtonText}>Готово!</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}, (prevProps, nextProps) => {
    // Оптимизация рендеринга - проверяем только те пропы, которые действительно важны
    return (
        prevProps.formSubmitted === nextProps.formSubmitted &&
        prevProps.isLocationLoading === nextProps.isLocationLoading &&
        prevProps.locationData.mapLocation === nextProps.locationData.mapLocation &&
        prevProps.userRole === nextProps.userRole &&
        // Для districts достаточно проверить длину, т.к. они редко меняются
        prevProps.districts.length === nextProps.districts.length
    );
});

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    formContainer: {
        padding: normalize(16),
    },
    formHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    leftColumn: {
        width: '45%',
    },
    rightColumn: {
        width: '50%',
    },
    inputGroup: {
        marginBottom: normalize(20),
        width: "100%",
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
    timeLeft: {
        width: '50%',
    },
    timeRight: {
        width: '50%',
    },
    input: {
        height: normalize(30),
        fontSize: normalizeFont(FontSize.size_xs),
        color: Color.dark,
        paddingVertical: normalize(5),
        paddingLeft: 0, // Убираем левый отступ здесь
        fontFamily: FontFamily.sFProText,
    },
    inputError: {
        color: '#FF3B30',
    },
    commentInput: {
        height: normalize(30),
        textAlignVertical: 'top',
        paddingLeft: 0, // Для уверенности добавляем и здесь
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
    timeSection: {
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
});