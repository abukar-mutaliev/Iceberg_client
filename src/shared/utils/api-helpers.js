export const buildQueryString = (params = {}) => {
    const filteredParams = Object.fromEntries(
        Object.entries(params).filter(([_, value]) => value !== undefined)
    );
    const queryString = new URLSearchParams(filteredParams).toString();
    return queryString ? `?${queryString}` : '';
};

export const noCacheHeaders = {
    headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    }
};
