import { Platform } from 'react-native';
import { getBaseUrl, authService } from './api';
import NetInfo from '@react-native-community/netinfo';

const STORAGE_KEYS = {
    TOKENS: 'tokens'
};

/**
 * Возвращает актуальный токен доступа, при необходимости обновляя его
 * @returns {Promise<string>} - Токен доступа
 */
const getValidToken = async () => {
    try {
        const tokens = await authService.getStoredTokens();
        if (!tokens?.accessToken) {
            throw new Error('Токен авторизации не найден');
        }

        const decoded = authService.decodeToken(tokens.accessToken);
        const currentTime = Math.floor(Date.now() / 1000);

        if (!decoded || !decoded.exp || decoded.exp < currentTime + 30) {
            console.log('Обновление токена, текущий истекает/истек');
            return await authService.handleRefreshToken();
        }

        return tokens.accessToken;
    } catch (error) {
        console.error('Ошибка получения/обновления токена:', error);
        throw error;
    }
};

/**
 * Нормализация значения категории для отправки на сервер
 */
const normalizeCategory = (categoryValue) => {
    if (categoryValue === null || categoryValue === undefined) return null;

    if (typeof categoryValue === 'number') {
        return categoryValue;
    }

    if (typeof categoryValue === 'string') {
        const parsed = parseInt(categoryValue, 10);
        return !isNaN(parsed) ? parsed : categoryValue;
    }

    if (typeof categoryValue === 'object' && 'id' in categoryValue) {
        return normalizeCategory(categoryValue.id);
    }

    if (Array.isArray(categoryValue) && categoryValue.length > 0) {
        return normalizeCategory(categoryValue[0]);
    }

    return String(categoryValue);
};

/**
 * Улучшенная функция для выполнения fetch запросов с повторными попытками
 */
