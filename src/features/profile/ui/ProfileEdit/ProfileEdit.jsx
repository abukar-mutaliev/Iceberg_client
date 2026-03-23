import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, BackHandler, Modal, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { selectProfile, selectProfileLoading } from '@entities/profile';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { ProfileAvatar } from "@entities/profile/ui/ProfileAvatar";
import { ProfileHeader } from "@features/profile/ui/ProfileEdit/ui/ProfileHeader";
import { ProfileForm } from "./ui/ProfileForm";
import { useProfileEdit } from "./model/useProfileEdit";
import {selectDistrictLoading, selectDistrictsForDropdown} from "@entities/district";
import {selectWarehouseLoading, selectWarehousesForDropdown} from "@entities/warehouse";
import { useAuth } from "@entities/auth/hooks/useAuth";

export const ProfileEdit = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const profile = useSelector(selectProfile);
    const isLoading = useSelector(selectProfileLoading);
    const { currentUser } = useAuth();
    const insets = useSafeAreaInsets();
    const isAndroid = Platform.OS === 'android';
    const tabBarHeight = 80 + insets.bottom;
    const formBottomInset = isAndroid ? tabBarHeight + normalize(12) : insets.bottom + normalize(12);
    const districts = useSelector(selectDistrictsForDropdown);
    const districtsLoading = useSelector(selectDistrictLoading);
    const warehouses = useSelector(selectWarehousesForDropdown);
    const warehousesLoading = useSelector(selectWarehouseLoading);

    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const saveHandlerRef = useRef(null);
    const [emailBindCode, setEmailBindCode] = useState('');

    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                if (navigation.canGoBack()) {
                    navigation.goBack();
                } else {
                    navigation.navigate('ProfileMain');
                }
                return true;
            };

            const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => {
                if (backHandler && typeof backHandler.remove === 'function') {
                    backHandler.remove();
                }
            };
        }, [navigation])
    );

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
        isEmailBindModalVisible,
        emailBindEmail,
        emailBindError,
        isEmailBindLoading,
        handleConfirmEmailBind,
        handleCancelEmailBind,
    } = useProfileEdit(profile, dispatch, navigation, currentUser);

    const displayName = useMemo(() => getProfileName(), [getProfileName]);
    const handleHeaderSave = useCallback(() => {
        if (saveHandlerRef.current) {
            saveHandlerRef.current();
        }
    }, []);
    const registerSaveHandler = useCallback((handler) => {
        saveHandlerRef.current = handler;
    }, []);

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

    const loadTriggeredRef = useRef(false);
    useEffect(() => {
        if (loadTriggeredRef.current) return;
        const needsD = isDistrictsNeeded() && !districts?.length && !districtsLoading;
        const needsW = isWarehousesNeeded() && !warehouses?.length && !warehousesLoading;
        if (needsD || needsW) {
            loadTriggeredRef.current = true;
            if (needsD) loadDistricts();
            if (needsW) loadWarehouses();
        }
    }, [isDistrictsNeeded, districts, districtsLoading, loadDistricts, isWarehousesNeeded, warehouses, warehousesLoading, loadWarehouses]);

    const isFormReady = useMemo(() => {
        if (!profile || isLoading) return false;
        const needsDistricts = userType === 'driver' || userType === 'client' || userType === 'employee';
        const needsWarehouses = userType === 'employee';
        const districtsReady = !needsDistricts || (districts && districts.length > 0);
        const warehousesReady = !needsWarehouses || (warehouses && warehouses.length > 0);
        return districtsReady && warehousesReady && !districtsLoading && !warehousesLoading;
    }, [profile, isLoading, userType, districts, districtsLoading, warehouses, warehousesLoading]);

    const formInitialValues = useMemo(() => {
        if (!isFormReady) return null;
        return getInitialFormValues();
    }, [isFormReady, getInitialFormValues]);

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

    if (!isFormReady || !formInitialValues) {
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
            <ProfileHeader
                title="Редактирование профиля"
                onGoBack={handleGoBack}
                onSave={handleHeaderSave}
                isSaving={isSaving}
            />

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
                bottomInset={formBottomInset}
                registerSaveHandler={registerSaveHandler}
            />

            <Modal
                visible={isEmailBindModalVisible}
                transparent
                animationType="fade"
                onRequestClose={handleCancelEmailBind}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Подтверждение email</Text>
                        <Text style={styles.modalSubtitle}>
                            Мы отправили код на {emailBindEmail}
                        </Text>

                        <TextInput
                            style={styles.codeInput}
                            value={emailBindCode}
                            onChangeText={(text) => {
                                const numeric = text.replace(/[^0-9]/g, '').slice(0, 6);
                                setEmailBindCode(numeric);
                            }}
                            keyboardType="number-pad"
                            placeholder="000000"
                            maxLength={6}
                        />

                        {emailBindError ? (
                            <Text style={styles.modalError}>{emailBindError}</Text>
                        ) : null}

                        <TouchableOpacity
                            style={[styles.modalButton, isEmailBindLoading && styles.modalButtonDisabled]}
                            onPress={() => handleConfirmEmailBind(emailBindCode)}
                            disabled={isEmailBindLoading || emailBindCode.length !== 6}
                        >
                            <Text style={styles.modalButtonText}>
                                {isEmailBindLoading ? 'Проверка...' : 'Подтвердить'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalCancel}
                            onPress={handleCancelEmailBind}
                            disabled={isEmailBindLoading}
                        >
                            <Text style={styles.modalCancelText}>Отмена</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: normalize(20),
    },
    modalContent: {
        width: '100%',
        maxWidth: normalize(360),
        backgroundColor: '#FFFFFF',
        borderRadius: normalize(16),
        padding: normalize(20),
    },
    modalTitle: {
        fontSize: normalizeFont(18),
        fontWeight: '700',
        color: '#000',
        textAlign: 'center',
        marginBottom: normalize(8),
    },
    modalSubtitle: {
        fontSize: normalizeFont(14),
        color: '#666',
        textAlign: 'center',
        marginBottom: normalize(16),
    },
    codeInput: {
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: normalize(8),
        paddingVertical: normalize(10),
        paddingHorizontal: normalize(12),
        fontSize: normalizeFont(18),
        textAlign: 'center',
        letterSpacing: normalize(6),
        marginBottom: normalize(10),
    },
    modalError: {
        color: '#FF0000',
        textAlign: 'center',
        marginBottom: normalize(10),
        fontSize: normalizeFont(12),
    },
    modalButton: {
        backgroundColor: '#000cff',
        borderRadius: normalize(24),
        paddingVertical: normalize(12),
        alignItems: 'center',
    },
    modalButtonDisabled: {
        backgroundColor: '#d3d3d3',
    },
    modalButtonText: {
        color: '#FFFFFF',
        fontSize: normalizeFont(16),
        fontWeight: '600',
    },
    modalCancel: {
        marginTop: normalize(10),
        alignItems: 'center',
    },
    modalCancelText: {
        color: '#3339b0',
        fontSize: normalizeFont(14),
        fontWeight: '600',
    },
});

export default ProfileEdit;