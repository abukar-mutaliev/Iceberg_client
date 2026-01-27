import * as ImageManipulator from 'expo-image-manipulator';
import NetInfo from "@react-native-community/netinfo";
import {getBaseUrl} from "@shared/api/api";
import {Platform, Image} from 'react-native';
import { authService} from "@shared/api/api";
import { retryRequest, retryFileUpload, waitForConnection } from "@shared/api/retryHelper";
import {createApiModule} from "@shared/services/ApiClient";

const productsApi = createApiModule('/api/products');

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

const normalizeFileUri = (uri) => {
    if (!uri || typeof uri !== 'string') return uri;

    const lower = uri.toLowerCase();
    if (
        lower.startsWith('file://') ||
        lower.startsWith('content://') ||
        lower.startsWith('ph://') ||
        lower.startsWith('assets-library://') ||
        lower.startsWith('http://') ||
        lower.startsWith('https://')
    ) {
        return uri;
    }

    if (Platform.OS === 'android') {
        return `file://${uri}`;
    }

    return uri;
};

const getImageDimensions = (uri) => new Promise((resolve, reject) => {
    Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        (error) => reject(error)
    );
});

const getResizeAction = async (uri, maxSize) => {
    try {
        const { width, height } = await getImageDimensions(uri);
        if (!width || !height) return null;

        const scale = Math.min(maxSize / width, maxSize / height, 1);
        if (scale >= 1) return null;

        return {
            resize: {
                width: Math.max(1, Math.round(width * scale)),
                height: Math.max(1, Math.round(height * scale))
            }
        };
    } catch (error) {
        console.warn('Не удалось определить размер изображения:', error?.message || error);
        return null;
    }
};

const prepareImageFile = async (img, index) => {
    try {
        if (typeof img === 'string') {
            if (img.startsWith('http://') || img.startsWith('https://')) {
                return null;
            }

            try {
                const uriToProcess = normalizeFileUri(img);

                console.log(`Сжатие изображения ${index+1}, URI: ${uriToProcess.substring(0, 30)}...`);

                const resizeAction = await getResizeAction(uriToProcess, 800);
                const result = await ImageManipulator.manipulateAsync(
                    uriToProcess,
                    resizeAction ? [resizeAction] : [],
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );

                const timestamp = Date.now();
                const fileName = `image-${timestamp}-${index}.jpg`;

                return {
                    uri: result.uri,
                    name: fileName,
                    type: 'image/jpeg'
                };
            } catch (compressError) {
                console.warn(`Ошибка сжатия изображения ${index+1}:`, compressError);

                const timestamp = Date.now();
                const fileName = `image-${timestamp}-${index}.jpg`;

                return {
                    uri: normalizeFileUri(img),
                    name: fileName,
                    type: 'image/jpeg'
                };
            }
        } else if (img && img.uri) {
            try {
                const uriToProcess = normalizeFileUri(img.uri);

                console.log(`Сжатие объекта изображения ${index+1}, URI: ${uriToProcess.substring(0, 30)}...`);

                const resizeAction = await getResizeAction(uriToProcess, 800);
                const result = await ImageManipulator.manipulateAsync(
                    uriToProcess,
                    resizeAction ? [resizeAction] : [],
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );

                const fileName = img.name || `image-${Date.now()}-${index}.jpg`;

                return {
                    uri: result.uri,
                    name: fileName,
                    type: 'image/jpeg'
                };
            } catch (compressError) {
                console.warn(`Ошибка сжатия объекта изображения ${index+1}:`, compressError);

                const fileName = img.name || `image-${Date.now()}-${index}.jpg`;

                return {
                    uri: normalizeFileUri(img.uri),
                    name: fileName,
                    type: img.type || 'image/jpeg'
                };
            }
        }

        console.warn(`Нераспознанный формат изображения ${index+1}`);
        return null;
    } catch (error) {
        console.error(`Общая ошибка подготовки изображения ${index+1}:`, error);
        return null;
    }
};

