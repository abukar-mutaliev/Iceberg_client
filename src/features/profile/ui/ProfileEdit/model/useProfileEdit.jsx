import { useState, useEffect, useRef, useCallback } from 'react';
import { Keyboard, Alert } from 'react-native';
import { updateProfile, fetchProfile } from '@entities/profile';
import { fetchAllDistricts } from '@entities/district';
import { fetchAllWarehouses } from '@entities/warehouse';
import { logData } from '@shared/lib/logger';

export const useProfileEdit = (profile, dispatch, navigation, currentUser) => {
    const scrollViewRef = useRef(null);
    const [isSaving, setIsSaving] = useState(false);
    const [currentScrollPosition, setCurrentScrollPosition] = useState(0);
    const [editableFields, setEditableFields] = useState({});
    const renderCountRef = useRef(0);

    const userTypeRef = useRef('client');

    useEffect(() => {
        renderCountRef.current += 1;
        const isInitialRender = renderCountRef.current <= 2;

        const determineUserType = () => {
            if (isInitialRender) {
                console.log('determineUserType - profile:', profile);
                console.log('determineUserType - user:', currentUser);
            }

            if (currentUser && currentUser.role) {
                switch(currentUser.role.toUpperCase()) {
                    case 'ADMIN': return 'admin';
                    case 'EMPLOYEE': return 'employee';
                    case 'SUPPLIER': return 'supplier';
                    case 'DRIVER': return 'driver';
                    case 'CLIENT': return 'client';
                    default: break;
                }
            }

            if (profile && profile.role) {
                switch(profile.role.toUpperCase()) {
                    case 'ADMIN': return 'admin';
                    case 'EMPLOYEE': return 'employee';
                    case 'SUPPLIER': return 'supplier';
                    case 'DRIVER': return 'driver';
                    case 'CLIENT': return 'client';
                    default: break;
                }
            }

            if (!profile) return 'client';

            if (profile.admin) return 'admin';
            if (profile.driver) return 'driver';
            if (profile.client) return 'client';
            if (profile.employee) return 'employee';
            if (profile.companyName) return 'supplier';
            if (profile.isSuperAdmin !== undefined) return 'admin';

            return 'client';
        };

        const newUserType = determineUserType();
        if (newUserType !== userTypeRef.current) {
            userTypeRef.current = newUserType;
            if (isInitialRender) {
                console.log('useProfileEdit - определен тип пользователя:', newUserType);
            }
        }
    }, [profile, currentUser]);

    const userType = userTypeRef.current;

    useEffect(() => {
        if (profile && renderCountRef.current <= 2) {


            if (profile.driver) console.log('Поля driver:', Object.keys(profile.driver));
            if (profile.client) console.log('Поля client:', Object.keys(profile.client));
            if (profile.employee) console.log('Поля employee:', Object.keys(profile.employee));
            if (profile.admin) console.log('Поля admin:', Object.keys(profile.admin));
        }
    }, [profile, userType]);

    const isDistrictsNeeded = useCallback(() => {
        return userType === 'driver' || userType === 'client' || userType === 'employee';
    }, [userType]);

    const isWarehousesNeeded = useCallback(() => {
        return userType === 'employee';
    }, [userType]);

    const loadDistricts = useCallback(() => {
        if (isDistrictsNeeded()) {
            logData('useProfileEdit: Загрузка районов', { userType });
            return dispatch(fetchAllDistricts());
        }
        return Promise.resolve();
    }, [userType, dispatch, isDistrictsNeeded]);

    const loadWarehouses = useCallback(() => {
        if (isWarehousesNeeded()) {
            logData('useProfileEdit: Загрузка складов', { userType });
            return dispatch(fetchAllWarehouses());
        }
        return Promise.resolve();
    }, [userType, dispatch, isWarehousesNeeded]);

    useEffect(() => {
        if (isDistrictsNeeded()) {
            logData('useProfileEdit: Автоматическая загрузка районов для профиля', { userType });
            loadDistricts();
        }
        if (isWarehousesNeeded()) {
            logData('useProfileEdit: Автоматическая загрузка складов для профиля', { userType });
            loadWarehouses();
        }
    }, [userType, loadDistricts, isDistrictsNeeded, loadWarehouses, isWarehousesNeeded]);

    const getProfileData = useCallback(() => {
        if (!profile) return null;

        switch (userType) {
            case 'employee':
                return profile.employee || profile;
            case 'driver':
                return profile.driver || profile;
            case 'client':
                return profile.client || profile;
            case 'admin':
                return profile.admin || profile;
            case 'supplier':
            default:
                return profile;
        }
    }, [profile, userType]);

    const getProfileName = useCallback(() => {
        if (!profile) return '';

        switch (userType) {
            case 'supplier':
                return profile.companyName || '';
            case 'employee':
                return profile.employee?.name || profile.name || '';
            case 'driver':
                return profile.driver?.name || profile.name || '';
            case 'client':
                return profile.client?.name || profile.name || '';
            case 'admin':
                return profile.admin?.name || profile.name || '';
            default:
                return '';
        }
    }, [profile, userType]);

    const toggleFieldEditable = useCallback((fieldId) => {
        setEditableFields(prev => ({
            ...prev,
            [fieldId]: !prev[fieldId]
        }));

        if (editableFields[fieldId]) {
            Keyboard.dismiss();
        }
    }, [editableFields]);

    const handleGoBack = useCallback(() => {
        Keyboard.dismiss();
        navigation.goBack();
    }, [navigation]);

    const handleScroll = useCallback((event) => {
        setCurrentScrollPosition(event.nativeEvent.contentOffset.y);
    }, []);

    const prepareDataForSubmission = useCallback((formData) => {
        logData('useProfileEdit: Подготовка данных для отправки', { userType, formData });
        console.log('Входные данные формы для отправки:', formData);

        let baseData = {};

        switch (userType) {
            case 'employee':
                baseData = {
                    gender: formData.gender === '' ? null : formData.gender,
                    employee: {
                        phone: formData.phone || '',
                        address: formData.address || '',
                        name: formData.name || '',
                        position: formData.position || '',
                        districts: Array.isArray(formData.districts) ? formData.districts : [],
                        warehouseId: formData.warehouseId || null,
                    }
                };
                break;
            case 'driver':
                baseData = {
                    gender: formData.gender === '' ? null : formData.gender,
                    driver: {
                        phone: formData.phone || '',
                        address: formData.address || '',
                        name: formData.name || '',
                        districts: Array.isArray(formData.districts) ? formData.districts : [],
                    }
                };
                break;
            case 'client':
                baseData = {
                    gender: formData.gender === '' ? null : formData.gender,
                    client: {
                        phone: formData.phone || '',
                        address: formData.address || '',
                        name: formData.name || '',
                        districtId: formData.districtId || null,
                    }
                };
                break;
            case 'admin':
                baseData = {
                    gender: formData.gender === '' ? null : formData.gender,
                    admin: {
                        phone: formData.phone || '',
                        address: formData.address || '',
                        name: formData.name || '',
                    }
                };
                break;
            case 'supplier':
                baseData = {
                    phone: formData.phone || '',
                    address: formData.address || '',
                    gender: formData.gender === '' ? null : formData.gender,
                    companyName: formData.companyName || formData.name || '',
                    contactPerson: formData.contactPerson || '',
                    inn: formData.inn || '',
                    ogrn: formData.ogrn || '',
                    bankAccount: formData.bankAccount || '',
                    bik: formData.bik || '',
                };
                break;
            default:
                baseData = {
                    phone: formData.phone || '',
                    address: formData.address || '',
                    gender: formData.gender === '' ? null : formData.gender,
                    name: formData.name || '',
                };
                break;
        }

        console.log('Подготовленные данные для отправки:', baseData);
        return baseData;
    }, [userType]);

    const handleSaveProfile = useCallback(async (formData) => {
        Keyboard.dismiss();
        try {
            setIsSaving(true);
            logData('useProfileEdit: Сохранение профиля', { userType });

            console.log('Данные формы перед отправкой:', formData);

            const dataToSend = prepareDataForSubmission(formData);

            const result = await dispatch(updateProfile(dataToSend)).unwrap();

            await dispatch(fetchProfile()).unwrap();

            if (isDistrictsNeeded()) {
                await loadDistricts();
            }

            if (isWarehousesNeeded()) {
                await loadWarehouses();
            }

            navigation.goBack();
        } catch (error) {
            logData('useProfileEdit: Ошибка обновления профиля', { error });

            Alert.alert(
                'Ошибка',
                error?.message || 'Не удалось сохранить изменения',
                [{ text: 'ОК' }]
            );
        } finally {
            setIsSaving(false);
        }
    }, [dispatch, prepareDataForSubmission, navigation, userType, isDistrictsNeeded, loadDistricts]);

    const getInitialFormValues = useCallback(() => {
        if (!profile) return {};

        let commonValues = {};

        switch (userType) {
            case 'employee':
                commonValues = {
                    phone: profile.employee?.phone || profile.phone || '',
                    address: profile.employee?.address || profile.address || '',
                    gender: profile.gender || '',
                };
                break;
            case 'driver':
                commonValues = {
                    phone: profile.driver?.phone || profile.phone || '',
                    address: profile.driver?.address || profile.address || '',
                    gender: profile.gender || '',
                };
                break;
            case 'client':
                commonValues = {
                    phone: profile.client?.phone || profile.phone || '',
                    address: profile.client?.address || profile.address || '',
                    gender: profile.gender || '',
                };
                break;
            case 'admin':
                commonValues = {
                    phone: profile.admin?.phone || profile.phone || '',
                    address: profile.admin?.address || profile.address || '',
                    gender: profile.gender || '',
                };
                break;
            default:
                commonValues = {
                    phone: profile.phone || '',
                    address: profile.address || '',
                    gender: profile.gender || '',
                };
                break;
        }

        console.log('Общие значения:', commonValues);

        let typeSpecificValues = {};

        switch (userType) {
            case 'supplier':
                typeSpecificValues = {
                    companyName: profile.companyName || '',
                    contactPerson: profile.contactPerson || '',
                    inn: profile.inn || '',
                    ogrn: profile.ogrn || '',
                    bankAccount: profile.bankAccount || '',
                    bik: profile.bik || '',
                };
                break;

            case 'employee':
                typeSpecificValues = {
                    name: profile.employee?.name || profile.name || '',
                    position: profile.employee?.position || profile.position || '',
                    districts: profile.employee?.districts?.map(d => d.id) ||
                        profile.districts?.map(d => d.id) || [],
                    warehouseId: profile.employee?.warehouseId || profile.warehouseId || null,
                };
                break;

            case 'driver':
                typeSpecificValues = {
                    name: profile.driver?.name || profile.name || '',
                    districts: profile.driver?.districts?.map(d => d.id) ||
                        profile.districts?.map(d => d.id) || [],
                };
                break;

            case 'admin':
                typeSpecificValues = {
                    name: profile.admin?.name || profile.name || '',
                    isSuperAdmin: profile.admin?.isSuperAdmin || profile.isSuperAdmin || false,
                };
                break;

            case 'client':
                typeSpecificValues = {
                    name: profile.client?.name || profile.name || '',
                    districtId: profile.client?.districtId || profile.districtId || null,
                };
                break;

            default:
                typeSpecificValues = {
                    name: profile.name || '',
                };
                break;
        }

        console.log('Специфические значения:', typeSpecificValues);

        const result = {
            ...commonValues,
            ...typeSpecificValues
        };

        console.log('Итоговые начальные значения формы:', result);
        return result;
    }, [profile, userType]);

    return {
        userType,
        scrollViewRef,
        isSaving,
        editableFields,
        toggleFieldEditable,
        handleGoBack,
        handleScroll,
        handleSaveProfile,
        getProfileName,
        getProfileData,
        getInitialFormValues,
        isDistrictsNeeded,
        loadDistricts,
        isWarehousesNeeded,
        loadWarehouses,
    };
};

export default useProfileEdit;