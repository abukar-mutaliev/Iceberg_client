export const normalizeSearchText = (text) => {
    if (!text || typeof text !== 'string') return '';
    return text.toLowerCase().replace(/ё/g, 'е').trim();
};

export const productMatchesSearchQuery = (product, rawQuery) => {
    const query = normalizeSearchText(rawQuery);
    if (!query) return true;
    if (!product) return false;

    const searchableFields = [
        product.name,
        product.description,
        product.brand,
        product.supplier?.companyName,
        product.supplier?.contactPerson,
    ];

    if (searchableFields.some((field) => field && normalizeSearchText(field).includes(query))) {
        return true;
    }

    if (!Array.isArray(product.categories)) {
        return false;
    }

    return product.categories.some((category) => {
        if (typeof category === 'string') {
            return normalizeSearchText(category).includes(query);
        }

        if (typeof category !== 'object' || category === null) {
            return false;
        }

        return (
            (category.name && normalizeSearchText(category.name).includes(query)) ||
            (category.description && normalizeSearchText(category.description).includes(query))
        );
    });
};