const imageToBase64 = async (uri) => {
    try {
        if (!uri) {
            console.error('URI изображения не определен');
            return null;
        }

        const uriToProcess = (Platform.OS === 'android')
            ? (uri.startsWith('file://') ? uri : `file://${uri}`)
            : uri;


        const compressResult = await ImageManipulator.manipulateAsync(
            uriToProcess,
            [{ resize: { width: 800, height: 800 } }],
            { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
        );

        if (!compressResult || !compressResult.uri) {
            console.error('Ошибка при сжатии изображения, результат отсутствует');
            return null;
        }

        if (Platform.OS === 'android') {
            try {
                const FileSystem = require('expo-file-system/legacy');
                const base64String = await FileSystem.readAsStringAsync(compressResult.uri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                return base64String;
            } catch (fsError) {
                console.error('Ошибка при чтении файла через FileSystem:', fsError);

                try {
                    const response = await fetch(compressResult.uri);
                    const blob = await response.blob();

                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const dataUrl = reader.result;
                            const base64 = dataUrl.split(',')[1];
                            resolve(base64);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                } catch (fetchError) {
                    console.error('Ошибка при чтении файла через fetch:', fetchError);
                    return null;
                }
            }
        } else {
            try {
                const response = await fetch(compressResult.uri);
                const blob = await response.blob();

                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const dataUrl = reader.result;
                        const base64 = dataUrl.split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = (error) => {
                        console.error('FileReader ошибка:', error);
                        reject(error);
                    };
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                console.error('Ошибка при чтении файла:', error);
                return null;
            }
        }
    } catch (error) {
        console.error('Ошибка при конвертации в base64:', error);
        return null;
    }
};

const uploadSingleImage = async (productId, fileObj, accessToken, baseUrl) => {
    try {
        if (!fileObj || !fileObj.uri) {
            return {
                success: false,
                error: 'Невалидный объект файла'
            };
        }

        let uri = normalizeFileUri(fileObj.uri);

        try {
            const formData = new FormData();
            const file = {
                uri: uri,
                name: fileObj.name || `image-${Date.now()}.jpg`,
                type: fileObj.type || 'image/jpeg'
            };

            formData.append('image', file);

                    const response = await fetch(`${baseUrl}/api/products/${productId}/images`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json',
                },
                body: formData
            });

                    if (response.status === 401) {
                        try {
                            const newTokens = await authService.refreshAccessToken?.();
                            if (newTokens?.accessToken) {
                                const retryResponse = await fetch(`${baseUrl}/api/products/${productId}/images`, {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${newTokens.accessToken}`,
                                        'Accept': 'application/json',
                                    },
                                    body: formData
                                });
                                const retryText = await retryResponse.text();
                                if (retryResponse.ok) {
                                    try {
                                        const data = JSON.parse(retryText);
                                        return {
                                            success: true,
                                            data: data
                                        };
                                    } catch (e) {
                                        return {
                                            success: false,
                                            error: 'Неверный формат ответа от сервера'
                                        };
                                    }
                                }
                            }
                        } catch (refreshError) {
                            console.error('Ошибка обновления токена:', refreshError);
                        }
                    }

                    const responseText = await response.text();

            if (response.ok) {
                try {
                    const data = JSON.parse(responseText);
                    return {
                        success: true,
                        data: data
                    };
                } catch (e) {
                    return {
                        success: false,
                        error: 'Неверный формат ответа от сервера'
                    };
                }
            } else {
                try {
                    const errorData = JSON.parse(responseText);
                    return {
                        success: false,
                        error: errorData
                    };
                } catch (e) {
                    return {
                        success: false,
                        error: { message: 'Ошибка при загрузке файла' }
                    };
                }
            }
        } catch (fetchError) {
            return {
                success: false,
                error: { message: 'Ошибка сети при загрузке файла' }
            };
        }
    } catch (error) {
        return {
            success: false,
            error: { message: 'Неизвестная ошибка при загрузке' }
        };
    }
};

const uploadImageAsBase64 = async (productId, fileObj, accessToken, baseUrl) => {
    try {
        if (!fileObj || !fileObj.uri) {
            return {
                success: false,
                error: { message: 'Невалидный объект файла' }
            };
        }

        const base64Data = await imageToBase64(normalizeFileUri(fileObj.uri));

        if (!base64Data) {
            return {
                success: false,
                error: { message: 'Не удалось преобразовать изображение в base64' }
            };
        }

        let extension = 'jpg';
        if (fileObj.name) {
            const parts = fileObj.name.split('.');
            if (parts.length > 1) {
                extension = parts[parts.length - 1].toLowerCase();
            }
        } else if (fileObj.type) {
            const mimeMatch = fileObj.type.match(/image\/(\w+)/);
            if (mimeMatch && mimeMatch[1]) {
                extension = mimeMatch[1].toLowerCase();
            }
        }


        const response = await fetch(`${baseUrl}/api/products/${productId}/image-base64`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: base64Data,
                extension: extension
            })
        });

        if (response.status === 401) {
            try {
                const newTokens = await authService.refreshAccessToken?.();
                if (newTokens?.accessToken) {
                    const retryResponse = await fetch(`${baseUrl}/api/products/${productId}/image-base64`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${newTokens.accessToken}`,
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            image: base64Data,
                            extension: extension
                        })
                    });
                    const retryText = await retryResponse.text();
                    if (retryResponse.ok) {
                        try {
                            const data = JSON.parse(retryText);
                            return {
                                success: true,
                                data: data
                            };
                        } catch (e) {
                            return {
                                success: false,
                                error: { message: 'Ошибка парсинга ответа сервера' }
                            };
                        }
                    }
                }
            } catch (refreshError) {
                console.error('Ошибка обновления токена:', refreshError);
            }
        }

        const responseText = await response.text();

        if (!response.ok) {
            return {
                success: false,
                error: { message: 'Ошибка при загрузке через base64' }
            };
        }

        try {
            const result = JSON.parse(responseText);
            return {
                success: true,
                data: result
            };
        } catch (e) {
            return {
                success: false,
                error: { message: 'Ошибка парсинга ответа сервера' }
            };
        }
    } catch (error) {
        return {
            success: false,
            error: { message: 'Неизвестная ошибка при загрузке через base64' }
        };
    }
};