const fetchWithRetry = async (url, options, maxRetries = 3) => {
    let attempts = 0;
    let lastError = null;

    while (attempts < maxRetries) {
        try {
            console.log(`Попытка ${attempts + 1}/${maxRetries} для ${options.method} ${url}`);

            // Проверяем состояние сети перед каждой попыткой
            const netInfo = await NetInfo.fetch();
            if (!netInfo.isConnected || !netInfo.isInternetReachable) {
                throw new Error('Отсутствует подключение к интернету');
            }

            const response = await fetch(url, {
                ...options,
                timeout: options.timeout || 60000
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
                }
                throw new Error(errorData.message || `Ошибка сервера: ${response.status}`);
            }

            return response;
        } catch (error) {
            lastError = error;
            attempts++;

            console.warn(`Ошибка запроса (попытка ${attempts}/${maxRetries}):`, error.message);

            if (attempts >= maxRetries) break;

            // Экспоненциальная задержка
            const delay = Math.min(2000 * Math.pow(2, attempts - 1), 10000);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
};

/**
 * Обновляет продукт с изображениями с улучшенной обработкой ошибок
 */
export const updateProductWithImages = async (params) => {
    try {
        if (!params || !params.productId || !params.formData) {
            return {
                status: 'error',
                message: 'Не предоставлены необходимые данные для обновления продукта'
            };
        }

        const { productId, formData, images, removeImages = [] } = params;

        console.log('updateProductWithImages: Начало обновления продукта', {
            productId,
            hasFormData: !!formData,
            imagesCount: images?.length || 0,
            removeImagesCount: removeImages.length
        });

        // Проверяем состояние сети
        const netInfoState = await NetInfo.fetch();
        console.log('Состояние сети перед отправкой:', {
            isConnected: netInfoState.isConnected,
            type: netInfoState.type,
            isInternetReachable: netInfoState.isInternetReachable
        });

        if (!netInfoState.isConnected || !netInfoState.isInternetReachable) {
            return {
                status: 'error',
                message: 'Отсутствует подключение к интернету. Пожалуйста, проверьте ваше соединение и попробуйте снова.',
                networkError: true
            };
        }

        // Получаем актуальный токен доступа
        let accessToken;
        try {
            accessToken = await getValidToken();
        } catch (tokenError) {
            console.error('Ошибка получения токена:', tokenError);
            return {
                status: 'error',
                message: 'Ошибка авторизации. Пожалуйста, войдите снова.'
            };
        }

        // Создаем FormData
        const formDataToSend = new FormData();

        // Детальное логирование всех полей перед добавлением в FormData
        console.log('Данные формы для обновления продукта:', {
            id: productId,
            name: formData.name,
            category: formData.category,
            categoryType: typeof formData.category,
            price: formData.price,
            stockQuantity: formData.stockQuantity,
            weight: formData.weight,
            discount: formData.discount,
            description: formData.description,
            supplierId: formData.supplierId,
            warehouses: formData.warehouses,
            warehousesType: typeof formData.warehouses,
            warehousesLength: Array.isArray(formData.warehouses) ? formData.warehouses.length : 'не массив'
        });

        // Добавляем все обычные поля
        Object.keys(formData).forEach(key => {
            if (formData[key] !== undefined && formData[key] !== null) {
                // Особая обработка для категории
                if (key === 'category' || key === 'categories') {
                    let categoryValue = formData[key];
                    console.log(`Обработка поля ${key}:`, {
                        исходноеЗначение: categoryValue,
                        исходныйТип: typeof categoryValue,
                        isArray: Array.isArray(categoryValue)
                    });

                    // Если это массив категорий
                    if (Array.isArray(categoryValue)) {
                        // Отправляем весь массив категорий
                        formDataToSend.append('categories', JSON.stringify(categoryValue));
                        console.log('Отправка массива категорий:', categoryValue);
                    } else {
                        // Если это одиночная категория, нормализуем и отправляем как массив
                        const normalizedCategory = normalizeCategory(categoryValue);
                        if (normalizedCategory !== null) {
                            formDataToSend.append('categories', JSON.stringify([normalizedCategory]));
                            console.log('Отправка одиночной категории как массив:', [normalizedCategory]);
                        }
                    }
                } else if (key === 'warehouses') {
                    // Особая обработка для складов (legacy)
                    console.log(`Обработка поля ${key}:`, {
                        исходноеЗначение: formData[key],
                        исходныйТип: typeof formData[key],
                        isArray: Array.isArray(formData[key])
                    });
                    
                    if (Array.isArray(formData[key])) {
                        // Если это массив складов, преобразуем в JSON
                        formDataToSend.append('warehouses', JSON.stringify(formData[key]));
                    } else {
                        // Если это строка "all" или другое значение
                        formDataToSend.append('warehouses', String(formData[key]));
                    }
                } else if (key === 'warehouseStocks') {
                    // Обработка остатков по складам
                    console.log(`Обработка поля ${key}:`, {
                        исходноеЗначение: formData[key],
                        исходныйТип: typeof formData[key],
                        isArray: Array.isArray(formData[key])
                    });
                    
                    if (Array.isArray(formData[key])) {
                        // Отправляем массив остатков по складам
                        formDataToSend.append('warehouseStocks', JSON.stringify(formData[key]));
                        console.log('Отправка остатков по складам:', formData[key]);
                    }
                } else {
                    console.log(`Добавление поля ${key}:`, {
                        значение: formData[key],
                        тип: typeof formData[key]
                    });
                    formDataToSend.append(key, String(formData[key]));
                }
            }
        });

        // Добавляем список изображений для удаления
        if (removeImages && removeImages.length > 0) {
            console.log('Изображения для удаления:', removeImages);
            formDataToSend.append('removeImages', removeImages.join(','));
        }

        // Подготавливаем массивы изображений
        const flatImages = Array.isArray(images) ? images.flat() : [];

        // Разделяем серверные и локальные изображения
        const serverImages = flatImages.filter(img => 
            typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://')));

        const localImages = flatImages.filter(img => {
            // Если это строка
            if (typeof img === 'string') {
                // Локальное изображение, если начинается с file:// или не является http/https URL
                return img.startsWith('file://') || (!img.startsWith('http://') && !img.startsWith('https://'));
            }
            // Если это объект с uri
            if (img && typeof img === 'object' && img.uri) {
                const uri = img.uri;
                return typeof uri === 'string' && (uri.startsWith('file://') || (!uri.startsWith('http://') && !uri.startsWith('https://')));
            }
            // Любые другие объекты считаем локальными
            return img && typeof img === 'object';
        });

        console.log('Статистика изображений:', {
            всегоИзображений: flatImages.length,
            серверныхИзображений: serverImages.length,
            локальныхИзображений: localImages.length,
            удаляемыхИзображений: removeImages.length,
            детализация: {
                flatImages: flatImages.map(img => ({
                    type: typeof img,
                    isString: typeof img === 'string',
                    value: typeof img === 'string' ? img.substring(0, 50) + '...' : 'object',
                    startsWithFile: typeof img === 'string' && img.startsWith('file://'),
                    startsWithHttp: typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))
                }))
            }
        });

        // Проверка на превышение лимита новых файлов
        if (localImages.length > 10) {
            return {
                status: 'error',
                message: 'Превышен лимит новых файлов (максимум 10). Пожалуйста, выберите меньше новых файлов.'
            };
        }

        // Добавляем только локальные (новые) изображения
        localImages.forEach((imageObj, index) => {
            let uri, name, type;

            if (typeof imageObj === 'string') {
                uri = imageObj;
                const timestamp = Date.now();
                const uniqueSuffix = `${timestamp}-${index}`;

                if (uri.startsWith('file://')) {
                    const uriParts = uri.split('/');
                    const origName = uriParts[uriParts.length - 1];
                    const nameBase = origName.split('.')[0];
                    const extension = origName.split('.').length > 1 ?
                        origName.split('.').pop() : 'jpg';
                    name = `${nameBase}-${uniqueSuffix}.${extension}`;
                    type = extension.toLowerCase() === 'png' ? 'image/png' :
                        extension.toLowerCase() === 'gif' ? 'image/gif' : 'image/jpeg';
                } else {
                    name = `image-${timestamp}-${index}.jpg`;
                    type = 'image/jpeg';
                }
            } else if (imageObj && imageObj.uri) {
                uri = imageObj.uri;

                if (imageObj.name) {
                    name = imageObj.name;
                } else {
                    const timestamp = Date.now();
                    const uniqueSuffix = `${timestamp}-${index}`;
                    name = `image-${uniqueSuffix}.jpg`;
                }

                type = imageObj.type ||
                    (name.toLowerCase().endsWith('.png') ? 'image/png' :
                        name.toLowerCase().endsWith('.gif') ? 'image/gif' : 'image/jpeg');
            } else {
                console.warn('Пропуск неверного формата изображения:', imageObj);
                return;
            }

            if (!uri) {
                console.warn('Пропуск изображения без URI');
                return;
            }

            const preparedUri = Platform.OS === 'ios' ? uri.replace('file://', '') : uri;

            console.log(`Подготовка файла #${index}:`, {
                name,
                type,
                uriStart: preparedUri.substring(0, 30) + '...'
            });

            const fileObj = {
                uri: preparedUri,
                name,
                type
            };

            formDataToSend.append('images', fileObj);
        });

        // Выводим содержимое FormData перед отправкой
        console.log('FormData перед отправкой:');
        for (const pair of formDataToSend._parts) {
            console.log(`${pair[0]}: ${typeof pair[1] === 'object' ? 'Файл: ' + pair[1].name : pair[1]}`);
        }

        // Базовый URL
        const baseUrl = getBaseUrl();
        const url = `${baseUrl}/api/products/${productId}`;

        console.log(`Отправка запроса на ${url}:`, {
            productId,
            formData: Object.keys(formData),
            fieldsCount: formDataToSend._parts.length,
            imagesCount: formDataToSend._parts.filter(p => p[0] === 'images').length
        });

        // Отправляем с использованием улучшенной функции fetch
        const response = await fetchWithRetry(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
                // НЕ устанавливаем Content-Type для FormData - fetch сделает это автоматически
            },
            body: formDataToSend,
            timeout: 120000 // 2 минуты для загрузки файлов
        }, 3);

        // Проверяем и разбираем ответ
        const responseText = await response.text();
        console.log('Успешный ответ сервера:', responseText.substring(0, 200) + '...');

        let result;
        try {
            result = JSON.parse(responseText);
            console.log('Успешный ответ сервера:', result);
        } catch (e) {
            console.error('Ошибка парсинга JSON ответа:', e);
            return {
                status: 'error',
                message: 'Ошибка парсинга ответа сервера'
            };
        }

        // Возвращаем успешный результат
        return {
            status: 'success',
            data: {
                product: result.data?.product || result.data || result
            },
            message: result.message || 'Продукт успешно обновлен'
        };

    } catch (error) {
        console.error('Ошибка при обновлении продукта:', error);

        // Определяем тип ошибки для пользователя
        if (error.message && (
            error.message.includes('Network request failed') ||
            error.message.includes('Отсутствует подключение к интернету') ||
            error.message.includes('Failed to fetch')
        )) {
            return {
                status: 'error',
                message: 'Не удалось подключиться к серверу. Проверьте соединение с интернетом.',
                networkError: true
            };
        }

        if (error.message && error.message.includes('Ошибка авторизации')) {
            return {
                status: 'error',
                message: 'Ошибка авторизации. Пожалуйста, войдите снова.'
            };
        }

        return {
            status: 'error',
            message: error.message || 'Произошла ошибка при обновлении продукта'
        };
    }
};

