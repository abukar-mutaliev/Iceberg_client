import {createProtectedRequest} from "@shared/api/api";

export const bannerApi = {

    getBanners: async (params = {}) => {
        const { type, supplierId, active } = params;
        let queryParams = new URLSearchParams();

        if (type) queryParams.append('type', type);
        if (supplierId) queryParams.append('supplierId', supplierId);
        if (active !== undefined) queryParams.append('active', active.toString());

        const queryString = queryParams.toString();
        const url = `/api/banners${queryString ? `?${queryString}` : ''}`;

        return createProtectedRequest('get', url);
    },

    getBannerById: async (id) => {
        return createProtectedRequest('get', `/api/banners/${id}`);
    },


    createBanner: async (data) => {
        const formData = new FormData();

        Object.keys(data).forEach(key => {
            if (key === 'image' && data[key]) {
                formData.append('image', {
                    uri: data.image.uri,
                    type: data.image.type || 'image/jpeg',
                    name: data.image.fileName || 'banner.jpg'
                });
            } else if (data[key] !== undefined) {
                formData.append(key, data[key]);
            }
        });

        return createProtectedRequest('post', '/api/banners', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },


    updateBanner: async (id, data) => {
        const formData = new FormData();

        Object.keys(data).forEach(key => {
            if (key === 'image' && data[key]) {
                formData.append('image', {
                    uri: data.image.uri,
                    type: data.image.type || 'image/jpeg',
                    name: data.image.fileName || 'banner.jpg'
                });
            } else if (data[key] !== undefined) {
                formData.append(key, data[key]);
            }
        });

        return createProtectedRequest('put', `/api/banners/${id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    deleteBanner: async (id) => {
        return createProtectedRequest('delete', `/api/banners/${id}`);
    }
};