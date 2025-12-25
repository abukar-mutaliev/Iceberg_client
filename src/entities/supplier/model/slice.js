import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { suppliersApi } from '@entities/supplier/api/suppliersApi';
import { calculateSupplierRating } from "@services/supplierRatingService";
import { handleApiError } from '@shared/services/ApiClient';

const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 минут в миллисекундах

const isCacheValid = (lastFetchTime) => {
    return lastFetchTime && (Date.now() - lastFetchTime < CACHE_EXPIRY_TIME);
};

const initialState = {
    list: [],
    total: 0,
    page: 1,
    pages: 1,
    currentSupplierId: null,
    supplierDetails: {},
    supplierProducts: {},
    ratings: {},
    loading: false,
    error: null,
    lastFetchTime: {}
};


export const fetchSuppliersList = createAsyncThunk(
    'suppliers/fetchSuppliersList',
    async (params = { page: 1, limit: 10 }, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const cacheKey = `list_${params.page}_${params.limit}_${params.search || ''}`;

            // Проверка валидности кэша
            if (isCacheValid(state.suppliers.lastFetchTime[cacheKey])) {
                return { fromCache: true, cacheKey };
            }

            const response = await suppliersApi.getSuppliers(params);
            console.log('Ответ от API поставщиков:', response);

            if (response && response.data) {
                return {
                    data: response.data,
                    cacheKey,
                    fromCache: false
                };
            } else {
                console.error('Некорректный формат ответа:', response);
                return rejectWithValue('Некорректный формат ответа от сервера');
            }
        } catch (error) {
            console.error('Ошибка при получении поставщиков:', error);
            return rejectWithValue(handleApiError(error).message);
        }
    }
);

// Получение поставщика по ID
export const fetchSupplierById = createAsyncThunk(
    'suppliers/fetchSupplierById',
    async (supplierId, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            // Проверка валидности кэша
            if (state.suppliers.supplierDetails[supplierId] &&
                isCacheValid(state.suppliers.lastFetchTime[`supplier_${supplierId}`])) {
                return {
                    supplier: state.suppliers.supplierDetails[supplierId],
                    fromCache: true,
                    supplierId
                };
            }

            const response = await suppliersApi.getSupplierById(supplierId);

            // Извлекаем данные поставщика из ответа
            let supplier;

            if (response.data && response.data.user) {
                supplier = response.data.user;
            } else if (response.data) {
                supplier = response.data;
            } else if (response.user) {
                supplier = response.user;
            } else {
                supplier = response;
            }

            return {
                supplier,
                fromCache: false,
                supplierId
            };
        } catch (error) {
            console.error(`Ошибка при получении поставщика ${supplierId}:`, error);
            return rejectWithValue(handleApiError(error).message);
        }
    }
);

// Получение продуктов поставщика
export const fetchSupplierProducts = createAsyncThunk(
    'suppliers/fetchSupplierProducts',
    async (supplierId, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            // Проверка валидности кэша
            if (state.suppliers.supplierProducts[supplierId] &&
                isCacheValid(state.suppliers.lastFetchTime[`products_${supplierId}`])) {
                return {
                    products: state.suppliers.supplierProducts[supplierId],
                    fromCache: true,
                    supplierId
                };
            }

            const response = await suppliersApi.getSupplierProducts(supplierId);

            let products = [];
            if (response.data && response.data.data) {
                products = response.data.data;
            } else if (response.data) {
                products = response.data;
            }

            return {
                products: Array.isArray(products) ? products : [],
                fromCache: false,
                supplierId
            };
        } catch (error) {
            console.error(`Ошибка при получении продуктов поставщика ${supplierId}:`, error);
            return rejectWithValue(handleApiError(error).message);
        }
    }
);

// Получение поставщика с продуктами
export const fetchSupplierWithProducts = createAsyncThunk(
    'suppliers/fetchSupplierWithProducts',
    async (supplierId, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const hasValidSupplierCache = state.suppliers.supplierDetails[supplierId] &&
                isCacheValid(state.suppliers.lastFetchTime[`supplier_${supplierId}`]);
            const hasValidProductsCache = state.suppliers.supplierProducts[supplierId] &&
                isCacheValid(state.suppliers.lastFetchTime[`products_${supplierId}`]);

            // Если всё в кэше, используем его
            if (hasValidSupplierCache && hasValidProductsCache) {
                return {
                    supplier: state.suppliers.supplierDetails[supplierId],
                    products: state.suppliers.supplierProducts[supplierId],
                    fromCache: true,
                    supplierId
                };
            }

            // Иначе запрашиваем с сервера
            const response = await suppliersApi.getSupplierWithProducts(supplierId);

            const { supplier, products } = response.data;

            return {
                supplier,
                products: Array.isArray(products) ? products : [],
                fromCache: false,
                supplierId
            };
        } catch (error) {
            console.error(`Ошибка при получении данных поставщика ${supplierId}:`, error);
            return rejectWithValue(handleApiError(error).message);
        }
    }
);