/**
 * Загружает продукт с изображениями используя fetch
 */
export const uploadProductWithImages = async (params) => {
    try {
        if (!params || !params.formData) {
            return {
                status: 'error',
                message: 'Не предоставлены данные для загрузки продукта'
            };
        }

        const { formData, images } = params;

        console.log('uploadProductWithImages: Начало создания продукта', {
            hasFormData: !!formData,
            imagesCount: images?.length || 0
        });

        // Проверяем состояние сети
        const netInfoState = await NetInfo.fetch();
        console.log('Состояние сети перед отправкой:', {
            isConnected: netInfoState.isConnected,
            type: netInfoState.type,
            isInternetReachable: netInfoState.isInternetReachable
        });

        if (!netInfoState.isConnected || !netInfoState.isInternetReachable) {
            return {
                status: 'error',
                message: 'Отсутствует подключение к интернету. Пожалуйста, проверьте ваше соединение и попробуйте снова.',
                networkError: true
            };
        }

        // Получаем актуальный токен доступа
        let accessToken;
        try {
            accessToken = await getValidToken();
        } catch (tokenError) {
            console.error('Ошибка получения токена:', tokenError);
            return {
                status: 'error',
                message: 'Ошибка авторизации. Пожалуйста, войдите снова.'
            };
        }

        // Подготавливаем изображения
        const flatImages = Array.isArray(images) ? images.flat() : [];
        if (flatImages.length > 5) {
            return {
                status: 'error',
                message: 'Превышен лимит файлов (максимум 5). Пожалуйста, выберите меньше файлов.'
            };
        }

        // Отправляем только данные продукта сначала без изображений
        const formDataToSend = new FormData();
        Object.keys(formData).forEach(key => {
            if (formData[key] !== undefined && formData[key] !== null) {
                if (key === 'category' || key === 'categories') {
                    // Правильная обработка категорий
                    let categoryValue = formData[key];
                    
                    // Если это массив категорий
                    if (Array.isArray(categoryValue)) {
                        // Отправляем весь массив категорий
                        formDataToSend.append('categories', JSON.stringify(categoryValue));
                        console.log('Отправка массива категорий:', categoryValue);
                    } else {
                        // Если это одиночная категория, нормализуем и отправляем как массив
                        const normalizedCategory = normalizeCategory(categoryValue);
                        if (normalizedCategory !== null) {
                            formDataToSend.append('categories', JSON.stringify([normalizedCategory]));
                            console.log('Отправка одиночной категории как массив:', [normalizedCategory]);
                        }
                    }
                } else {
                    formDataToSend.append(key, String(formData[key]));
                }
            }
        });

        // Указываем, что загрузка будет в несколько этапов
        formDataToSend.append('chunkedUpload', 'true');

        // Базовый URL
        const baseUrl = getBaseUrl();
        const url = `${baseUrl}/api/products`;

        console.log(`Отправка базовых данных на ${url}`);

        // Отправляем метаданные продукта
        const productResponse = await fetchWithRetry(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
            },
            body: formDataToSend,
            timeout: 30000,
        }, 3);

        // Обрабатываем ответ
        const productResponseText = await productResponse.text();
        let productData;
        try {
            productData = JSON.parse(productResponseText);
        } catch (jsonError) {
            console.error('Ошибка при парсинге JSON ответа:', jsonError);
            return {
                status: 'error',
                message: 'Получен некорректный формат ответа от сервера'
            };
        }

        // Получаем ID созданного продукта для привязки фотографий
        const productId = productData.data?.product?.id;
        if (!productId) {
            return {
                status: 'error',
                message: 'Не удалось получить ID созданного продукта'
            };
        }

        // Отправляем изображения по одному (если есть)
        const uploadedImages = [];
        for (let i = 0; i < flatImages.length; i++) {
            const img = flatImages[i];

            // Пропускаем URL-изображения
            if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) {
                uploadedImages.push(img);
                continue;
            }

            // Подготавливаем одно изображение
            const imgFormData = new FormData();
            let fileObj;

            if (typeof img === 'string') {
                const uri = Platform.OS === 'ios' ? img.replace('file://', '') : img;
                const name = `image-${Date.now()}-${i}.jpg`;

                fileObj = {
                    uri: uri,
                    name: name,
                    type: 'image/jpeg'
                };
            } else if (img && img.uri) {
                const uri = Platform.OS === 'ios' ? img.uri.replace('file://', '') : img.uri;
                const name = img.name || `image-${Date.now()}-${i}.jpg`;

                fileObj = {
                    uri: uri,
                    name: name,
                    type: img.type || 'image/jpeg'
                };
            } else {
                console.warn('Пропуск неверного формата изображения:', img);
                continue;
            }

            // Добавляем изображение и ID продукта
            imgFormData.append('image', fileObj);
            imgFormData.append('productId', productId);

            // Отправляем с повторными попытками
            try {
                console.log(`Отправка изображения ${i+1}/${flatImages.length}`);
                const imageUrl = `${baseUrl}/api/products/${productId}/images`;

                const imageResponse = await fetchWithRetry(imageUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json',
                    },
                    body: imgFormData,
                    timeout: 60000,
                }, 3);

                const imageResponseText = await imageResponse.text();
                let imageData;
                try {
                    imageData = JSON.parse(imageResponseText);
                    if (imageData.status === 'success') {
                        uploadedImages.push(imageData.data.imagePath);
                    } else {
                        console.warn(`Ошибка загрузки изображения ${i+1}:`, imageData.message);
                    }
                } catch (error) {
                    console.warn(`Не удалось загрузить изображение ${i+1}:`, error);
                }
            } catch (error) {
                console.warn(`Ошибка при отправке изображения ${i+1}:`, error);
            }
        }

        // Завершаем загрузку, обновляя продукт с информацией о загруженных изображениях
        const finalizeUrl = `${baseUrl}/api/products/${productId}/finalize`;
        const finalizeFormData = new FormData();
        finalizeFormData.append('productId', productId);

        if (uploadedImages.length > 0) {
            finalizeFormData.append('images', JSON.stringify(uploadedImages));
        }

        try {
            const finalizeResponse = await fetchWithRetry(finalizeUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json',
                },
                body: finalizeFormData,
                timeout: 30000,
            }, 3);

            const finalizeResponseText = await finalizeResponse.text();
            let finalizeData;
            try {
                finalizeData = JSON.parse(finalizeResponseText);

                // Успешное завершение
                return {
                    status: 'success',
                    message: finalizeData.message || 'Продукт успешно создан',
                    data: {
                        product: finalizeData.data?.product || productData.data?.product
                    }
                };
            } catch (error) {
                // Продукт создан, но финализация не удалась
                return {
                    status: 'warning',
                    message: 'Продукт создан, но произошла ошибка при финализации',
                    data: {
                        product: productData.data?.product
                    }
                };
            }
        } catch (error) {
            // Продукт создан, но финализация не удалась из-за сетевой ошибки
            console.error('Ошибка финализации:', error);
            return {
                status: 'warning',
                message: 'Продукт создан, но не удалось завершить процесс из-за проблем с сетью',
                data: {
                    product: productData.data?.product
                }
            };
        }
    } catch (error) {
        console.error('Общая ошибка при создании продукта с изображениями:', error);

        // Определяем тип ошибки для пользователя
        if (error.message && (
            error.message.includes('Network request failed') ||
            error.message.includes('Отсутствует подключение к интернету') ||
            error.message.includes('Failed to fetch')
        )) {
            return {
                status: 'error',
                message: 'Не удалось подключиться к серверу. Проверьте соединение с интернетом.',
                networkError: true
            };
        }

        return {
            status: 'error',
            message: error.message || 'Произошла ошибка при создании продукта',
            error: error
        };
    }
};