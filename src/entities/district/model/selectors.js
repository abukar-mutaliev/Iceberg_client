import { createSelector } from '@reduxjs/toolkit';

// Константы для предотвращения создания новых ссылок
const EMPTY_ARRAY = [];

// Базовые селекторы
export const selectDistricts = (state) => state.district?.districts || EMPTY_ARRAY;
export const selectSelectedDistrict = (state) => state.district?.selectedDistrict || null;
export const selectDistrictLoading = (state) => state.district?.loading || false;
export const selectDistrictError = (state) => state.district?.error || null;
export const selectDistrictLastFetchTime = (state) => state.district?.lastFetchTime || null;

// Производные селекторы
export const selectDistrictsSorted = createSelector(
    [selectDistricts],
    (districts) => {
        return [...districts].sort((a, b) => a.name.localeCompare(b.name));
    }
);

export const selectDistrictsForDropdown = createSelector(
    [selectDistricts],
    (districts) => {
        return districts.map(district => ({
            id: district.id,
            name: district.name,
            value: district.id,
            label: district.name
        }));
    }
);

export const selectDistrictById = createSelector(
    [selectDistricts, (_, districtId) => districtId],
    (districts, districtId) => {
        if (!districtId) return null;
        return districts.find(district => district.id === parseInt(districtId)) || null;
    }
);

export const selectDistrictsBySearch = createSelector(
    [selectDistricts, (_, searchQuery) => searchQuery],
    (districts, searchQuery) => {
        if (!searchQuery) return districts;

        const query = searchQuery.toLowerCase().trim();
        return districts.filter(district =>
            district.name.toLowerCase().includes(query) ||
            (district.description && district.description.toLowerCase().includes(query))
        );
    }
);

export const selectDistrictsWithStats = createSelector(
    [selectDistricts],
    (districts) => {
        return districts.map(district => ({
            ...district,
            driversCount: district._count?.drivers || 0,
            clientsCount: district._count?.clients || 0,
            stopsCount: district._count?.stops || 0,
            totalCount: (district._count?.drivers || 0) +
                (district._count?.clients || 0) +
                (district._count?.stops || 0)
        }));
    }
);

export const selectDistrictsWithHighestActivity = createSelector(
    [selectDistrictsWithStats],
    (districtsWithStats) => {
        if (!Array.isArray(districtsWithStats)) {
            return EMPTY_ARRAY;
        }
        return [...districtsWithStats]
            .sort((a, b) => b.totalCount - a.totalCount)
            .slice(0, 5);
    }
);

export const selectIsDistrictCacheValid = createSelector(
    [selectDistrictLastFetchTime],
    (lastFetchTime) => {
        const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 минут
        return lastFetchTime && Date.now() - lastFetchTime < CACHE_EXPIRY_TIME;
    }
);