export const fetchSupplierRating = createAsyncThunk(
    'suppliers/fetchRating',
    async (supplierId, { rejectWithValue }) => {
        try {
            const response = await suppliersApi.getSupplierProductsForRating(supplierId);

            // Добавим логирование полного ответа для отладки
            console.log(`Получен ответ API для рейтинга поставщика ${supplierId}`);

            // Гибкая проверка формата ответа
            let products = [];

            // Обработка разных вариантов структуры ответа
            if (!response) {
                console.error('Получен пустой ответ от API');
                return { supplierId, rating: 0, totalFeedbacks: 0 };
            }

            // Вариант 1: response.data.data.products
            if (response?.data?.data?.products && Array.isArray(response.data.data.products)) {
                products = response.data.data.products;
            }
            // Вариант 2: response.data.products
            else if (response?.data?.products && Array.isArray(response.data.products)) {
                products = response.data.products;
            }
            // Вариант 3: response.products
            else if (response?.products && Array.isArray(response.products)) {
                products = response.products;
            }
            // Вариант 4: response.data - массив продуктов
            else if (response?.data && Array.isArray(response.data)) {
                products = response.data;
            }
            // Вариант 5: response - массив продуктов
            else if (Array.isArray(response)) {
                products = response;
            }
            // Вариант 6: если response.data - это объект с полем data, которое является массивом
            else if (response?.data?.data && Array.isArray(response.data.data)) {
                products = response.data.data;
            }
            // Вариант 7: если response.data - объект со свойством status и массивом data
            else if (response?.data?.status === 'success' && Array.isArray(response.data.data)) {
                products = response.data.data;
            }
            // Если ничего не подошло, пробуем найти любой массив в ответе
            else {
                console.warn('Поиск произвольного массива в ответе API');
                // Рекурсивная функция для поиска массива в объекте
                const findArrayInObject = (obj) => {
                    if (!obj || typeof obj !== 'object') return null;
                    
                    for (const key in obj) {
                        if (Array.isArray(obj[key])) {
                            return obj[key];
                        } else if (typeof obj[key] === 'object') {
                            const result = findArrayInObject(obj[key]);
                            if (result) return result;
                        }
                    }
                    return null;
                };
                
                const foundArray = findArrayInObject(response);
                if (foundArray) {
                    console.log('Найден массив в ответе API:', foundArray.length, 'элементов');
                    products = foundArray;
                } else {
                    console.error('Не удалось найти массив продуктов в ответе:', response);
                    return { supplierId, rating: 0, totalFeedbacks: 0 };
                }
            }

            // Проверка наличия продуктов
            if (!Array.isArray(products) || products.length === 0) {
                console.log('Нет продуктов для расчета рейтинга');
                return { supplierId, rating: 0, totalFeedbacks: 0 };
            }

            // Валидация продуктов перед расчетом
            const validatedProducts = products.filter(product =>
                product &&
                (product.feedbacks || product.rating || product.reviews)
            );

            if (validatedProducts.length === 0) {
                console.log('Нет продуктов с отзывами для расчета рейтинга');
                return { supplierId, rating: 0, totalFeedbacks: 0 };
            }

            // Расчет рейтинга
            const result = calculateSupplierRating(validatedProducts);
            console.log(`Рассчитанный рейтинг для поставщика ${supplierId}:`, result);

            return {
                supplierId,
                rating: result.rating,
                totalFeedbacks: result.totalFeedbacks
            };
        } catch (error) {
            console.error(`Ошибка при получении рейтинга поставщика ${supplierId}:`, error);
            return rejectWithValue(handleApiError(error).message);
        }
    }
);

