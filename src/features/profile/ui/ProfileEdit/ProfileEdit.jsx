import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { selectProfile, selectProfileLoading } from '@entities/profile';
import { useNavigation } from '@react-navigation/native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { ProfileAvatar } from "@entities/profile/ui/ProfileAvatar";
import { ProfileHeader } from "@features/profile/ui/ProfileEdit/ui/ProfileHeader";
import { ProfileForm } from "./ui/ProfileForm";
import { useProfileEdit } from "./model/useProfileEdit";
import { logData } from '@shared/lib/logger';
import {selectDistrictLoading, selectDistrictsForDropdown} from "@entities/district";
import {selectWarehouseLoading, selectWarehousesForDropdown} from "@entities/warehouse";
import { useAuth } from "@entities/auth/hooks/useAuth";

export const ProfileEdit = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const profile = useSelector(selectProfile);
    const isLoading = useSelector(selectProfileLoading);
    const { currentUser } = useAuth();
    const districts = useSelector(selectDistrictsForDropdown);
    const districtsLoading = useSelector(selectDistrictLoading);
    const warehouses = useSelector(selectWarehousesForDropdown);
    const warehousesLoading = useSelector(selectWarehouseLoading);

    const [formInitialValues, setFormInitialValues] = useState({});
    const [isFormInitialized, setIsFormInitialized] = useState(false);

    const {
        userType,
        scrollViewRef,
        isSaving,
        editableFields,
        toggleFieldEditable,
        handleGoBack,
        handleScroll,
        handleSaveProfile,
        getProfileName,
        getInitialFormValues,
        isDistrictsNeeded,
        loadDistricts,
        isWarehousesNeeded,
        loadWarehouses,
    } = useProfileEdit(profile, dispatch, navigation, currentUser);

    const displayName = useMemo(() => getProfileName(), [getProfileName]);

    useEffect(() => {
        if (isDistrictsNeeded() && !districts?.length && !districtsLoading) {
            logData('ProfileEdit: Принудительная загрузка районов', { userType });
            loadDistricts();
        }
        if (isWarehousesNeeded() && !warehouses?.length && !warehousesLoading) {
            logData('ProfileEdit: Принудительная загрузка складов', { userType });
            loadWarehouses();
        }
    }, [isDistrictsNeeded, districts, districtsLoading, loadDistricts, userType, isWarehousesNeeded, warehouses, warehousesLoading, loadWarehouses]);

    // Инициализация формы - ждем загрузки всех необходимых данных
    useEffect(() => {
        if (!profile) {
            setIsFormInitialized(false);
            return;
        }

        // Проверяем, нужны ли нам районы и склады и загружены ли они
        const needsDistricts = isDistrictsNeeded();
        const needsWarehouses = isWarehousesNeeded();
        const districtsReady = !needsDistricts || (districts && districts.length > 0);
        const warehousesReady = !needsWarehouses || (warehouses && warehouses.length > 0);

        logData('ProfileEdit: Проверка готовности данных', {
            userType,
            needsDistricts,
            needsWarehouses,
            districtsReady,
            warehousesReady,
            districtsCount: districts?.length || 0,
            warehousesCount: warehouses?.length || 0,
            districtsLoading,
            warehousesLoading
        });

        // Инициализируем форму только когда все данные готовы
        if (districtsReady && warehousesReady && !districtsLoading && !warehousesLoading) {
            logData('ProfileEdit: Инициализация значений формы', { userType });

            const initialValues = getInitialFormValues();
            setFormInitialValues(initialValues);
            setIsFormInitialized(true);

            logData('ProfileEdit: Форма инициализирована', {
                initialValues,
                districtsCount: districts?.length || 0
            });
        } else {
            setIsFormInitialized(false);
            logData('ProfileEdit: Ожидание загрузки данных', {
                needsDistricts,
                needsWarehouses,
                districtsReady,
                warehousesReady,
                districtsLoading,
                warehousesLoading
            });
        }
    }, [profile, getInitialFormValues, userType, districts, districtsLoading, isDistrictsNeeded, warehouses, warehousesLoading, isWarehousesNeeded]);

    // Мемоизируем дополнительные данные для формы
    const extraData = useMemo(() => {
        const data = {};

        logData('ProfileEdit: Формирование extraData', {
            userType,
            districtsCount: districts?.length || 0,
            warehousesCount: warehouses?.length || 0
        });

        if (userType === 'driver') {
            data.districts = districts || [];
        }

        if (userType === 'employee') {
            data.districts = districts || [];
            data.warehouseId = warehouses || [];
        }

        if (userType === 'client') {
            data.districtId = districts || [];
        }

        return data;
    }, [userType, districts, warehouses]);

    // Показываем индикатор загрузки если данные еще не готовы
    if (isLoading || !isFormInitialized) {
        const loadingText = isLoading ? 'Загрузка профиля...' :
            districtsLoading ? 'Загрузка районов...' :
                warehousesLoading ? 'Загрузка складов...' :
                    'Подготовка данных...';

        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={[styles.loadingText, { fontSize: normalizeFont(14) }]}>
                    {loadingText}
                </Text>
            </View>
        );
    }

    // Проверка наличия ProfileForm
    if (!ProfileForm) {
        console.error("ProfileForm компонент не определен или не импортирован корректно");
        return (
            <View style={styles.centered}>
                <Text style={[styles.errorText, { fontSize: normalizeFont(16) }]}>
                    Ошибка загрузки формы профиля
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ProfileHeader title="Редактирование профиля" onGoBack={handleGoBack} />

            <View style={styles.profileImageContainer}>
                <ProfileAvatar
                    profile={profile}
                    size={118}
                    editable={true}
                />
            </View>

            <View style={[styles.nameContainer, { marginTop: normalize(10), marginBottom: normalize(20) }]}>
                <Text style={[styles.profileName, { fontSize: normalizeFont(18) }]}>
                    {displayName}
                </Text>
            </View>

            <ProfileForm
                userType={userType}
                initialValues={formInitialValues}
                onSave={handleSaveProfile}
                isSaving={isSaving}
                extraData={extraData}
                scrollViewRef={scrollViewRef}
                onScroll={handleScroll}
                editableFields={editableFields}
                toggleFieldEditable={toggleFieldEditable}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingBottom: normalize(0),
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: '#666666',
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
    },
    profileImageContainer: {
        alignItems: 'center',
        marginTop: normalize(30),
        position: 'relative',
        paddingBottom: normalize(16),
    },
    nameContainer: {
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 30,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    profileName: {
        fontSize: 18,
        fontWeight: '500',
        color: '#000000',
    },
});

// Экспортируем компонент
export default ProfileEdit;