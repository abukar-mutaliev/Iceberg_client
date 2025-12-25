export const applyFiltersToProducts = (products, filterCriteria) => {
    if (!products || !Array.isArray(products) || products.length === 0) {
        console.log('Фильтрация: Нет продуктов для фильтрации');
        return [];
    }

    if (!filterCriteria) {
        console.log('Фильтрация: Нет критериев для фильтрации');
        return products;
    }

    console.log(`Фильтрация: Начинаем фильтрацию ${products.length} продуктов`);
    console.log('Фильтрация: Критерии:', JSON.stringify(filterCriteria));

    // Для отладки выводим структуру первого продукта
    if (products.length > 0) {
        console.log('Фильтрация: Пример структуры продукта:', JSON.stringify(products[0]));
    }

    const filteredProducts = products.filter(product => {
        if (!product) return false;

        // Для отладки
        // console.log(`Фильтрация: Проверяем продукт ${product.id} - ${product.name}`);

        // Фильтр по цене (минимальная)
        if (filterCriteria.minPrice !== undefined && filterCriteria.minPrice > 45) {
            const productPrice = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
            if (isNaN(productPrice) || productPrice < filterCriteria.minPrice) {
                // console.log(`Фильтрация: Продукт ${product.id} отсеян по минимальной цене`);
                return false;
            }
        }

        // Фильтр по цене (максимальная)
        if (filterCriteria.maxPrice !== undefined && filterCriteria.maxPrice < 1800) {
            const productPrice = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
            if (isNaN(productPrice) || productPrice > filterCriteria.maxPrice) {
                // console.log(`Фильтрация: Продукт ${product.id} отсеян по максимальной цене`);
                return false;
            }
        }

        // Фильтр по категориям
        if (filterCriteria.categories && filterCriteria.categories.length > 0) {
            const filterCategoryIds = filterCriteria.categories.map(cat => cat.id);

            // Проверяем наличие категорий у продукта
            if (!product.categories) return false;

            // Особая обработка, если categories - это вложенный объект
            let productCategories = product.categories;
            if (Array.isArray(product.categories) && product.categories.length === 1 &&
                typeof product.categories[0] === 'object' && product.categories[0] !== null) {
                // Если categories - это массив с одним объектом [Object]
                productCategories = product.categories[0];
            }

            // Извлекаем ID категорий из product.categories
            const productCategoryIds = Array.isArray(productCategories)
                ? productCategories.map(cat => typeof cat === 'object' ? cat.id : cat)
                : [typeof productCategories === 'object' ? productCategories.id : productCategories];

            // Проверяем пересечение
            if (!productCategoryIds.some(id => filterCategoryIds.includes(id))) {
                return false;
            }
        }

        // Фильтр по брендам/поставщикам
        if (filterCriteria.brands && filterCriteria.brands.length > 0) {
            // Извлекаем ID брендов из фильтра
            const filterBrandIds = filterCriteria.brands.map(brand => brand.id);

            // Определяем ID бренда/поставщика продукта
            let productBrandId = null;

            if (product.supplierId) {
                productBrandId = product.supplierId;
            } else if (product.supplier && typeof product.supplier === 'object') {
                productBrandId = product.supplier.id;
            } else if (product.brandId) {
                productBrandId = product.brandId;
            } else if (product.brand && typeof product.brand === 'object') {
                productBrandId = product.brand.id;
            }

            if (productBrandId === null || !filterBrandIds.includes(productBrandId)) {
                // console.log(`Фильтрация: Продукт ${product.id} отсеян по бренду/поставщику`);
                return false;
            }
        }

        // Фильтр по рейтингу
        if (filterCriteria.minRating !== undefined && filterCriteria.minRating !== 4.5) {
            // Определяем рейтинг продукта
            let productRating = 0;

            if (typeof product.averageRating !== 'undefined') {
                productRating = typeof product.averageRating === 'string'
                    ? parseFloat(product.averageRating)
                    : product.averageRating;
            } else if (typeof product.rating !== 'undefined') {
                productRating = typeof product.rating === 'string'
                    ? parseFloat(product.rating)
                    : product.rating;
            }

            if (isNaN(productRating) || productRating < filterCriteria.minRating) {
                // console.log(`Фильтрация: Продукт ${product.id} отсеян по рейтингу`);
                return false;
            }
        }

        // Фильтр по поставщикам
        if (filterCriteria.suppliers && filterCriteria.suppliers.length > 0) {
            // Извлекаем ID поставщиков из фильтра
            const filterSupplierIds = filterCriteria.suppliers.map(supplier => supplier.id);

            // Определяем ID поставщика продукта
            let productSupplierId = null;

            if (product.supplierId) {
                productSupplierId = product.supplierId;
            } else if (product.supplier && typeof product.supplier === 'object') {
                productSupplierId = product.supplier.id;
            }

            if (productSupplierId === null || !filterSupplierIds.includes(productSupplierId)) {
                // console.log(`Фильтрация: Продукт ${product.id} отсеян по поставщику`);
                return false;
            }
        }

        // Фильтр по количеству
        if (filterCriteria.quantity && filterCriteria.quantity.length > 0) {
            // Извлекаем значения количества из фильтра
            const filterQuantityValues = filterCriteria.quantity.map(q =>
                typeof q === 'object' && q !== null ? q.value : q
            );

            // Определяем количество продукта
            const productQuantity = typeof product.quantity === 'string'
                ? parseInt(product.quantity)
                : product.quantity;

            if (isNaN(productQuantity) || !filterQuantityValues.includes(productQuantity)) {
                // console.log(`Фильтрация: Продукт ${product.id} отсеян по количеству`);
                return false;
            }
        }

        // Если продукт прошел все фильтры, возвращаем true
        return true;
    });

    console.log(`Фильтрация: Отфильтровано ${filteredProducts.length} из ${products.length} продуктов`);

    return filteredProducts;
};