import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Platform } from 'react-native';
import WarehouseService from '../api/warehouseApi';

const initialState = {
    // Все склады
    warehouses: [],
    warehousesLoading: false,
    warehousesError: null,
    lastFetchTime: null,

    // Текущий склад
    currentWarehouse: null,
    currentWarehouseLoading: false,
    currentWarehouseError: null,

    // Товары на складе (с пагинацией)
    warehouseProducts: {},
    warehouseProductsLoading: {},
    warehouseProductsLoadingMore: {},
    warehouseProductsError: {},
    warehouseProductsPagination: {},

    // Остатки товаров по складам
    productStocks: {},
    productStocksLoading: {},
    productStocksError: {},

    // Поиск складов с товаром
    warehousesWithProduct: {},
    warehousesWithProductLoading: {},
    warehousesWithProductError: {}
};

const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 минут

// Размер страницы товаров склада по умолчанию (совпадает с дефолтом бэкенда)
export const WAREHOUSE_PRODUCTS_PAGE_SIZE = 20;

const isCacheValid = (lastFetchTime) => {
    return lastFetchTime && Date.now() - lastFetchTime < CACHE_EXPIRY_TIME;
};

// Получить все склады
export const fetchWarehouses = createAsyncThunk(
    'warehouse/fetchWarehouses',
    async (forceRefresh = false, { rejectWithValue, getState }) => {
        try {
            const state = getState();

            if (!forceRefresh && isCacheValid(state.warehouse.lastFetchTime)) {
                return { data: state.warehouse.warehouses, fromCache: true };
            }

            const response = await WarehouseService.getWarehouses({ limit: 1000 });

            let warehouses = [];
            
            // Проверяем структуру ответа от сервера
            if (response.data?.warehouses) {
                // Прямой формат: { warehouses: [...], pagination: {...} }
                warehouses = response.data.warehouses;
            } else if (response.data?.data?.warehouses) {
                // Вложенный формат: { status: 'success', data: { warehouses: [...] } }
                warehouses = response.data.data.warehouses;
            } else if (Array.isArray(response.data?.data)) {
                // Формат: { status: 'success', data: [...] }
                warehouses = response.data.data;
            } else if (Array.isArray(response.data)) {
                // Прямой массив: [...]
                warehouses = response.data;
            } else {
                warehouses = [];
            }
            return { data: warehouses, fromCache: false };
        } catch (error) {
            return rejectWithValue(error.message || 'Ошибка при загрузке складов');
        }
    }
);

// Получить склад по ID
export const fetchWarehouseById = createAsyncThunk(
    'warehouse/fetchWarehouseById',
    async (warehouseId, { rejectWithValue, getState }) => {
        try {
            const numericId = parseInt(warehouseId, 10);
            if (isNaN(numericId)) {
                return rejectWithValue('Некорректный ID склада');
            }

            const state = getState();
            const cachedWarehouse = state.warehouse.warehouses.find(w => w?.id === numericId);
            const hasWorkingHoursField = cachedWarehouse
                ? Object.prototype.hasOwnProperty.call(cachedWarehouse, 'workingHours')
                : false;
            
            if (cachedWarehouse && hasWorkingHoursField) {
                return { data: cachedWarehouse, fromCache: true };
            }

            const response = await WarehouseService.getWarehouseById(numericId);
            
            // Обрабатываем разные форматы ответа от сервера
            let warehouse = null;
            if (response.data?.status === 'success') {
                // Формат: { status: 'success', data: { warehouse: {...} } }
                warehouse = response.data.data?.warehouse || response.data.data;
            } else if (response.data?.warehouse) {
                // Формат: { warehouse: {...} }
                warehouse = response.data.warehouse;
            } else if (response.data?.data?.warehouse) {
                // Формат: { data: { warehouse: {...} } }
                warehouse = response.data.data.warehouse;
            } else if (response.data?.id) {
                // Прямой объект склада
                warehouse = response.data;
            } else {
                warehouse = response.data;
            }

            if (!warehouse?.id) {
                return rejectWithValue('Склад не найден');
            }

            return { data: warehouse, fromCache: false };
        } catch (error) {
            console.error(`Ошибка при загрузке склада ${warehouseId}:`, error);
            
            // Обрабатываем разные форматы ошибок
            let errorMessage = 'Ошибка при загрузке склада';
            
            if (error?.response?.status === 404) {
                errorMessage = 'Склад не найден';
            } else if (error?.message) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else if (error?.data?.message) {
                errorMessage = error.data.message;
            }
            
            return rejectWithValue(errorMessage);
        }
    }
);

