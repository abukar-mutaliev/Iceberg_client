import { useState, useEffect, useRef, useCallback } from 'react';
import { Keyboard, Alert } from 'react-native';
import { updateProfile, fetchProfile, initiateEmailBind, confirmEmailBind } from '@entities/profile';
import { fetchAllDistricts } from '@entities/district';
import { fetchAllWarehouses } from '@entities/warehouse';

export const useProfileEdit = (profile, dispatch, navigation, currentUser) => {
    const scrollViewRef = useRef(null);
    const [isSaving, setIsSaving] = useState(false);
    const [currentScrollPosition, setCurrentScrollPosition] = useState(0);
    const [editableFields, setEditableFields] = useState({});
    const renderCountRef = useRef(0);
    const [emailBindToken, setEmailBindToken] = useState(null);
    const [emailBindEmail, setEmailBindEmail] = useState('');
    const [isEmailBindModalVisible, setIsEmailBindModalVisible] = useState(false);
    const [emailBindError, setEmailBindError] = useState(null);
    const [isEmailBindLoading, setIsEmailBindLoading] = useState(false);

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
        }
    }, [profile, currentUser]);

    const userType = userTypeRef.current;

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
        if (fieldId === 'email' && profile?.email) {
            Alert.alert('Email уже привязан', 'Изменение email недоступно.');
            return;
        }
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
                        districts: processedDistricts,
                        warehouseId: processedWarehouseId,
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

        if (typeof formData.email !== 'undefined') {
            baseData.email = formData.email || null;
        }

        return baseData;
    }, [userType]);

    const handleSaveProfile = useCallback(async (formData) => {
        Keyboard.dismiss();
        try {
            setIsSaving(true);

            const trimmedEmail = (formData.email || '').trim().toLowerCase();
            if (trimmedEmail && !profile?.email) {
                const response = await dispatch(initiateEmailBind({ email: trimmedEmail })).unwrap();
                const bindToken = response?.bindToken || response?.data?.bindToken;

                if (bindToken) {
                    setEmailBindToken(bindToken);
                    setEmailBindEmail(trimmedEmail);
                    setEmailBindError(null);
                    setIsEmailBindModalVisible(true);
                }

                return;
            }

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
            Alert.alert(
                'Ошибка',
                error?.message || 'Не удалось сохранить изменения',
                [{ text: 'ОК' }]
            );
        } finally {
            setIsSaving(false);
        }
    }, [dispatch, prepareDataForSubmission, navigation, userType, isDistrictsNeeded, loadDistricts, profile]);

    const handleConfirmEmailBind = useCallback(async (verificationCode) => {
        if (!emailBindToken) return;

        try {
            setIsEmailBindLoading(true);
            setEmailBindError(null);

            await dispatch(confirmEmailBind({
                bindToken: emailBindToken,
                verificationCode
            })).unwrap();

            await dispatch(fetchProfile()).unwrap();
            setIsEmailBindModalVisible(false);
            setEmailBindToken(null);
            setEmailBindEmail('');
        } catch (error) {
            setEmailBindError(error?.message || 'Ошибка подтверждения email');
        } finally {
            setIsEmailBindLoading(false);
        }
    }, [dispatch, emailBindToken]);

    const handleCancelEmailBind = useCallback(() => {
        setIsEmailBindModalVisible(false);
        setEmailBindToken(null);
        setEmailBindEmail('');
        setEmailBindError(null);
    }, []);

    const getInitialFormValues = useCallback(() => {
        if (!profile) return {};

        let commonValues = {};

        switch (userType) {
            case 'employee':
                commonValues = {
                    phone: profile.employee?.phone || profile.phone || '',
                    address: profile.employee?.address || profile.address || '',
                    email: profile.email || '',
                    gender: profile.gender || 'MALE',
                };
                break;
            case 'driver':
                commonValues = {
                    phone: profile.driver?.phone || profile.phone || '',
                    address: profile.driver?.address || profile.address || '',
                    email: profile.email || '',
                    gender: profile.gender || 'MALE',
                };
                break;
            case 'client':
                commonValues = {
                    phone: profile.client?.phone || profile.phone || '',
                    address: profile.client?.address || profile.address || '',
                    email: profile.email || '',
                    gender: profile.gender || 'MALE',
                };
                break;
            case 'admin':
                commonValues = {
                    phone: profile.admin?.phone || profile.phone || '',
                    address: profile.admin?.address || profile.address || '',
                    email: profile.email || '',
                    gender: profile.gender || 'MALE',
                };
                break;
            default:
                commonValues = {
                    phone: profile.phone || '',
                    address: profile.address || '',
                    email: profile.email || '',
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
        isEmailBindModalVisible,
        emailBindEmail,
        emailBindError,
        isEmailBindLoading,
        handleConfirmEmailBind,
        handleCancelEmailBind,
    };
};

export default useProfileEdit;