// Создание slice
const suppliersSlice = createSlice({
    name: 'suppliers',
    initialState,
    reducers: {
        setCurrentSupplierId: (state, action) => {
            state.currentSupplierId = action.payload;
        },

        clearSupplierError: (state) => {
            state.error = null;
        },

        clearSupplierCache: (state, action) => {
            const { supplierId } = action.payload || {};

            if (supplierId) {
                delete state.lastFetchTime[`supplier_${supplierId}`];
                delete state.lastFetchTime[`products_${supplierId}`];
                delete state.supplierDetails[supplierId];
                delete state.supplierProducts[supplierId];
            } else {
                state.lastFetchTime = {};
                state.supplierDetails = {};
                state.supplierProducts = {};
            }
        },

        clearRatings: (state) => {
            state.ratings = {};
        },

        setSupplierRating: (state, action) => {
            const { supplierId, rating, totalFeedbacks } = action.payload;
            state.ratings[supplierId] = { rating, totalFeedbacks };
        }
    },
    extraReducers: (builder) => {
        // Общие состояния
        const setPending = (state) => {
            state.loading = true;
            state.error = null;
        };

        const setRejected = (state, action) => {
            state.loading = false;
            state.error = action.payload || 'Произошла ошибка';
        };

        // Обработчики для fetchSuppliersList
        builder
            .addCase(fetchSuppliersList.pending, setPending)
            .addCase(fetchSuppliersList.fulfilled, (state, action) => {
                state.loading = false;

                if (action.payload.fromCache) {
                    return;
                }

                const { data, cacheKey } = action.payload;

                // Обработка данных
                if (data && data.staff && Array.isArray(data.staff)) {
                    state.list = data.staff;
                    state.total = data.total || 0;
                    state.page = data.page || 1;
                    state.pages = data.pages || 1;

                    // Кэширование деталей поставщиков
                    data.staff.forEach(supplier => {
                        if (supplier && supplier.id) {
                            state.supplierDetails[supplier.id] = supplier;
                            state.lastFetchTime[`supplier_${supplier.id}`] = Date.now();

                            // Кэширование продуктов, если они есть
                            if (supplier.supplier && supplier.supplier.products) {
                                state.supplierProducts[supplier.id] = supplier.supplier.products;
                                state.lastFetchTime[`products_${supplier.id}`] = Date.now();
                            }
                        }
                    });

                    // Обновление времени кэширования
                    state.lastFetchTime[cacheKey] = Date.now();
                }
            })
            .addCase(fetchSuppliersList.rejected, setRejected)

            // Обработчики для fetchSupplierById
            .addCase(fetchSupplierById.pending, setPending)
            .addCase(fetchSupplierById.fulfilled, (state, action) => {
                state.loading = false;

                if (action.payload.fromCache) return;

                const { supplier, supplierId } = action.payload;

                // Проверяем наличие несериализуемых данных
                const { headers, ...serializable } = supplier || {};

                // Сохранение данных поставщика (только сериализуемые)
                state.supplierDetails[supplierId] = serializable;
                state.lastFetchTime[`supplier_${supplierId}`] = Date.now();

                // Обновление в списке, если есть
                const existingIndex = state.list.findIndex(item => item.id === supplierId);
                if (existingIndex !== -1) {
                    state.list[existingIndex] = serializable;
                }
            })
            .addCase(fetchSupplierById.rejected, setRejected)

            // Обработчики для fetchSupplierProducts
            .addCase(fetchSupplierProducts.pending, setPending)
            .addCase(fetchSupplierProducts.fulfilled, (state, action) => {
                state.loading = false;

                if (action.payload.fromCache) return;

                const { products, supplierId } = action.payload;

                // Сохранение продуктов
                state.supplierProducts[supplierId] = products;
                state.lastFetchTime[`products_${supplierId}`] = Date.now();
            })
            .addCase(fetchSupplierProducts.rejected, setRejected)

            // Обработчики для fetchSupplierWithProducts
            .addCase(fetchSupplierWithProducts.pending, setPending)
            .addCase(fetchSupplierWithProducts.fulfilled, (state, action) => {
                state.loading = false;

                if (action.payload.fromCache) return;

                const { supplier, products, supplierId } = action.payload;

                // Проверяем наличие несериализуемых данных
                const { headers, ...serializable } = supplier || {};

                // Сохранение поставщика и продуктов
                state.supplierDetails[supplierId] = serializable;
                state.lastFetchTime[`supplier_${supplierId}`] = Date.now();

                // Сериализуемые продукты
                const serializableProducts = Array.isArray(products) ? products.map(product => {
                    const { headers: productHeaders, ...serializableProduct } = product || {};
                    return serializableProduct;
                }) : [];
                
                state.supplierProducts[supplierId] = serializableProducts;
                state.lastFetchTime[`products_${supplierId}`] = Date.now();

                state.currentSupplierId = supplierId;

                // Обновление в списке, если есть
                const existingIndex = state.list.findIndex(item => item.id === supplierId);
                if (existingIndex !== -1) {
                    state.list[existingIndex] = serializable;
                }
            })
            .addCase(fetchSupplierWithProducts.rejected, setRejected)

            // Обработчики для fetchSupplierRating
            .addCase(fetchSupplierRating.pending, setPending)
            .addCase(fetchSupplierRating.fulfilled, (state, action) => {
                state.loading = false;
                // Извлекаем только необходимые поля, исключая несериализуемые данные
                const { supplierId, rating, totalFeedbacks } = action.payload;

                // Сохраняем только сериализуемые данные
                state.ratings[supplierId] = { 
                    rating: rating || 0, 
                    totalFeedbacks: totalFeedbacks || 0 
                };
                
                // Убедимся, что в state.supplierDetails нет несериализуемых данных
                if (state.supplierDetails[supplierId]) {
                    // Удаляем HTTP заголовки, если они есть
                    const { headers, ...serializable } = state.supplierDetails[supplierId];
                    state.supplierDetails[supplierId] = serializable;
                }
            })
            .addCase(fetchSupplierRating.rejected, setRejected);
    },
});

export const {
    setCurrentSupplierId,
    clearSupplierError,
    setSupplierRating,
    clearRatings,
    clearSupplierCache
} = suppliersSlice.actions;

export default suppliersSlice.reducer;