// Получить склады по району
export const fetchWarehousesByDistrict = createAsyncThunk(
    'warehouse/fetchWarehousesByDistrict',
    async (districtId, { rejectWithValue }) => {
        try {
            const response = await WarehouseService.getWarehousesByDistrict(districtId);
            
            let warehouses = [];
            // Проверяем структуру ответа от сервера
            if (response.data?.warehouses) {
                warehouses = response.data.warehouses;
            } else if (response.data?.data?.warehouses) {
                warehouses = response.data.data.warehouses;
            } else if (Array.isArray(response.data?.data)) {
                warehouses = response.data.data;
            } else if (Array.isArray(response.data)) {
                warehouses = response.data;
            } else {
                warehouses = [];
            }

            return { districtId, warehouses };
        } catch (error) {
            console.error(`Ошибка при загрузке складов района ${districtId}:`, error);
            return rejectWithValue(error.message || 'Ошибка при загрузке складов района');
        }
    }
);

// Получить товары на складе (с пагинацией)
export const fetchWarehouseProducts = createAsyncThunk(
    'warehouse/fetchWarehouseProducts',
    async ({ warehouseId, params = {} }, { rejectWithValue }) => {
        try {
            const page = parseInt(params.page, 10) || 1;
            const limit = parseInt(params.limit, 10) || WAREHOUSE_PRODUCTS_PAGE_SIZE;
            const requestParams = { ...params, page, limit };

            const response = await WarehouseService.getWarehouseProducts(warehouseId, requestParams);

            let products = [];
            let pagination = null;
            if (response.data?.status === 'success') {
                // Формат: { status: 'success', data: { products: [...], pagination: {...} } }
                products = response.data.data?.products || response.data.data || [];
                pagination = response.data.data?.pagination || null;
            } else if (response.data?.products) {
                // Формат: { products: [...], pagination: {...} }
                products = response.data.products;
                pagination = response.data.pagination || null;
            } else if (Array.isArray(response.data)) {
                products = response.data;
            }

            // Нормализуем сведения о пагинации. Если бэкенд их не вернул —
            // выводим hasMore из того, заполнена ли страница полностью.
            const normalizedPagination = pagination
                ? {
                    page: parseInt(pagination.page, 10) || page,
                    limit: parseInt(pagination.limit, 10) || limit,
                    total: parseInt(pagination.total, 10) || 0,
                    pages: parseInt(pagination.pages, 10)
                        || Math.ceil((parseInt(pagination.total, 10) || 0) / limit)
                        || 1,
                }
                : {
                    page,
                    limit,
                    total: (page - 1) * limit + products.length,
                    pages: products.length < limit ? page : page + 1,
                };
            normalizedPagination.hasMore = normalizedPagination.page < normalizedPagination.pages;

            return { warehouseId, products, page, pagination: normalizedPagination };
        } catch (error) {
            console.error(`Ошибка при загрузке товаров склада ${warehouseId}:`, error);
            
            // Обрабатываем ошибку 429 (слишком много запросов)
            if (error.response?.status === 429) {
                const errorMessage = error.response?.data?.message || error.message || 'Слишком много запросов. Пожалуйста, подождите.';
                return rejectWithValue(errorMessage);
            }
            
            return rejectWithValue(error.message || 'Ошибка при загрузке товаров склада');
        }
    }
);