const ProductsService = {
    getProducts: (params = {}) =>
        productsApi.get('', params),

    getProductById: (productId) =>
        productsApi.get(`/${productId}`),

    getSupplierProducts: (supplierId) =>
        productsApi.get(`/supplier/${supplierId}`),

    createProduct: (data) => {
        const formData = new FormData();

        Object.keys(data.formData).forEach(key => {
            // Пропускаем undefined значения
            if (data.formData[key] === undefined) {
                return;
            }
            
            if (data.formData[key] !== null) {
                if (key === 'warehouses' && Array.isArray(data.formData[key])) {
                    // Обрабатываем массив складов
                    if (data.formData[key].length > 0) {
                        data.formData[key].forEach(warehouseId => {
                            formData.append('warehouses[]', String(warehouseId));
                        });
                    } else {
                        formData.append('warehouses', 'all');
                    }
                } else {
                    formData.append(key, data.formData[key].toString());
                }
            }
        });

        if (data.images && data.images.length > 0) {
            data.images.forEach((image, index) => {
                if (typeof image === 'string') {
                    if (image.startsWith('file://')) {
                        const fileName = image.split('/').pop();
                        formData.append('images', {
                            uri: image,
                            type: 'image/jpeg',
                            name: fileName
                        });
                    }
                } else if (image.uri) {
                    const fileName = image.uri.split('/').pop();
                    formData.append('images', {
                        uri: image.uri,
                        type: image.type || 'image/jpeg',
                        name: fileName
                    });
                }
            });
        }

        return productsApi.post('', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            timeout: 60000
        });
    },

    createProductChunked: async (data, onProgress) => {
        try {
            if (!data.formData || !data.images) {
                return {
                    status: 'error',
                    message: 'Не предоставлены необходимые данные'
                };
            }

            const tokens = await authService.getStoredTokens();
            if (!tokens || !tokens.accessToken) {
                console.error('Ошибка авторизации: токены не найдены');
                return {
                    status: 'error',
                    message: 'Не авторизован. Пожалуйста, войдите в систему снова.'
                };
            }

            console.log('Статус авторизации перед отправкой:', {
                hasAccessToken: Boolean(tokens.accessToken),
                hasRefreshToken: Boolean(tokens.refreshToken),
                tokenType: typeof tokens.accessToken
            });

            const accessToken = tokens.accessToken;

            const updateProgress = (progress, stage, uploadedCount) => {
                if (onProgress && typeof onProgress === 'function') {
                    onProgress(progress, stage, uploadedCount);
                }
            };

            updateProgress(5, 'Проверка соединения...', 0);

            const netInfo = await NetInfo.fetch();
            console.log('Результат проверки сети:', netInfo);

            const isOnline = await waitForConnection(20000);
            if (!isOnline) {
                return {
                    status: 'error',
                    message: 'Отсутствует подключение к интернету. Проверьте подключение и попробуйте снова.',
                    networkError: true
                };
            }

            updateProgress(10, 'Подготовка изображений...', 0);

            const preparedImages = [];
            for (let i = 0; i < data.images.length; i++) {
                updateProgress(
                    10 + (i / data.images.length) * 15,
                    `Обработка изображения ${i+1}/${data.images.length}...`,
                    0
                );

                const img = data.images[i];
                if (typeof img === 'string') {
                    if (img.startsWith('http://') || img.startsWith('https://')) {
                        preparedImages.push(img);
                        continue;
                    }

                    preparedImages.push(img);
                } else {
                    preparedImages.push(img);
                }
            }

            updateProgress(25, 'Отправка данных о товаре...', 0);

            const formData = new FormData();
            Object.keys(data.formData).forEach(key => {
                // Пропускаем undefined значения и supplierId если он undefined
                if (data.formData[key] === undefined) {
                    return;
                }
                
                if (data.formData[key] !== null) {
                    if (key === 'category' || key === 'categories') {
                        const categoryValue = data.formData[key];
                        console.log('ProductsService - обработка категорий:', {
                            key,
                            categoryValue,
                            isArray: Array.isArray(categoryValue)
                        });
                        
                        if (categoryValue !== null && categoryValue !== undefined) {
                            // Если это массив категорий
                            if (Array.isArray(categoryValue)) {
                                formData.append('categories', JSON.stringify(categoryValue));
                                console.log('ProductsService - отправляем массив категорий:', categoryValue);
                            } else {
                                // Если это одиночная категория, отправляем как массив
                                formData.append('categories', JSON.stringify([categoryValue]));
                                console.log('ProductsService - отправляем одиночную категорию как массив:', [categoryValue]);
                            }
                        }
                    } else if (key === 'warehouses' && Array.isArray(data.formData[key])) {
                        // Обрабатываем массив складов
                        if (data.formData[key].length > 0) {
                            data.formData[key].forEach(warehouseId => {
                                formData.append('warehouses[]', String(warehouseId));
                            });
                        } else {
                            formData.append('warehouses', 'all');
                        }
                    } else {
                        formData.append(key, String(data.formData[key]));
                    }
                }
            });

            formData.append('chunkedUpload', 'true');

            const baseUrl = getBaseUrl();
            const productsUrl = `${baseUrl}/api/products`;

            console.log('Отправка запроса создания продукта на', productsUrl);

            const executeRequest = async (url, options, maxRetries = 3, onRetry = null) => {
                return retryRequest(async () => {
                    console.log(`Попытка ${options.method} ${url}`);

                    options.headers = options.headers || {};
                    const storedTokens = await authService.getStoredTokens();
                    const tokenToUse = storedTokens?.accessToken || accessToken;
                    if (tokenToUse) {
                        options.headers['Authorization'] = `Bearer ${tokenToUse}`;
                    }

                    if (options.body instanceof FormData) {
                        delete options.headers['Content-Type'];
                    }

                    const response = await fetch(url, options);

                    if (response.status === 401) {
                        console.log('Получен статус 401, попытка обновить токен');

                        try {
                            const newTokens = await authService.refreshAccessToken?.();
                            if (newTokens?.accessToken) {
                                console.log('Токен успешно обновлен, повторяем запрос');
                                options.headers['Authorization'] = `Bearer ${newTokens.accessToken}`;
                                const retryResponse = await fetch(url, options);
                                if (retryResponse.status === 401) {
                                    const authError = new Error('Ошибка авторизации. Пожалуйста, войдите снова.');
                                    authError.status = 401;
                                    throw authError;
                                }
                                return retryResponse;
                            }
                        } catch (refreshError) {
                            console.error('Ошибка обновления токена:', refreshError);
                        }

                        const authError = new Error('Ошибка авторизации. Пожалуйста, войдите снова.');
                        authError.status = 401;
                        throw authError;
                    }

                    if (!response.ok) {
                        const text = await response.text();
                        console.error(`Ответ сервера с ошибкой (${response.status}):`, text);
                        const httpError = new Error(text || `Ошибка сервера: ${response.status} ${response.statusText}`);
                        httpError.status = response.status;
                        httpError.response = { status: response.status };
                        throw httpError;
                    }

                    return response;
                }, {
                    maxRetries,
                    waitForConnection: true,
                    connectionTimeoutMs: 20000,
                    baseDelayMs: 1500,
                    maxDelayMs: 15000,
                    onRetry
                });
            };

            updateProgress(30, 'Создание продукта...', 0);

            let productResponse;
            try {
                productResponse = await executeRequest(productsUrl, {
                    method: 'POST',
                    body: formData,
                    timeout: 30000,
                }, 3, (attempt) => {
                    updateProgress(30, `Повторная попытка ${attempt} создания продукта...`, 0);
                });
            } catch (error) {
                console.error('Ошибка при создании продукта:', error);
                return {
                    status: 'error',
                    message: error.message || 'Ошибка при создании продукта'
                };
            }

            let productData;
            try {
                const responseText = await productResponse.text();
                productData = JSON.parse(responseText);
                console.log('ПРОДУКТ с новым способом ДОБАВЛЕНИЯ', JSON.stringify(productData.data.product));
            } catch (error) {
                console.error('Ошибка при обработке ответа сервера:', error);
                return {
                    status: 'error',
                    message: 'Ошибка при обработке ответа сервера'
                };
            }

            const productId = productData.data.product.id;
            if (!productId) {
                console.error('ID продукта не найден в ответе', productData);
                return {
                    status: 'error',
                    message: 'Не удалось получить ID созданного продукта'
                };
            }

            updateProgress(40, 'Начинаем загрузку изображений...', 0);

            const uploadedImages = [];
            let imageUploadErrors = 0;


            for (let i = 0; i < preparedImages.length; i++) {
                const img = preparedImages[i];

                updateProgress(
                    40 + (i / preparedImages.length) * 50,
                    `Загрузка изображения ${i + 1}/${preparedImages.length}...`,
                    i
                );

                if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) {
                    uploadedImages.push(img);
                    continue;
                }

                let fileObj = await prepareImageFile(img, i);

                if (!fileObj) {
                    continue;
                }

                if (fileObj.uri) {
                    if (Platform.OS === 'android') {
                        if (!fileObj.uri.startsWith('file://')) {
                            fileObj.uri = `file://${fileObj.uri}`;
                        }
                    }
                } else {
                    continue;
                }

                if (!fileObj.name) {
                    const timestamp = Date.now();
                    fileObj.name = `image-${timestamp}-${i}.jpg`;
                }

                if (!fileObj.type) {
                    fileObj.type = 'image/jpeg';
                }

                let result = null;
                let uploaded = false;

                try {
                    result = await retryFileUpload(async () => {
                        const uploadResult = await uploadSingleImage(productId, fileObj, accessToken, baseUrl);
                        if (!uploadResult?.success) {
                            const message = uploadResult?.error?.message || 'Ошибка при загрузке файла';
                            const uploadError = new Error(message);
                            uploadError.status = uploadResult?.error?.status;
                            uploadError.response = uploadResult?.error?.response;
                            throw uploadError;
                        }
                        return uploadResult;
                    }, {
                        maxRetries: 5,
                        waitForConnection: true,
                        connectionTimeoutMs: 20000,
                        baseDelayMs: 1500,
                        maxDelayMs: 15000,
                        onRetry: (attempt) => {
                            updateProgress(
                                40 + (i / preparedImages.length) * 50,
                                `Повторная попытка ${attempt} загрузки изображения ${i + 1}/${preparedImages.length}...`,
                                i
                            );
                        }
                    });

                    if (result && result.success && result.data) {
                        uploaded = true;
                    }
                } catch (error) {
                    try {
                        result = await retryFileUpload(async () => {
                            const uploadResult = await uploadImageAsBase64(productId, fileObj, accessToken, baseUrl);
                            if (!uploadResult?.success) {
                                const message = uploadResult?.error?.message || 'Ошибка при загрузке файла';
                                const uploadError = new Error(message);
                                uploadError.status = uploadResult?.error?.status;
                                uploadError.response = uploadResult?.error?.response;
                                throw uploadError;
                            }
                            return uploadResult;
                        }, {
                            maxRetries: 5,
                            waitForConnection: true,
                            connectionTimeoutMs: 20000,
                            baseDelayMs: 1500,
                            maxDelayMs: 15000,
                            onRetry: (attempt) => {
                                updateProgress(
                                    40 + (i / preparedImages.length) * 50,
                                    `Повторная попытка ${attempt} загрузки изображения ${i + 1}/${preparedImages.length}...`,
                                    i
                                );
                            }
                        });

                        if (result && result.success && result.data) {
                            uploaded = true;
                        }
                    } catch (base64Error) {
                    }
                }

                if (uploaded && result.data && result.data.data && result.data.data.imagePath) {
                    const imagePath = result.data.data.imagePath.replace(/\\/g, '/');
                    uploadedImages.push(imagePath);

                    updateProgress(
                        40 + ((i + 1) / preparedImages.length) * 50,
                        `Изображение ${i + 1}/${preparedImages.length} загружено`,
                        i + 1
                    );
                    console.log(`Изображение ${i + 1} успешно загружено, path:`, imagePath);
                } else {
                    imageUploadErrors++;
                }
            }

            if (uploadedImages.length > 0) {
                updateProgress(90, 'Завершение создания товара...', uploadedImages.length);
                const normalizedImages = uploadedImages.map(img => img.replace(/\\/g, '/'));

                const finalizeUrl = `${baseUrl}/api/products/${productId}/finalize`;
                const finalizeFormData = new FormData();

                finalizeFormData.append('images', JSON.stringify(normalizedImages));

                try {


                    const finalizeResponse = await executeRequest(finalizeUrl, {
                        method: 'POST',
                        body: finalizeFormData,
                        timeout: 30000,
                    }, 3, (attempt) => {
                        updateProgress(90, `Повторная попытка ${attempt} финализации...`, uploadedImages.length);
                    });

                    const finalizeResponseText = await finalizeResponse.text();
                    const finalizeData = JSON.parse(finalizeResponseText);

                    if (finalizeData.data && finalizeData.data.product &&
                        finalizeData.data.product.images && Array.isArray(finalizeData.data.product.images)) {
                        finalizeData.data.product.images = finalizeData.data.product.images.map(img =>
                            typeof img === 'string' ? img.replace(/\\/g, '/') : img
                        );
                    }
                    updateProgress(100, 'Товар успешно создан!', uploadedImages.length);

                    return {
                        status: imageUploadErrors === 0 ? 'success' : 'warning',
                        message: imageUploadErrors === 0
                            ? 'Продукт успешно создан со всеми изображениями'
                            : `Продукт создан, но ${imageUploadErrors} из ${preparedImages.length} изображений не удалось загрузить`,
                        data: {
                            product: finalizeData.data.product
                        }
                    };
                } catch (error) {
                    if (productData.data && productData.data.product) {
                        if (productData.data.product.images && Array.isArray(productData.data.product.images)) {
                            productData.data.product.images = productData.data.product.images.map(img =>
                                typeof img === 'string' ? img.replace(/\\/g, '/') : img
                            );
                        }
                    }

                    return {
                        status: 'warning',
                        message: 'Продукт создан, но возникла проблема при финализации',
                        data: {
                            product: productData.data.product
                        }
                    };
                }
            } else {
                return {
                    status: 'warning',
                    message: 'Продукт создан, но не удалось загрузить ни одно изображение',
                    data: {
                        product: productData.data.product
                    }
                };
            }
        } catch (error) {
            console.error('Общая ошибка при создании продукта:', error);
            return {
                status: 'error',
                message: error.message || 'Произошла ошибка при создании продукта',
                error: error
            };
        }
    },

    uploadSingleImage,
    uploadImageAsBase64,

    updateProduct: (productId, data) => {
        const formData = new FormData();

        Object.keys(data.formData).forEach(key => {
            if (data.formData[key] !== undefined && data.formData[key] !== null) {
                formData.append(key, data.formData[key].toString());
            }
        });

        if (data.images && data.images.length > 0) {
            data.images.forEach(image => {
                if (typeof image === 'string') {
                    if (image.startsWith('file://')) {
                        const fileName = image.split('/').pop();
                        formData.append('images', {
                            uri: image,
                            type: 'image/jpeg',
                            name: fileName
                        });
                    }
                } else if (image.uri) {
                    const fileName = image.uri.split('/').pop();
                    formData.append('images', {
                        uri: image.uri,
                        type: image.type || 'image/jpeg',
                        name: fileName
                    });
                }
            });
        }

        if (data.removeImages && data.removeImages.length > 0) {
            formData.append('removeImages', data.removeImages.join(','));
        }

        console.log('Отправка updateProduct запроса:', {
            productId,
            formFields: Object.keys(data.formData),
            imagesCount: data.images?.length || 0,
            removeImagesCount: data.removeImages?.length || 0
        });

        return productsApi.put(`/${productId}`, formData, {
            timeout: 120000
        });
    },

    deleteProduct: (productId) =>
        productsApi.delete(`/${productId}`)
};

export default ProductsService;
