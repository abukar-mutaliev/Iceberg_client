export const normalizeSearchText = (text) => {
    if (!text || typeof text !== 'string') return '';
    return text.toLowerCase().replace(/ё/g, 'е').trim();
};

export const getSearchTerms = (rawQuery) => {
    const normalized = normalizeSearchText(rawQuery);
    if (!normalized) return [];

    return normalized
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 2);
};

export const getProductSearchableText = (product) => {
    if (!product) return '';

    const parts = [
        product.name,
        product.description,
        product.brand,
        product.supplier?.companyName,
        product.supplier?.contactPerson,
    ];

    if (Array.isArray(product.categories)) {
        product.categories.forEach((category) => {
            if (typeof category === 'string') {
                parts.push(category);
            } else if (category && typeof category === 'object') {
                parts.push(category.name, category.description);
            }
        });
    }

    return normalizeSearchText(parts.filter(Boolean).join(' '));
};

export const productMatchesSearchQuery = (product, rawQuery) => {
    const terms = getSearchTerms(rawQuery);
    if (!terms.length) return true;
    if (!product) return false;

    const haystack = getProductSearchableText(product);
    return terms.every((term) => haystack.includes(term));
};
