import { createSelector } from '@reduxjs/toolkit';

// Константы для предотвращения создания новых ссылок
const EMPTY_ARRAY = [];

// Базовые селекторы
export const selectStops = (state) => state.stop?.stops || EMPTY_ARRAY;
export const selectStopLoading = (state) => state.stop?.loading || false;
export const selectStopError = (state) => state.stop?.error || null;
export const selectCurrentStop = (state) => state.stop?.currentStop || null;
export const selectSelectedDistrict = (state) => state.stop?.selectedDistrict || null;

// Производные селекторы для остановок
export const selectStopsSorted = createSelector(
    [selectStops],
    (stops) => {
        return [...stops].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    }
);

export const selectStopsByDistrict = createSelector(
    [selectStops, (_, districtId) => districtId],
    (stops, districtId) => {
        if (!districtId) return stops;
        return stops.filter(stop => stop.districtId === districtId);
    }
);

export const selectUpcomingStops = createSelector(
    [selectStops],
    (stops) => {
        const now = new Date();
        return stops
            .filter(stop => new Date(stop.startTime) > now || new Date(stop.endTime) > now)
            .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    }
);

export const selectTodayStops = createSelector(
    [selectStops],
    (stops) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return stops
            .filter(stop => {
                const startTime = new Date(stop.startTime);
                const endTime = new Date(stop.endTime || stop.startTime);
                return (startTime >= today && startTime < tomorrow) ||
                    (endTime >= today && endTime < tomorrow) ||
                    (startTime < today && endTime >= tomorrow);
            })
            .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    }
);

export const selectActiveStops = createSelector(
    [selectStops],
    (stops) => {
        const now = new Date();
        return stops
            .filter(stop => {
                const startTime = new Date(stop.startTime);
                const endTime = new Date(stop.endTime || stop.startTime);
                return startTime <= now && endTime >= now;
            })
            .sort((a, b) => new Date(a.endTime) - new Date(b.endTime));
    }
);

export const selectStopById = createSelector(
    [selectStops, (_, stopId) => stopId],
    (stops, stopId) => {
        return stops.find(stop => stop.id === parseInt(stopId));
    }
);

export const selectStopsByTruckModel = createSelector(
    [selectStops, (_, truckModel) => truckModel],
    (stops, truckModel) => {
        if (!truckModel) return stops;
        return stops.filter(stop =>
            stop.truckModel && stop.truckModel.toLowerCase().includes(truckModel.toLowerCase())
        );
    }
);

export const selectStopsByTruckNumber = createSelector(
    [selectStops, (_, truckNumber) => truckNumber],
    (stops, truckNumber) => {
        if (!truckNumber) return stops;
        return stops.filter(stop =>
            stop.truckNumber && stop.truckNumber.toLowerCase().includes(truckNumber.toLowerCase())
        );
    }
);

// Селектор для проверки валидности кэша
export const selectIsStopCacheValid = createSelector(
    [(state) => state.stop.lastFetchTime],
    (lastFetchTime) => {
        const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 минут
        return lastFetchTime && Date.now() - lastFetchTime < CACHE_EXPIRY_TIME;
    }
);

// Добавленный селектор для выбора статистики по остановкам
export const selectStopsStats = createSelector(
    [selectStops],
    (stops) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Статистика по времени
        const activeStops = stops.filter(stop => {
            const startTime = new Date(stop.startTime);
            const endTime = new Date(stop.endTime || stop.startTime);
            return startTime <= now && endTime >= now;
        });

        const todayStops = stops.filter(stop => {
            const startTime = new Date(stop.startTime);
            const endTime = new Date(stop.endTime || stop.startTime);
            return (startTime >= today && startTime < tomorrow) ||
                (endTime >= today && endTime < tomorrow) ||
                (startTime < today && endTime >= tomorrow);
        });

        const upcomingStops = stops.filter(stop => {
            const startTime = new Date(stop.startTime);
            return startTime > now;
        });

        // Статистика по моделям грузовиков
        const truckModels = {};
        stops.forEach(stop => {
            if (stop.truckModel) {
                truckModels[stop.truckModel] = (truckModels[stop.truckModel] || 0) + 1;
            }
        });

        // Статистика по районам
        const districts = {};
        stops.forEach(stop => {
            if (stop.district && stop.district.name) {
                districts[stop.district.name] = (districts[stop.district.name] || 0) + 1;
            }
        });

        return {
            total: stops.length,
            active: activeStops.length,
            today: todayStops.length,
            upcoming: upcomingStops.length,
            truckModels,
            districts
        };
    }
);