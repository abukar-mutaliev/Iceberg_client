import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    ActivityIndicator,
    Switch
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Color } from '@app/styles/GlobalStyles';
import { CustomTextInput } from '@shared/ui/CustomTextInput/CustomTextInput';
import {DeliveryAddressApi} from "@entities/deliveryAddress";
import { profileApi } from '@entities/profile/api/profileApi';
import { selectProfile, fetchProfile } from '@entities/profile';
import CustomButton from "@shared/ui/Button/CustomButton";
import { IconEdit } from '@shared/ui/Icon/Profile/IconEdit';
import IconDelete from '@shared/ui/Icon/Profile/IconDelete';
import { GlobalAlert } from '@shared/ui/CustomAlert';

const normalize = (size) => size;
const MAX_ADDRESSES = 3;

export const AddressPickerModal = ({ 
    visible, 
    onClose, 
    onAddressSelected,
    currentAddress = null 
}) => {
    const dispatch = useDispatch();
    const profile = useSelector(selectProfile);
    const authUser = useSelector((state) => state.auth?.user);
    const [loading, setLoading] = useState(false);
    const [addresses, setAddresses] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showNewAddressForm, setShowNewAddressForm] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);
    const [showProfileAddressOption, setShowProfileAddressOption] = useState(false);
    
    const [addressForm, setAddressForm] = useState({
        title: '',
        address: '',
        districtId: '',
        isDefault: false
    });

    // Получаем адрес из профиля (проверяем разные возможные структуры)
    const profileAddress = profile?.client?.address || 
                          profile?.address || 
                          profile?.user?.client?.address ||
                          profile?.user?.address ||
                          authUser?.client?.address ||
                          authUser?.address || '';
    const profileDistrictId = profile?.client?.districtId || 
                             profile?.districtId || 
                             profile?.user?.client?.districtId ||
                             profile?.user?.districtId ||
                             authUser?.client?.districtId ||
                             authUser?.districtId || null;
    const hasProfileAddress = profileAddress && profileAddress.trim().length > 0;

    // Создаем объединенный список адресов (адрес из профиля + сохраненные адреса)
    const getAllAddresses = () => {
        const allAddresses = [];
        
        // Проверяем, есть ли уже сохраненный адрес, который совпадает с адресом из профиля
        // Сравниваем только адрес, так как districtId может быть undefined в сохраненных адресах
        const existingProfileAddress = addresses.find(addr => 
            addr.address === profileAddress
        );
        
        // Если есть связанный адрес, помечаем его как связанный с профилем
        if (existingProfileAddress) {
            existingProfileAddress.isLinkedToProfile = true;
            existingProfileAddress.profileDistrictId = profileDistrictId;
        }
        
        
        // Добавляем адрес из профиля как первый элемент, только если он еще не сохранен
        if (hasProfileAddress && !existingProfileAddress) {
            const profileAddressObj = {
                id: 'profile', // Специальный ID для адреса из профиля
                title: 'Адрес из профиля',
                address: profileAddress,
                districtId: profileDistrictId,
                district: districts.find(d => d.id === profileDistrictId),
                isDefault: false,
                isFromProfile: true // Флаг, что это адрес из профиля
            };
            allAddresses.push(profileAddressObj);
        }
        
        // Добавляем сохраненные адреса
        allAddresses.push(...addresses);
        
        
        return allAddresses;
    };

    const allAddresses = getAllAddresses();


    useEffect(() => {
        if (visible) {
            loadAddresses();
            setSelectedAddress(currentAddress);
            // Сброс формы при открытии модала - НЕ показываем форму по умолчанию
            setAddressForm({
                title: '',
                address: '',
                districtId: '',
                isDefault: false
            });
            setEditingAddress(null);
            setShowNewAddressForm(false); // ← ИСПРАВЛЕНИЕ: не показываем форму по умолчанию
            setShowProfileAddressOption(false);
            
            // Загружаем профиль, если он не загружен
            if (!profile && authUser) {
                dispatch(fetchProfile());
            }
        }
    }, [visible, currentAddress, profile, authUser, dispatch]);

    // Перезагружаем адреса при изменении профиля (для синхронизации связанных адресов)
    useEffect(() => {
        if (visible && profile && hasProfileAddress) {
            loadAddresses();
        }
    }, [profile?.client?.address, profile?.client?.districtId]);

    const resetForm = () => {
        setAddressForm({
            title: '',
            address: '',
            districtId: '',
            isDefault: false
        });
        setEditingAddress(null);
        // Не сбрасываем showNewAddressForm и showProfileAddressOption здесь
        // Они управляются отдельно через кнопки
    };

    const loadAddresses = async () => {
        try {
            setLoading(true);
            const [addressesResponse, districtsResponse] = await Promise.all([
                DeliveryAddressApi.getAddresses(),
                DeliveryAddressApi.getDistricts()
            ]);
            
            // Извлекаем данные из ответа API
            let addressesData = addressesResponse.data || addressesResponse;
            const districtsData = districtsResponse.data || districtsResponse;
            
            
            // Обновляем связанные с профилем адреса при изменении профиля
            if (hasProfileAddress && profileAddress) {
                addressesData = await updateLinkedAddresses(addressesData);
            }
            
            setAddresses(addressesData);
            setDistricts(districtsData);
            
            // НЕ показываем форму автоматически, даже если нет адресов
            // Пользователь может выбрать адрес из профиля или создать новый
        } catch (error) {
            console.error('Ошибка загрузки адресов:', error);
            GlobalAlert.showError('Ошибка', 'Не удалось загрузить адреса');
        } finally {
            setLoading(false);
        }
    };

    // Функция для обновления связанных с профилем адресов
    const updateLinkedAddresses = async (addressesData) => {
        try {
            // Находим адреса, которые ранее были связаны с профилем (имеют флаг isLinkedToProfile)
            // или совпадают с предыдущим адресом профиля
            const linkedAddresses = addressesData.filter(addr => 
                addr.isLinkedToProfile || 
                addr.title === 'Адрес из профиля' ||
                addr.address === profileAddress
            );
            
            if (linkedAddresses.length > 0) {
                
                // Обновляем каждый связанный адрес
                for (const linkedAddress of linkedAddresses) {
                    try {
                        // Проверяем, нужно ли обновлять адрес
                        const needsUpdate = linkedAddress.address !== profileAddress || 
                                          linkedAddress.districtId !== profileDistrictId;
                        
                        if (needsUpdate) {
                            const updateData = {
                                title: linkedAddress.title, // Сохраняем название
                                address: profileAddress,    // Обновляем адрес из профиля
                                districtId: profileDistrictId || linkedAddress.districtId
                            };
                            
                            
                            await DeliveryAddressApi.updateAddress(linkedAddress.id, updateData);
                            
                            // Обновляем данные в локальном массиве
                            const addressIndex = addressesData.findIndex(addr => addr.id === linkedAddress.id);
                            if (addressIndex !== -1) {
                                addressesData[addressIndex] = {
                                    ...addressesData[addressIndex],
                                    address: profileAddress,
                                    districtId: profileDistrictId || addressesData[addressIndex].districtId,
                                    district: districts.find(d => d.id === (profileDistrictId || addressesData[addressIndex].districtId))
                                };
                            }
                            
                        } else {
                        }
                    } catch (updateError) {
                        console.error('❌ Failed to update linked address:', updateError);
                    }
                }
            }
            
            return addressesData;
        } catch (error) {
            console.error('❌ Error updating linked addresses:', error);
            return addressesData; // Возвращаем исходные данные в случае ошибки
        }
    };

    const handleCreateAddress = async () => {
        if (!addressForm.title || !addressForm.address || !addressForm.districtId) {
            GlobalAlert.showError('Ошибка', 'Заполните все обязательные поля');
            return;
        }

        // Проверяем лимит адресов только для новых адресов
        if (!editingAddress && addresses.length >= MAX_ADDRESSES) {
            GlobalAlert.showError('Ошибка', `Максимальное количество адресов: ${MAX_ADDRESSES}`);
            return;
        }

        try {
            setLoading(true);
            
            if (editingAddress) {
                // Обновляем существующий адрес
                const updateData = {
                    title: addressForm.title,
                    address: addressForm.address,
                    districtId: parseInt(addressForm.districtId),
                    isDefault: addressForm.isDefault
                };
                
                // Если устанавливаем как адрес по умолчанию, сбрасываем флаг у других адресов
                if (addressForm.isDefault) {
                    // Сначала сбрасываем флаг isDefault у всех адресов
                    const resetPromises = addresses
                        .filter(addr => addr.id !== editingAddress.id && addr.isDefault)
                        .map(addr => DeliveryAddressApi.updateAddress(addr.id, { ...addr, isDefault: false }));
                    
                    if (resetPromises.length > 0) {
                        await Promise.all(resetPromises);
                    }
                }
                
                const response = await DeliveryAddressApi.updateAddress(editingAddress.id, updateData);
                
                const updatedAddress = response.data || response;
                
                // Если редактируемый адрес связан с профилем, обновляем также профиль
                if (editingAddress.isLinkedToProfile) {
                    try {
                        
                        // Обновляем профиль с новыми данными адреса
                        await profileApi.updateProfile({
                            client: {
                                address: addressForm.address,
                                districtId: parseInt(addressForm.districtId)
                            }
                        });
                        
                        // Обновляем профиль в Redux store
                        dispatch(fetchProfile());
                        
                    } catch (profileError) {
                        console.error('❌ Failed to sync with profile:', profileError);
                        GlobalAlert.showWarning('Предупреждение', 'Адрес обновлен, но не удалось синхронизировать изменения с профилем');
                    }
                }
                
                // Обновляем список адресов
                await loadAddresses();
                onAddressSelected(updatedAddress);
            } else {
                // Создаем новый адрес
                const response = await DeliveryAddressApi.createAddress({
                    title: addressForm.title,
                    address: addressForm.address,
                    districtId: parseInt(addressForm.districtId)
                });
                
                const createdAddress = response.data || response;
                
                // Обновляем список адресов
                await loadAddresses();
                onAddressSelected(createdAddress);
            }
            
            resetForm();
        } catch (error) {
            console.error('Ошибка сохранения адреса:', error);
            GlobalAlert.showError('Ошибка', 'Не удалось сохранить адрес');
        } finally {
            setLoading(false);
        }
    };

    const handleEditAddress = (address) => {
        // Не позволяем редактировать адрес из профиля (с ID 'profile')
        if (address.id === 'profile' || address.isFromProfile) {
            GlobalAlert.showInfo('Информация', 'Адрес из профиля нельзя редактировать. Сначала сохраните его как новый адрес.');
            return;
        }
        
        setEditingAddress(address);
        
        // Для связанных с профилем адресов используем districtId из профиля
        const districtId = address.isLinkedToProfile && address.profileDistrictId 
            ? address.profileDistrictId 
            : address.districtId;
            
        setAddressForm({
            title: address.title,
            address: address.address,
            districtId: districtId ? districtId.toString() : '',
            isDefault: address.isDefault || false
        });
        setShowNewAddressForm(true);
    };

    const handleDeleteAddress = async (address) => {
        // Не позволяем удалять адрес из профиля (с ID 'profile')
        if (address.id === 'profile' || address.isFromProfile) {
            GlobalAlert.showInfo('Информация', 'Адрес из профиля нельзя удалить. Он управляется через настройки профиля.');
            return;
        }
        
        GlobalAlert.showConfirm(
            'Удаление адреса',
            `Вы уверены, что хотите удалить адрес "${address.title}"?`,
            async () => {
                try {
                    setLoading(true);
                    await DeliveryAddressApi.deleteAddress(address.id);
                    await loadAddresses();
                    
                    // Если удаленный адрес был выбран, сбрасываем выбор
                    if (selectedAddress?.id === address.id) {
                        setSelectedAddress(null);
                    }
                    
                    GlobalAlert.showSuccess('', 'Адрес удален');
                } catch (error) {
                    console.error('Ошибка удаления адреса:', error);
                    GlobalAlert.showError('Ошибка', 'Не удалось удалить адрес');
                } finally {
                    setLoading(false);
                }
            }
        );
    };

    const handleUseProfileAddress = async () => {
        // Находим адрес из профиля в объединенном списке
        const profileAddressObj = allAddresses.find(addr => addr.isFromProfile);
        
        if (profileAddressObj) {
            // Автоматически создаем адрес в базе данных
            await handleCreateFromProfileAddress();
        } else {
            GlobalAlert.showError('Ошибка', 'Адрес в профиле не найден');
        }
    };

    const handleCreateFromProfileAddress = async () => {

        if (!hasProfileAddress) {
            GlobalAlert.showError('Ошибка', 'Адрес в профиле не заполнен');
            return;
        }

        // Проверяем лимит адресов (только для сохраненных адресов, не считая адрес из профиля)
        if (addresses.length >= MAX_ADDRESSES) {
            GlobalAlert.showError('Ошибка', `Максимальное количество адресов: ${MAX_ADDRESSES}`);
            return;
        }

        try {
            setLoading(true);
            
            // Создаем новый адрес на основе данных из профиля
            const addressData = {
                title: 'Адрес из профиля',
                address: profileAddress,
                districtId: profileDistrictId
            };
            
            
            const response = await DeliveryAddressApi.createAddress(addressData);
            
            const createdAddress = response.data || response;
            
            // Обновляем список адресов
            await loadAddresses();
            onAddressSelected(createdAddress);
            setShowProfileAddressOption(false);
            
        } catch (error) {
            console.error('Ошибка создания адреса из профиля:', error);
            GlobalAlert.showError('Ошибка', 'Не удалось создать адрес из профиля');
        } finally {
            setLoading(false);
        }
    };



    const renderAddressItem = (address) => (
        <View
            key={address.id}
            style={[
                styles.addressItem,
                selectedAddress?.id === address.id && styles.selectedAddressItem
            ]}
        >
            <View style={styles.addressTopRow}>
                <TouchableOpacity
                    style={styles.addressContent}
                    onPress={async () => {
                        // Если это адрес из профиля (id: 'profile'), автоматически создаем его
                        if (address.id === 'profile' || address.isFromProfile) {
                            await handleCreateFromProfileAddress();
                        } else {
                            setSelectedAddress(address);
                        }
                    }}
                >
                    <View style={styles.addressHeader}>
                        <View style={styles.addressTitleContainer}>
                            {selectedAddress?.id === address.id && (
                                <Text style={styles.selectedIndicator}>✓</Text>
                            )}
                            <Text style={styles.addressTitle} numberOfLines={2}>
                                {address.title}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.addressText}>{address.address}</Text>
                    <Text style={styles.districtText}>{address.district?.name}</Text>
                </TouchableOpacity>

                {/* Кнопки управления адресом */}
                <View style={styles.addressActions}>
                    {!address.isFromProfile && (
                        <>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleEditAddress(address)}
                            >
                                <IconEdit width={20} height={20} color="#3339B0" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.deleteButton]}
                                onPress={() => handleDeleteAddress(address)}
                            >
                                <IconDelete width={18} height={18} color="#DC3545" />
                            </TouchableOpacity>
                        </>
                    )}
                    {address.isFromProfile && (
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleCreateFromProfileAddress()}
                        >
                            <Text style={styles.actionButtonText}>💾</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {(address.isDefault || selectedAddress?.id === address.id || address.isFromProfile) && (
                <View style={styles.addressBadgesRow}>
                    {address.isDefault && (
                        <Text style={styles.defaultBadge}>По умолчанию</Text>
                    )}
                    {selectedAddress?.id === address.id && (
                        <Text style={styles.selectedBadge}>Выбран</Text>
                    )}
                    {address.isFromProfile && (
                        <Text style={styles.profileBadge}>👤 Из профиля</Text>
                    )}
                </View>
            )}
        </View>
    );


    const renderNewAddressForm = () => (
        <View style={styles.formContainer}>
            <View style={styles.formHeader}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setShowNewAddressForm(false)}
                >
                    <Text style={styles.backButtonText}>← Назад</Text>
                </TouchableOpacity>
                <Text style={styles.formTitle}>
                    {editingAddress ? 'Редактирование адреса' : 'Новый адрес доставки'}
                </Text>
            </View>
            
            <CustomTextInput
                label="Название *"
                placeholder="Дом, Работа, и т.д."
                value={addressForm.title}
                onChangeText={(text) => setAddressForm(prev => ({ ...prev, title: text }))}
                style={styles.inputField}
                labelStyle={styles.inputLabel}
                inputStyle={styles.inputText}
            />

            <CustomTextInput
                label="Адрес *"
                placeholder="Введите полный адрес"
                value={addressForm.address}
                onChangeText={(text) => setAddressForm(prev => ({ ...prev, address: text }))}
                multiline
                numberOfLines={3}
                style={styles.inputField}
                labelStyle={styles.inputLabel}
                inputStyle={styles.inputText}
            />

            <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Район:</Text>
                <ScrollView style={styles.districtsList} horizontal showsHorizontalScrollIndicator={false}>
                    {districts.map(district => (
                        <TouchableOpacity
                            key={district.id}
                            style={[
                                styles.districtChip,
                                addressForm.districtId === district.id.toString() && styles.selectedDistrictChip
                            ]}
                            onPress={() => setAddressForm(prev => ({ ...prev, districtId: district.id.toString() }))}
                        >
                            <Text style={[
                                styles.districtChipText,
                                addressForm.districtId === district.id.toString() && styles.selectedDistrictChipText
                            ]}>
                                {district.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Чекбокс "По умолчанию" - показываем только при редактировании */}
            {editingAddress && (
                <View style={styles.defaultAddressContainer}>
                    <View style={styles.defaultAddressRow}>
                        <Text style={styles.defaultAddressLabel}>
                            ⭐ Адрес по умолчанию
                        </Text>
                        <Switch
                            value={addressForm.isDefault}
                            onValueChange={(value) => setAddressForm(prev => ({ ...prev, isDefault: value }))}
                            trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
                            thumbColor={addressForm.isDefault ? '#FFFFFF' : '#F4F3F4'}
                        />
                    </View>
                    <Text style={styles.defaultAddressHint}>
                        Адрес по умолчанию будет автоматически выбран при оформлении заказа
                    </Text>
                </View>
            )}

            <View style={styles.formButtons}>
                <CustomButton
                    title={editingAddress ? "Сохранить изменения" : "Создать адрес"}
                    onPress={handleCreateAddress}
                    disabled={loading}
                />
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                        resetForm();
                        if (allAddresses.length === 0) {
                            onClose();
                        }
                    }}
                >
                    <Text style={styles.backButtonText}>
                        {allAddresses.length > 0 ? 'Выбрать существующий' : 'Отмена'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );


    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Выбор адреса доставки</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Color.colorPrimary} />
                        <Text style={styles.loadingText}>Загрузка...</Text>
                    </View>
                ) : (
                    <ScrollView style={styles.content}>
                        {showNewAddressForm ? (
                            renderNewAddressForm()
                        ) : (
                            <View>
                                <View style={styles.addressesHeader}>
                                    <Text style={styles.sectionTitle}>
                                        Ваши адреса ({addresses.length}/{MAX_ADDRESSES}):
                                    </Text>
                                    <View style={styles.headerButtons}>
                                        {addresses.length < MAX_ADDRESSES && (
                                            <TouchableOpacity
                                                style={styles.addButton}
                                                onPress={() => setShowNewAddressForm(true)}
                                            >
                                                <Text style={styles.addButtonText}>+ Добавить</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                                
                                {addresses.length >= MAX_ADDRESSES && (
                                    <View style={styles.limitWarning}>
                                        <Text style={styles.limitWarningText}>
                                            Достигнуто максимальное количество адресов ({MAX_ADDRESSES})
                                        </Text>
                                    </View>
                                )}

                                {allAddresses.map(renderAddressItem)}

                                {allAddresses.length === 0 && (
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyStateText}>
                                            У вас нет адресов доставки
                                        </Text>
                                        <Text style={styles.emptyStateSubtext}>
                                            Создайте новый адрес или заполните адрес в профиле
                                        </Text>
                                    </View>
                                )}

                                {allAddresses.length > 0 && (
                                    <View style={styles.footer}>
                                        <Text style={styles.footerHint}>
                                            Выберите адрес и нажмите "Подтвердить"
                                        </Text>
                                        {selectedAddress && (
                                            <TouchableOpacity
                                                style={styles.confirmButton}
                                                onPress={() => {
                                                    onAddressSelected(selectedAddress);
                                                }}
                                            >
                                                <Text style={styles.confirmButtonText}>
                                                    Подтвердить выбор
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        backgroundColor: '#ffffff'
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000'
    },
    closeButton: {
        padding: 8
    },
    closeButtonText: {
        fontSize: 18,
        color: '#666666'
    },
    content: {
        flex: 1,
        padding: 20
    },
    addressesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 8
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000'
    },
    profileButton: {
        backgroundColor: '#28a745',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        marginRight: 8
    },
    profileButtonText: {
        fontSize: 14,
        color: '#ffffff',
        fontWeight: '500'
    },
    addButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6
    },
    addButtonText: {
        fontSize: 14,
        color: '#ffffff',
        fontWeight: '500'
    },
    addressItem: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        paddingVertical: 12,
        gap: 2,
    },
    selectedAddressItem: {
        borderColor: '#007AFF',
        borderWidth: 2
    },
    addressTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        gap: 12,
    },
    addressContent: {
        flex: 1,
        gap: 6,
    },
    addressActions: {
        flexDirection: 'row',
        paddingRight: 12,
        alignItems: 'center',
        gap: 4,
    },
    actionButton: {
        padding: 8,
        marginLeft: 4,
        borderRadius: 6,
        backgroundColor: '#F8F9FA',
        minWidth: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E9ECEF'
    },
    deleteButton: {
        backgroundColor: '#FFF5F5',
        borderColor: '#FECACA'
    },
    actionButtonText: {
        fontSize: 16
    },
    addressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8
    },
    addressTitleContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flex: 1,
        marginRight: 8,
    },
    selectedIndicator: {
        fontSize: 16,
        color: '#3339B0',
        fontWeight: 'bold',
        marginRight: 8
    },
    addressTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
        flex: 1,
        flexShrink: 1,
        minWidth: 0,
    },
    addressBadgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 8,
        alignSelf: 'flex-end',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    defaultBadge: {
        fontSize: 12,
        color: '#007AFF',
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    profileBadge: {
        fontSize: 12,
        color: '#FFFFFF',
        backgroundColor: '#007AFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12
    },
    linkedBadge: {
        fontSize: 12,
        color: '#FFFFFF',
        backgroundColor: '#FF9500',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12
    },
    defaultAddressContainer: {
        marginVertical: 16,
        padding: 16,
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E9ECEF'
    },
    defaultAddressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    defaultAddressLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333333',
        flex: 1
    },
    defaultAddressHint: {
        fontSize: 14,
        color: '#6C757D',
        lineHeight: 20
    },
    selectedBadge: {
        fontSize: 12,
        color: '#FFFFFF',
        backgroundColor: '#3339B0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12
    },
    addressText: {
        fontSize: 14,
        color: '#333333',
        marginBottom: 4
    },
    districtText: {
        fontSize: 12,
        color: '#666666'
    },
    formContainer: {
        flex: 1
    },
    formHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20
    },
    backButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginRight: 12
    },
    backButtonText: {
        fontSize: 16,
        color: '#007AFF',
        fontWeight: '500'
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
        flex: 1,
        textAlign: 'center'
    },
    inputContainer: {
        marginBottom: 16
    },
    inputField: {
        marginBottom: 16,
        backgroundColor: '#F8F9FF',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E3F2FD',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#3339B0',
        marginBottom: 8
    },
    inputText: {
        fontSize: 16,
        color: '#000000',
        fontWeight: '500',
    },
    districtsList: {
        flexDirection: 'row'
    },
    districtChip: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8
    },
    selectedDistrictChip: {
        backgroundColor: '#007AFF'
    },
    districtChipText: {
        fontSize: 14,
        color: '#333333'
    },
    selectedDistrictChipText: {
        color: '#ffffff'
    },
    formButtons: {
        marginTop: 20
    },
    backButton: {
        marginTop: 12,
        alignItems: 'center'
    },
    backButtonText: {
        fontSize: 14,
        color: '#007AFF'
    },
    footer: {
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        fontSize: 14,
        color: '#666666',
        marginTop: 12
    },
    footerHint: {
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
        fontStyle: 'italic',
        marginBottom: 16
    },
    confirmButton: {
        backgroundColor: '#3339B0',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF'
    },
    limitWarning: {
        backgroundColor: '#FFF3CD',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FFEAA7'
    },
    limitWarningText: {
        fontSize: 14,
        color: '#856404',
        textAlign: 'center',
        fontWeight: '500'
    },
    // Стили для адреса из профиля
    profileAddressContainer: {
        flex: 1,
        padding: 20
    },
    profileAddressTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 16,
        textAlign: 'center'
    },
    profileAddressContent: {
        backgroundColor: '#F8F9FF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#E3F2FD'
    },
    profileAddressText: {
        fontSize: 16,
        color: '#000000',
        fontWeight: '500',
        marginBottom: 8,
        lineHeight: 24
    },
    profileDistrictText: {
        fontSize: 14,
        color: '#666666',
        fontStyle: 'italic'
    },
    profileAddressActions: {
        gap: 12,
        marginBottom: 20
    },
    profileAddressButton: {
        backgroundColor: '#3339B0',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center'
    },
    profileAddressButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF'
    },
    profileAddressButtonSecondary: {
        backgroundColor: '#F8F9FF',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#3339B0'
    },
    profileAddressButtonSecondaryText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#3339B0'
    },
    backToAddressesButton: {
        alignItems: 'center',
        paddingVertical: 12
    },
    backToAddressesButtonText: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '500'
    },
    // Стили для пустого состояния
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20
    },
    emptyStateText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333333',
        textAlign: 'center',
        marginBottom: 8
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
        lineHeight: 20
    }
}); 