// Получить остатки товара по всем складам
export const fetchProductStock = createAsyncThunk(
    'warehouse/fetchProductStock',
    async (productIdOrParams, { rejectWithValue }) => {
        try {
            const {
                productId,
                params
            } = typeof productIdOrParams === 'object' && productIdOrParams !== null
                ? productIdOrParams
                : { productId: productIdOrParams, params: {} };
            const response = await WarehouseService.getProductStock(productId, params);

            console.log('[warehouse/fetchProductStock] raw response', {
                productId,
                hasData: !!response?.data,
                status: response?.data?.status,
                keys: response?.data ? Object.keys(response.data) : [],
                dataKeys: response?.data?.data ? Object.keys(response.data.data) : null
            });
            
            let stocks = [];
            if (response.data?.status === 'success') {
                const data = response.data.data;
                if (Array.isArray(data)) {
                    stocks = data;
                } else if (Array.isArray(data?.stocks)) {
                    stocks = data.stocks;
                } else if (Array.isArray(response.data?.stocks)) {
                    stocks = response.data.stocks;
                } else {
                    stocks = [];
                }
            } else if (response.data?.stocks) {
                // API возвращает данные в поле stocks
                stocks = response.data.stocks || [];
            } else if (Array.isArray(response.data)) {
                stocks = response.data;
            }
            console.log('[warehouse/fetchProductStock] parsed stocks', {
                productId,
                length: stocks.length,
                sample: stocks.slice(0, 3)
            });
            return { productId, stocks };
        } catch (error) {
            console.error('Ошибка при загрузке остатков товара:', error);
            return rejectWithValue(error.message || 'Ошибка при загрузке остатков товара');
        }
    }
);

// Поиск складов с товаром
export const findWarehousesWithProduct = createAsyncThunk(
    'warehouse/findWarehousesWithProduct',
    async ({ productId, params = {} }, { rejectWithValue }) => {
        try {
            const response = await WarehouseService.findWarehousesWithProduct(productId, params);

            console.log('[warehouse/findWarehousesWithProduct] raw response', {
                productId,
                hasData: !!response?.data,
                status: response?.data?.status,
                keys: response?.data ? Object.keys(response.data) : [],
                dataKeys: response?.data?.data ? Object.keys(response.data.data) : null
            });
            
            let warehouses = [];
            if (response.data?.status === 'success') {
                const data = response.data.data;
                if (Array.isArray(data)) {
                    warehouses = data;
                } else if (Array.isArray(data?.warehouses)) {
                    warehouses = data.warehouses;
                } else if (Array.isArray(response.data?.warehouses)) {
                    warehouses = response.data.warehouses;
                } else {
                    warehouses = [];
                }
            } else if (response.data?.warehouses) {
                warehouses = response.data.warehouses || [];
            } else if (Array.isArray(response.data)) {
                warehouses = response.data;
            }
            console.log('[warehouse/findWarehousesWithProduct] parsed warehouses', {
                productId,
                length: warehouses.length,
                sample: warehouses.slice(0, 3)
            });
            return { productId, warehouses };
        } catch (error) {
            console.error(`Ошибка при поиске складов с товаром ${productId}:`, error);
            return rejectWithValue(error.message || 'Ошибка при поиске складов с товаром');
        }
    }
);

