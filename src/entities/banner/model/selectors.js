import { createSelector } from '@reduxjs/toolkit';

const selectBannerState = state => state.banner;

export const selectAllBanners = createSelector(
    [selectBannerState],
    bannerState => bannerState.banners
);

export const selectMainBanners = createSelector(
    [selectBannerState],
    bannerState => bannerState.mainBanners
);

export const selectSupplierBanners = createSelector(
    [selectBannerState],
    bannerState => bannerState.supplierBanners
);

export const selectActiveMainBanners = createSelector(
    [selectMainBanners],
    mainBanners => {
        const now = new Date();

        return mainBanners
            .filter(banner => {
                if (!banner.isActive) return false;

                if (banner.startDate && new Date(banner.startDate) > now) return false;

                if (banner.endDate && new Date(banner.endDate) < now) return false;

                return true;
            })
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }
);

export const selectActiveSupplierBanners = (supplierId) => createSelector(
    [selectSupplierBanners],
    supplierBanners => {
        const now = new Date();

        return supplierBanners
            .filter(banner => {
                if (banner.supplierId !== supplierId) return false;

                if (!banner.isActive) return false;

                if (banner.startDate && new Date(banner.startDate) > now) return false;

                if (banner.endDate && new Date(banner.endDate) < now) return false;

                return true;
            })
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }
);

export const selectCurrentBanner = createSelector(
    [selectBannerState],
    bannerState => bannerState.currentBanner
);

export const selectBannerStatus = createSelector(
    [selectBannerState],
    bannerState => bannerState.status
);

export const selectBannerError = createSelector(
    [selectBannerState],
    bannerState => bannerState.error
);

export const selectRandomActiveMainBanner = createSelector(
    [selectActiveMainBanners],
    activeMainBanners => {
        if (activeMainBanners.length === 0) return null;

        if (activeMainBanners.length === 1) return activeMainBanners[0];

        const randomIndex = Math.floor(Math.random() * activeMainBanners.length);
        return activeMainBanners[randomIndex];
    }
);