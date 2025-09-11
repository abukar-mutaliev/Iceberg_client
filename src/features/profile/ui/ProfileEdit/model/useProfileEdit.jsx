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

        const determineUserType = () => {

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
            console.log('useProfileEdit - определен тип пользователя:', newUserType);
            console.log('useProfileEdit - profile для определения типа:', {
                role: profile?.role,
                hasSupplier: !!profile?.supplier,
                hasCompanyName: !!profile?.companyName,
                profileKeys: profile ? Object.keys(profile) : 'no profile'
            });
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
            return dispatch(fetchAllDistricts());
        }
        return Promise.resolve();
    }, [userType, dispatch, isDistrictsNeeded]);

    const loadWarehouses = useCallback(() => {
        if (isWarehousesNeeded()) {
            return dispatch(fetchAllWarehouses());
        }
        return Promise.resolve();
    }, [userType, dispatch, isWarehousesNeeded]);

    useEffect(() => {
        if (isDistrictsNeeded()) {
            loadDistricts();
        }
        if (isWarehousesNeeded()) {
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
                return profile.supplier || profile;
            default:
                return profile;
        }
    }, [profile, userType]);

    const getProfileName = useCallback(() => {
        if (!profile) return '';

        switch (userType) {
            case 'supplier':
                return profile.supplier?.companyName || profile.companyName || '';
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
        let baseData = {};

        switch (userType) {
            case 'employee':
                // Дополнительная обработка для districts - убеждаемся что это массив ID
                let processedDistricts = [];
                if (Array.isArray(formData.districts)) {
                    processedDistricts = formData.districts.filter(id => id !== null && id !== undefined && id !== '');
                } else if (formData.districts) {
                    // Если districts не массив, но есть значение, пытаемся обработать
                    processedDistricts = [formData.districts].filter(id => id !== null && id !== undefined && id !== '');
                }

                // Дополнительная обработка для warehouseId
                let processedWarehouseId = null;
                if (formData.warehouseId !== undefined && formData.warehouseId !== '' && formData.warehouseId !== null) {
                    processedWarehouseId = formData.warehouseId;
                }

                baseData = {
                    gender: formData.gender === '' ? null : formData.gender,
                    employee: {
                        phone: formData.phone || '',
                        address: formData.address || '',
                        name: formData.name || '',
                        position: formData.position || '',
                        districts: processedDistricts,
                        warehouseId: processedWarehouseId,
                    }
                };

                // Отладка для employee
                console.log('useProfileEdit: employee data processing', {
                    originalDistricts: formData.districts,
                    processedDistricts,
                    originalWarehouseId: formData.warehouseId,
                    processedWarehouseId,
                    districtsType: typeof formData.districts,
                    warehouseIdType: typeof formData.warehouseId
                });
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
                    phone: formData.phone || null,
                    address: formData.address || null,
                    gender: formData.gender || null,
                    companyName: formData.companyName || formData.name || '',
                    contactPerson: formData.contactPerson || '',
                    inn: formData.inn === '' ? null : formData.inn,
                    ogrn: formData.ogrn === '' ? null : formData.ogrn,
                    bankAccount: formData.bankAccount === '' ? null : formData.bankAccount,
                    bik: formData.bik === '' ? null : formData.bik,
                };
                break;
            default:
                baseData = {
                    phone: formData.phone || '',
                    address: formData.address || '',
                    gender: formData.gender || null,
                    name: formData.name || '',
                };
                break;
        }

        return baseData;
    }, [userType]);

    const handleSaveProfile = useCallback(async (formData) => {
        Keyboard.dismiss();
        try {
            setIsSaving(true);
            console.log('useProfileEdit: handleSaveProfile called', {
                formData,
                gender: formData.gender,
                formDataKeys: Object.keys(formData)
            });

            // Специальная отладка для employee
            if (userType === 'employee') {
                console.log('useProfileEdit: employee formData перед подготовкой', {
                    districts: formData.districts,
                    warehouseId: formData.warehouseId,
                    districtsType: typeof formData.districts,
                    warehouseIdType: typeof formData.warehouseId,
                    isDistrictsArray: Array.isArray(formData.districts)
                });
            }

            const dataToSend = prepareDataForSubmission(formData);
            console.log('useProfileEdit: dataToSend prepared', {
                dataToSend,
                gender: dataToSend.gender
            });

            // Специальная отладка для employee после подготовки
            if (userType === 'employee') {
                console.log('useProfileEdit: employee dataToSend после подготовки', {
                    employeeDistricts: dataToSend.employee?.districts,
                    employeeWarehouseId: dataToSend.employee?.warehouseId,
                    districtsType: typeof dataToSend.employee?.districts,
                    warehouseIdType: typeof dataToSend.employee?.warehouseId,
                    isDistrictsArray: Array.isArray(dataToSend.employee?.districts)
                });
            }

            console.log('useProfileEdit: dispatching updateProfile', {
                dataToSend,
                gender: dataToSend.gender
            });
            const result = await dispatch(updateProfile(dataToSend)).unwrap();
            console.log('useProfileEdit: updateProfile result', {
                result,
                resultGender: result?.gender
            });

            await dispatch(fetchProfile()).unwrap();

            if (isDistrictsNeeded()) {
                await loadDistricts();
            }

            if (isWarehousesNeeded()) {
                await loadWarehouses();
            }

            navigation.goBack();
        } catch (error) {
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
                    gender: profile.gender || 'MALE',
                };
                break;
            case 'driver':
                commonValues = {
                    phone: profile.driver?.phone || profile.phone || '',
                    address: profile.driver?.address || profile.address || '',
                    gender: profile.gender || 'MALE',
                };
                break;
            case 'client':
                commonValues = {
                    phone: profile.client?.phone || profile.phone || '',
                    address: profile.client?.address || profile.address || '',
                    gender: profile.gender || 'MALE',
                };
                break;
            case 'admin':
                commonValues = {
                    phone: profile.admin?.phone || profile.phone || '',
                    address: profile.admin?.address || profile.address || '',
                    gender: profile.gender || 'MALE',
                };
                break;
            default:
                commonValues = {
                    phone: profile.phone || '',
                    address: profile.address || '',
                    gender: profile.gender || 'MALE',
                };
                break;
        }


        let typeSpecificValues = {};

        switch (userType) {
            case 'supplier':
                typeSpecificValues = {
                    companyName: profile.supplier?.companyName || profile.companyName || '',
                    contactPerson: profile.supplier?.contactPerson || profile.contactPerson || '',
                    inn: profile.supplier?.inn || profile.inn || '',
                    ogrn: profile.supplier?.ogrn || profile.ogrn || '',
                    bankAccount: profile.supplier?.bankAccount || profile.bankAccount || '',
                    bik: profile.supplier?.bik || profile.bik || '',
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


        const result = {
            ...commonValues,
            ...typeSpecificValues
        };

        // Убеждаемся, что поле gender имеет значение по умолчанию, если оно пустое
        if (!result.gender || result.gender === '') {
            result.gender = 'MALE';
        }

        console.log(`useProfileEdit: Финальные начальные значения для ${userType}:`, {
            commonValues,
            typeSpecificValues,
            result,
            profileKeys: profile ? Object.keys(profile) : 'no profile',
            supplierKeys: profile?.supplier ? Object.keys(profile.supplier) : 'no supplier',
            gender: profile?.gender,
            supplierGender: profile?.supplier?.gender,
            finalGender: result.gender
        });

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