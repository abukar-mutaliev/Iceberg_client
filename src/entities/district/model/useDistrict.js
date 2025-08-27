import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchAllDistricts,
    fetchDistrictById,
    createDistrict,
    updateDistrict,
    deleteDistrict,
    clearDistrictError,
    selectDistrict as selectDistrictAction
} from './slice';
import {
    selectDistricts,
    selectSelectedDistrict,
    selectDistrictLoading,
    selectDistrictError,
    selectDistrictsForDropdown,
    selectDistrictById
} from './selectors';
import { logData } from '@shared/lib/logger';

/**
 * Хук для работы с районами
 * @returns {Object} - методы и данные для работы с районами
 */
export const useDistrict = () => {
    const dispatch = useDispatch();

    // Селекторы из Redux
    const districts = useSelector(selectDistricts);
    const selectedDistrict = useSelector(selectSelectedDistrict);
    const isLoading = useSelector(selectDistrictLoading);
    const error = useSelector(selectDistrictError);
    const districtOptions = useSelector(selectDistrictsForDropdown);

    // Локальные состояния
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredDistricts, setFilteredDistricts] = useState([]);

    /**
     * Загрузка списка всех районов
     */
    const loadDistricts = useCallback(async () => {
        try {
            await dispatch(fetchAllDistricts()).unwrap();
        } catch (error) {
            logData('Ошибка загрузки районов', error);
        }
    }, [dispatch]);

    /**
     * Загрузка информации о конкретном районе
     * @param {number} id - ID района
     */
    const loadDistrictById = useCallback(async (id) => {
        try {
            await dispatch(fetchDistrictById(id)).unwrap();
        } catch (error) {
            logData('Ошибка загрузки района', { id, error });
        }
    }, [dispatch]);

    /**
     * Создание нового района
     * @param {Object} data - данные нового района
     */
    const handleCreateDistrict = useCallback(async (data) => {
        try {
            const result = await dispatch(createDistrict(data)).unwrap();
            return result;
        } catch (error) {
            logData('Ошибка создания района', { data, error });
            throw error;
        }
    }, [dispatch]);

    /**
     * Обновление района
     * @param {number} id - ID района
     * @param {Object} data - данные для обновления
     */
    const handleUpdateDistrict = useCallback(async (id, data) => {
        try {
            const result = await dispatch(updateDistrict({ id, districtData: data })).unwrap();
            return result;
        } catch (error) {
            logData('Ошибка обновления района', { id, data, error });
            throw error;
        }
    }, [dispatch]);

    /**
     * Удаление района
     * @param {number} id - ID района
     */
    const handleDeleteDistrict = useCallback(async (id) => {
        try {
            await dispatch(deleteDistrict(id)).unwrap();
        } catch (error) {
            logData('Ошибка удаления района', { id, error });
            throw error;
        }
    }, [dispatch]);

    /**
     * Выбор района
     * @param {number} id - ID района
     */
    const selectDistrictById = useCallback((id) => {
        const district = districts.find(d => d.id === id);
        dispatch(selectDistrictAction(district));
    }, [dispatch, districts]);

    /**
     * Очистка выбранного района
     */
    const clearSelectedDistrict = useCallback(() => {
        dispatch(selectDistrictAction(null));
    }, [dispatch]);

    /**
     * Очистка ошибки
     */
    const clearError = useCallback(() => {
        dispatch(clearDistrictError());
    }, [dispatch]);

    /**
     * Получение района по ID из локального состояния
     */
    const getDistrictById = useCallback((id) => {
        return districts.find(d => d.id === parseInt(id)) || null;
    }, [districts]);

    useEffect(() => {
        loadDistricts();
    }, [loadDistricts]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredDistricts(districts);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = districts.filter(district =>
            district.name.toLowerCase().includes(query) ||
            (district.description && district.description.toLowerCase().includes(query))
        );

        setFilteredDistricts(filtered);
    }, [searchQuery, districts]);

    return {
        // Данные
        districts,
        filteredDistricts,
        selectedDistrict,
        isLoading,
        error,
        districtOptions,
        searchQuery,

        // Методы
        loadDistricts,
        loadDistrictById,
        createDistrict: handleCreateDistrict,
        updateDistrict: handleUpdateDistrict,
        deleteDistrict: handleDeleteDistrict,
        selectDistrict: selectDistrictById,
        clearSelectedDistrict,
        clearError,
        getDistrictById,
        setSearchQuery
    };
};