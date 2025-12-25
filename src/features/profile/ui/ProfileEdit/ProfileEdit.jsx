import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Animated, Keyboard } from 'react-native';
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
    const [keyboardVisible, setKeyboardVisible] = useState(false);

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

    // Отслеживание состояния клавиатуры
    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => {
                setKeyboardVisible(true);
            }
        );

        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setKeyboardVisible(false);
            }
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, []);

    useEffect(() => {
        if (isDistrictsNeeded() && !districts?.length && !districtsLoading) {
            loadDistricts();
        }
        if (isWarehousesNeeded() && !warehouses?.length && !warehousesLoading) {
            loadWarehouses();
        }
    }, [isDistrictsNeeded, districts, districtsLoading, loadDistricts, userType, isWarehousesNeeded, warehouses, warehousesLoading, loadWarehouses]);

    useEffect(() => {
        if (!profile) {
            setIsFormInitialized(false);
            return;
        }

        const needsDistricts = isDistrictsNeeded();
        const needsWarehouses = isWarehousesNeeded();
        const districtsReady = !needsDistricts || (districts && districts.length > 0);
        const warehousesReady = !needsWarehouses || (warehouses && warehouses.length > 0);


        if (districtsReady && warehousesReady && !districtsLoading && !warehousesLoading) {

            const initialValues = getInitialFormValues();
            console.log('ProfileEdit: Инициализация формы', {
                userType,
                initialValues,
                initialValuesKeys: Object.keys(initialValues),
                profileGender: profile?.gender,
                profileKeys: profile ? Object.keys(profile) : 'no profile'
            });
            setFormInitialValues(initialValues);
            setIsFormInitialized(true);


        } else {
            setIsFormInitialized(false);

        }
    }, [profile, getInitialFormValues, userType, districts, districtsLoading, isDistrictsNeeded, warehouses, warehousesLoading, isWarehousesNeeded]);

    const extraData = useMemo(() => {
        const data = {};



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

    if (!ProfileForm) {
        return (
            <View style={styles.centered}>
                <Text style={[styles.errorText, { fontSize: normalizeFont(16) }]}>
                    Ошибка загрузки формы профиля
                </Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <ProfileHeader title="Редактирование профиля" onGoBack={handleGoBack} />

            {/* Условно рендерим хедер с аватаром только когда клавиатура скрыта */}
            {!keyboardVisible && (
                <View style={styles.headerAvatarContainer}>
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
                </View>
            )}

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
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingBottom: normalize(0),
    },
    headerAvatarContainer: {
        width: '100%',
        backgroundColor: '#FFFFFF',
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

export default ProfileEdit;