import { createSelector } from '@reduxjs/toolkit';

// Константы для предотвращения создания новых ссылок
const EMPTY_ARRAY = [];

// Базовые селекторы
export const selectDriverLoading = (state) => state.driver?.loading || false;
export const selectDriverError = (state) => state.driver?.error || null;
export const selectDriverProfile = (state) => state.driver?.profile || null;
export const selectDriverDistricts = (state) => state.driver?.districts || EMPTY_ARRAY;
export const selectAllDrivers = (state) => state.driver?.allDrivers || EMPTY_ARRAY;

// Производные селекторы
export const selectDistrictOptions = createSelector(
    [selectDriverDistricts],
    (districts) => {
        return districts.map(district => ({
            value: district.id,
            label: district.name
        }));
    }
);

export const selectDistrictById = createSelector(
    [selectDriverDistricts, (_, districtId) => districtId],
    (districts, districtId) => {
        return districts.find(district => district.id === parseInt(districtId));
    }
);

export const selectDriversStats = createSelector(
    [selectAllDrivers],
    (drivers) => {
        return {
            total: drivers.length,
            active: drivers.filter(driver => driver.status === 'active').length,
            inactive: drivers.filter(driver => driver.status === 'inactive').length,
        };
    }
);

export const selectDriversByStatus = createSelector(
    [selectAllDrivers, (_, status) => status],
    (drivers, status) => {
        if (!status) return drivers;
        return drivers.filter(driver => driver.status === status);
    }
);