// Создать склад
export const createWarehouse = createAsyncThunk(
    'warehouse/createWarehouse',
    async (warehouseData, { rejectWithValue }) => {
        try {
            console.log('Creating warehouse with data:', warehouseData);
            
            // Всегда создаем FormData, если есть изображение (как в продуктах)
            let dataToSend = warehouseData;
            let hasImageToUpload = false;
            
            // Проверяем, есть ли новое изображение для загрузки
            if (warehouseData.image) {
                const imageUri = typeof warehouseData.image === 'string' 
                    ? warehouseData.image 
                    : (warehouseData.image.uri || null);
                
                // Если URI начинается с file:// или content://, это новый файл - нужно загрузить
                if (imageUri && (imageUri.startsWith('file://') || imageUri.startsWith('content://'))) {
                    hasImageToUpload = true;
                }
            }
            
            // Создаем FormData если есть новое изображение для загрузки
            if (hasImageToUpload) {
                const formData = new FormData();
                
                // Добавляем все поля кроме image
                for (const [key, value] of Object.entries(warehouseData)) {
                    if (key !== 'image' && value !== null && value !== undefined) {
                        // Преобразуем булевы значения в строки для FormData
                        if (typeof value === 'boolean') {
                            formData.append(key, value ? 'true' : 'false');
                            continue;
                        }

                        // Массивы/объекты передаем как JSON (например workingHours)
                        if (typeof value === 'object') {
                            formData.append(key, JSON.stringify(value));
                            continue;
                        }

                        formData.append(key, value);
                    }
                }
                
                // Добавляем изображение
                // В React Native FormData требует объект с полями uri, type, name
                const imageUri = typeof warehouseData.image === 'string' 
                    ? warehouseData.image 
                    : warehouseData.image.uri;
                
                // Определяем тип файла на основе URI, если он не указан
                let imageType = 'image/jpeg';
                if (typeof warehouseData.image === 'object' && warehouseData.image.type) {
                    imageType = warehouseData.image.type;
                } else if (imageUri) {
                    const uriLower = imageUri.toLowerCase();
                    if (uriLower.includes('.png')) {
                        imageType = 'image/png';
                    } else if (uriLower.includes('.jpg') || uriLower.includes('.jpeg')) {
                        imageType = 'image/jpeg';
                    } else if (uriLower.includes('.webp')) {
                        imageType = 'image/webp';
                    }
                }
                
                // Нормализуем URI для Android (как в чате)
                const uriToProcess = Platform.OS === 'android'
                    ? (imageUri?.startsWith('file://') ? imageUri : `file://${imageUri}`)
                    : imageUri;
                
                const imageFile = {
                    uri: uriToProcess,
                    type: imageType,
                    name: (typeof warehouseData.image === 'object' ? warehouseData.image.name : null) || `warehouse_${Date.now()}.jpg`,
                };
                
                console.log('📤 Adding image to FormData:', {
                    uri: imageFile.uri.substring(0, 50) + '...',
                    type: imageFile.type,
                    name: imageFile.name,
                    platform: Platform.OS
                });
                
                formData.append('image', imageFile);
                dataToSend = formData;
            }
            
            const response = await WarehouseService.createWarehouse(dataToSend);
            
            let warehouse = null;
            if (response.data?.status === 'success') {
                warehouse = response.data.data;
            } else if (response.data?.warehouse) {
                warehouse = response.data.warehouse;
            } else {
                warehouse = response.data;
            }
            
            console.log('Warehouse created successfully:', warehouse);
            return warehouse;
        } catch (error) {
            console.error('Ошибка при создании склада:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Ошибка при создании склада';
            return rejectWithValue(errorMessage);
        }
    }
);

// Обновить склад
export const updateWarehouse = createAsyncThunk(
    'warehouse/updateWarehouse',
    async ({ id, warehouseData }, { rejectWithValue }) => {
        try {
            console.log('Updating warehouse:', id, 'with data:', warehouseData);
            
            // Всегда создаем FormData, если есть изображение (как в продуктах)
            let dataToSend = warehouseData;
            let hasImageToUpload = false;
            
            // Проверяем, есть ли новое изображение для загрузки
            if (warehouseData.image) {
                const imageUri = typeof warehouseData.image === 'string' 
                    ? warehouseData.image 
                    : (warehouseData.image.uri || null);
                
                // Если URI начинается с file:// или content://, это новый файл - нужно загрузить
                if (imageUri && (imageUri.startsWith('file://') || imageUri.startsWith('content://'))) {
                    hasImageToUpload = true;
                }
            }
            
            // Создаем FormData если есть новое изображение для загрузки
            if (hasImageToUpload) {
                const formData = new FormData();
                
                // Добавляем все поля кроме image
                for (const [key, value] of Object.entries(warehouseData)) {
                    if (key !== 'image' && value !== null && value !== undefined) {
                        // Преобразуем булевы значения в строки для FormData
                        if (typeof value === 'boolean') {
                            formData.append(key, value ? 'true' : 'false');
                            continue;
                        }

                        // Массивы/объекты передаем как JSON (например workingHours)
                        if (typeof value === 'object') {
                            formData.append(key, JSON.stringify(value));
                            continue;
                        }

                        formData.append(key, value);
                    }
                }
                
                // Добавляем изображение
                // В React Native FormData требует объект с полями uri, type, name
                const imageUri = typeof warehouseData.image === 'string' 
                    ? warehouseData.image 
                    : warehouseData.image.uri;
                
                // Определяем тип файла на основе URI, если он не указан
                let imageType = 'image/jpeg';
                if (typeof warehouseData.image === 'object' && warehouseData.image.type) {
                    imageType = warehouseData.image.type;
                } else if (imageUri) {
                    const uriLower = imageUri.toLowerCase();
                    if (uriLower.includes('.png')) {
                        imageType = 'image/png';
                    } else if (uriLower.includes('.jpg') || uriLower.includes('.jpeg')) {
                        imageType = 'image/jpeg';
                    } else if (uriLower.includes('.webp')) {
                        imageType = 'image/webp';
                    }
                }
                
                // Нормализуем URI для Android (как в чате)
                const uriToProcess = Platform.OS === 'android'
                    ? (imageUri?.startsWith('file://') ? imageUri : `file://${imageUri}`)
                    : imageUri;
                
                const imageFile = {
                    uri: uriToProcess,
                    type: imageType,
                    name: (typeof warehouseData.image === 'object' ? warehouseData.image.name : null) || `warehouse_${Date.now()}.jpg`,
                };
                
                console.log('📤 Adding image to FormData:', {
                    uri: imageFile.uri.substring(0, 50) + '...',
                    type: imageFile.type,
                    name: imageFile.name,
                    platform: Platform.OS
                });
                
                formData.append('image', imageFile);
                dataToSend = formData;
            }
            
            const response = await WarehouseService.updateWarehouse(id, dataToSend);
            
            let warehouse = null;
            if (response.data?.status === 'success') {
                warehouse = response.data.data;
            } else if (response.data?.warehouse) {
                warehouse = response.data.warehouse;
            } else {
                warehouse = response.data;
            }
            
            console.log('Warehouse updated successfully:', warehouse);
            return warehouse;
        } catch (error) {
            console.error(`Ошибка при обновлении склада ${id}:`, error);
            const errorMessage = error.response?.data?.message || error.message || 'Ошибка при обновлении склада';
            return rejectWithValue(errorMessage);
        }
    }
);

// Удалить склад
export const deleteWarehouse = createAsyncThunk(
    'warehouse/deleteWarehouse',
    async (warehouseId, { rejectWithValue }) => {
        try {
            console.log('Deleting warehouse:', warehouseId);
            await WarehouseService.deleteWarehouse(warehouseId);
            return warehouseId;
        } catch (error) {
            console.error(`Ошибка при удалении склада ${warehouseId}:`, error);
            const errorMessage = error.response?.data?.message || error.message || 'Ошибка при удалении склада';
            return rejectWithValue(errorMessage);
        }
    }
);

const warehouseSlice = createSlice({
    name: 'warehouse',
    initialState,
    reducers: {
        clearWarehouses: (state) => {
            state.warehouses = [];
            state.lastFetchTime = null;
        },
        clearCurrentWarehouse: (state) => {
            state.currentWarehouse = null;
        },
        clearWarehouseProducts: (state, action) => {
            const warehouseId = action.payload;
            if (warehouseId) {
                delete state.warehouseProducts[warehouseId];
                delete state.warehouseProductsLoading[warehouseId];
                delete state.warehouseProductsLoadingMore[warehouseId];
                delete state.warehouseProductsError[warehouseId];
                delete state.warehouseProductsPagination[warehouseId];
            } else {
                state.warehouseProducts = {};
                state.warehouseProductsLoading = {};
                state.warehouseProductsLoadingMore = {};
                state.warehouseProductsError = {};
                state.warehouseProductsPagination = {};
            }
        },
        clearProductStocks: (state, action) => {
            const productId = action.payload;
            if (productId) {
                delete state.productStocks[productId];
                delete state.productStocksLoading[productId];
                delete state.productStocksError[productId];
            } else {
                state.productStocks = {};
                state.productStocksLoading = {};
                state.productStocksError = {};
            }
        }
    },
    extraReducers: (builder) => {
        builder
            // Загрузка всех складов
            .addCase(fetchWarehouses.pending, (state) => {
                state.warehousesLoading = true;
                state.warehousesError = null;
            })
            .addCase(fetchWarehouses.fulfilled, (state, action) => {
                state.warehousesLoading = false;
                if (!action.payload.fromCache) {
                    state.warehouses = action.payload.data;
                    state.lastFetchTime = Date.now();
                }
            })
            .addCase(fetchWarehouses.rejected, (state, action) => {
                state.warehousesLoading = false;
                state.warehousesError = action.payload;
            })

            // Загрузка склада по ID
            .addCase(fetchWarehouseById.pending, (state) => {
                state.currentWarehouseLoading = true;
                state.currentWarehouseError = null;
            })
            .addCase(fetchWarehouseById.fulfilled, (state, action) => {
                state.currentWarehouseLoading = false;
                const { data, fromCache } = action.payload;
                state.currentWarehouse = data;

                if (!fromCache) {
                    const index = state.warehouses.findIndex(w => w?.id === data.id);
                    if (index !== -1) {
                        state.warehouses[index] = data;
                    } else {
                        state.warehouses.push(data);
                    }
                }
            })
            .addCase(fetchWarehouseById.rejected, (state, action) => {
                state.currentWarehouseLoading = false;
                state.currentWarehouseError = action.payload;
            })

            // Загрузка складов по району
            .addCase(fetchWarehousesByDistrict.fulfilled, (state, action) => {
                const { districtId, warehouses } = action.payload;
                // Обновляем склады в общем списке
                warehouses.forEach(warehouse => {
                    const index = state.warehouses.findIndex(w => w?.id === warehouse.id);
                    if (index !== -1) {
                        state.warehouses[index] = warehouse;
                    } else {
                        state.warehouses.push(warehouse);
                    }
                });
            })

            // Загрузка товаров склада (с пагинацией)
            .addCase(fetchWarehouseProducts.pending, (state, action) => {
                const warehouseId = action.meta.arg.warehouseId;
                const requestedPage = parseInt(action.meta.arg.params?.page, 10) || 1;
                if (requestedPage > 1) {
                    state.warehouseProductsLoadingMore[warehouseId] = true;
                } else {
                    state.warehouseProductsLoading[warehouseId] = true;
                }
                state.warehouseProductsError[warehouseId] = null;
            })
            .addCase(fetchWarehouseProducts.fulfilled, (state, action) => {
                const { warehouseId, products, page, pagination } = action.payload;
                state.warehouseProductsLoading[warehouseId] = false;
                state.warehouseProductsLoadingMore[warehouseId] = false;
                state.warehouseProductsPagination[warehouseId] = pagination;

                if (page > 1) {
                    // Догрузка следующей страницы — добавляем без дубликатов
                    const existing = state.warehouseProducts[warehouseId] || [];
                    const seen = new Set(
                        existing.map(p => p?.id ?? p?.productId ?? p?.product?.id)
                    );
                    const merged = existing.slice();
                    products.forEach(p => {
                        const key = p?.id ?? p?.productId ?? p?.product?.id;
                        if (key == null || !seen.has(key)) {
                            seen.add(key);
                            merged.push(p);
                        }
                    });
                    state.warehouseProducts[warehouseId] = merged;
                } else {
                    // Первая страница / обновление — заменяем список
                    state.warehouseProducts[warehouseId] = products;
                }
            })
            .addCase(fetchWarehouseProducts.rejected, (state, action) => {
                const warehouseId = action.meta.arg.warehouseId;
                state.warehouseProductsLoading[warehouseId] = false;
                state.warehouseProductsLoadingMore[warehouseId] = false;
                state.warehouseProductsError[warehouseId] = action.payload;
            })

            // Загрузка остатков товара
            .addCase(fetchProductStock.pending, (state, action) => {
                const productId = typeof action.meta.arg === 'object'
                    ? action.meta.arg.productId
                    : action.meta.arg;
                state.productStocksLoading[productId] = true;
                state.productStocksError[productId] = null;
            })
            .addCase(fetchProductStock.fulfilled, (state, action) => {
                const { productId, stocks } = action.payload;
                state.productStocksLoading[productId] = false;
                state.productStocks[productId] = stocks;
                console.log('[warehouse] productStocks stored', {
                    productId,
                    length: stocks?.length || 0
                });
            })
            .addCase(fetchProductStock.rejected, (state, action) => {
                const productId = typeof action.meta.arg === 'object'
                    ? action.meta.arg.productId
                    : action.meta.arg;
                state.productStocksLoading[productId] = false;
                state.productStocksError[productId] = action.payload;
            })

            // Поиск складов с товаром
            .addCase(findWarehousesWithProduct.pending, (state, action) => {
                const productId = action.meta.arg.productId;
                state.warehousesWithProductLoading[productId] = true;
                state.warehousesWithProductError[productId] = null;
            })
            .addCase(findWarehousesWithProduct.fulfilled, (state, action) => {
                const { productId, warehouses } = action.payload;
                state.warehousesWithProductLoading[productId] = false;
                state.warehousesWithProduct[productId] = warehouses;
                console.log('[warehouse] warehousesWithProduct stored', {
                    productId,
                    length: warehouses?.length || 0
                });
            })
            .addCase(findWarehousesWithProduct.rejected, (state, action) => {
                const productId = action.meta.arg.productId;
                state.warehousesWithProductLoading[productId] = false;
                state.warehousesWithProductError[productId] = action.payload;
            })

            // Создание склада
            .addCase(createWarehouse.pending, (state) => {
                state.warehousesLoading = true;
                state.warehousesError = null;
            })
            .addCase(createWarehouse.fulfilled, (state, action) => {
                state.warehousesLoading = false;
                state.warehouses.push(action.payload);
                state.lastFetchTime = Date.now();
            })
            .addCase(createWarehouse.rejected, (state, action) => {
                state.warehousesLoading = false;
                state.warehousesError = action.payload;
            })

            // Обновление склада
            .addCase(updateWarehouse.pending, (state) => {
                state.warehousesLoading = true;
                state.warehousesError = null;
            })
            .addCase(updateWarehouse.fulfilled, (state, action) => {
                state.warehousesLoading = false;
                const updatedWarehouse = action.payload;
                const index = state.warehouses.findIndex(w => w?.id === updatedWarehouse.id);
                if (index !== -1) {
                    state.warehouses[index] = updatedWarehouse;
                }
                if (state.currentWarehouse?.id === updatedWarehouse.id) {
                    state.currentWarehouse = updatedWarehouse;
                }
                state.lastFetchTime = Date.now();
            })
            .addCase(updateWarehouse.rejected, (state, action) => {
                state.warehousesLoading = false;
                state.warehousesError = action.payload;
            })

            // Удаление склада
            .addCase(deleteWarehouse.pending, (state) => {
                state.warehousesLoading = true;
                state.warehousesError = null;
            })
            .addCase(deleteWarehouse.fulfilled, (state, action) => {
                state.warehousesLoading = false;
                const deletedId = action.payload;
                state.warehouses = state.warehouses.filter(w => w?.id !== deletedId);
                if (state.currentWarehouse?.id === deletedId) {
                    state.currentWarehouse = null;
                }
                state.lastFetchTime = Date.now();
            })
            .addCase(deleteWarehouse.rejected, (state, action) => {
                state.warehousesLoading = false;
                state.warehousesError = action.payload;
            });
    }
});

export const {
    clearWarehouses,
    clearCurrentWarehouse,
    clearWarehouseProducts,
    clearProductStocks
} = warehouseSlice.actions;

export default warehouseSlice.reducer; 