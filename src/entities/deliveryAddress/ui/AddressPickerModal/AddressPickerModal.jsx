import React, { useMemo, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    ActivityIndicator,
    Switch,
    TextInput,
    Keyboard,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
// Импортируем напрямую из API, чтобы избежать циклической зависимости
import { DeliveryAddressApi } from '../../api/deliveryAddressApi';
import { profileApi } from '@entities/profile/api/profileApi';
import { selectProfile, fetchProfile } from '@entities/profile';
import CustomButton from "@shared/ui/Button/CustomButton";
import { IconEdit } from '@shared/ui/Icon/Profile/IconEdit';
import IconDelete from '@shared/ui/Icon/Profile/IconDelete';
import { GlobalAlert } from '@shared/ui/CustomAlert';

const normalize = (size) => size;
const MAX_ADDRESSES = 3;

// Серверные правила валидации адреса (см. server/src/validators/deliveryAddress.validator.js).
// Дублируем их здесь, чтобы дать пользователю понятную ошибку до запроса.
const ADDRESS_MIN_LENGTH = 10;
const ADDRESS_MAX_LENGTH = 500;
const TITLE_MIN_LENGTH = 2;
const TITLE_MAX_LENGTH = 100;

// Извлекает читаемый текст ошибки из ответа сервера (express-validator).
// Поддерживает формат { errors: [{ path, msg, value }], message }.
const extractServerErrorMessage = (error, fallback = 'Не удалось выполнить запрос') => {
    const data = error?.response?.data;
    if (!data) {
        return error?.message || fallback;
    }

    if (Array.isArray(data.errors) && data.errors.length > 0) {
        const lines = data.errors
            .map((err) => {
                const text = err?.msg || err?.message;
                if (!text) return null;
                return data.errors.length > 1 ? `• ${text}` : text;
            })
            .filter(Boolean);

        if (lines.length > 0) {
            return lines.join('\n');
        }
    }

    return data.message || error?.message || fallback;
};

export const AddressPickerModal = ({ 
    visible, 
    onClose, 
    onAddressSelected,
    currentAddress = null 
}) => {
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark, insets), [colors, isDark, insets]);
    const profile = useSelector(selectProfile);
    const authUser = useSelector((state) => state.auth?.user);
    const [loading, setLoading] = useState(false);
    const [addresses, setAddresses] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showNewAddressForm, setShowNewAddressForm] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);
    const [showProfileAddressOption, setShowProfileAddressOption] = useState(false);
    const [isTextInputFocused, setIsTextInputFocused] = useState(false);
    const [showDistrictPicker, setShowDistrictPicker] = useState(false);

    const dismissKeyboard = () => {
        Keyboard.dismiss();
        setIsTextInputFocused(false);
    };

    const handleClose = () => {
        dismissKeyboard();
        onClose();
    };
    
    const [addressForm, setAddressForm] = useState({
        title: '',
        address: '',
        districtId: '',
        isDefault: false
    });

    // Текущий выбранный район в форме нового адреса. Сравнение через String,
    // чтобы корректно работало и с числовым id из бэка, и со строковым в форме.
    const selectedDistrict = useMemo(
        () => districts.find((d) => String(d?.id) === String(addressForm.districtId)) || null,
        [districts, addressForm.districtId]
    );

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
    // Берём полный объект района напрямую из профиля — бэкенд возвращает
    // его уже с именем (см. UserService.getCurrentUserProfile с include district: true),
    // не нужно ждать загрузки списка районов и делать дополнительный lookup.
    const profileDistrict = profile?.client?.district ||
                           profile?.district ||
                           profile?.user?.client?.district ||
                           profile?.user?.district ||
                           authUser?.client?.district ||
                           authUser?.district ||
                           null;
    const hasProfileAddress = profileAddress && profileAddress.trim().length > 0;

    // Локально проверяем адрес из профиля по серверным правилам — нужно, чтобы
    // подсветить карточку красным и сразу написать пользователю, что не так.
    const profileAddressIssue = useMemo(() => {
        if (!hasProfileAddress) return null;

        const trimmed = (profileAddress || '').trim();
        const reasons = [];

        if (trimmed.length < ADDRESS_MIN_LENGTH) {
            reasons.push(
                `Адрес слишком короткий (${trimmed.length} из ${ADDRESS_MIN_LENGTH} символов).`
            );
        } else if (trimmed.length > ADDRESS_MAX_LENGTH) {
            reasons.push(
                `Адрес слишком длинный (${trimmed.length} из ${ADDRESS_MAX_LENGTH} символов).`
            );
        }
        if (!profileDistrictId) {
            reasons.push('В профиле не выбран район доставки.');
        }

        if (reasons.length === 0) return null;
        return reasons.join(' ') + ' Дополните адрес в профиле и попробуйте снова.';
    }, [hasProfileAddress, profileAddress, profileDistrictId]);

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
            // Резолвим район в таком порядке:
            //   1) готовый объект из профиля (бэкенд уже отдаёт name);
            //   2) lookup в загруженном списке районов с приведением типов
            //      (на случай, если districtId придёт строкой / id в districts — числом);
            //   3) null (тогда отрисуется "Район: не указан").
            // Без этого на iOS, где порядок setState иногда даёт первый кадр с пустым
            // districts, район из профиля просто не отображался.
            const resolvedDistrict =
                profileDistrict ||
                (profileDistrictId != null
                    ? districts.find(
                          (d) => Number(d?.id) === Number(profileDistrictId)
                      )
                    : null) ||
                null;

            const profileAddressObj = {
                id: 'profile', // Специальный ID для адреса из профиля
                title: 'Адрес из профиля',
                address: profileAddress,
                districtId: profileDistrictId,
                district: resolvedDistrict,
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
        // ВАЖНО: В деп-листе только visible. Раньше сюда попадали
        // profile/authUser/dispatch/currentAddress, и при их изменении
        // эффект перезапускался — на iOS это вызывало повторный
        // loadAddresses() поверх ещё не завершившегося первого, и
        // "новый адрес" из ответа первого запроса перезатирался пустым
        // ответом из-за гонки. Достаточно срабатывать только на открытие.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    // Раньше здесь был дополнительный useEffect с loadAddresses() на изменение
    // profile.client.address / profile.client.districtId. Он создавал гонку
    // с первым loadAddresses() при открытии модалки: второй запрос мог
    // перезаписать districts пустым массивом раньше, чем доходил ответ
    // первого запроса, и пикер района залипал в "Загрузке". Связку с
    // профилем достаточно делать внутри основного loadAddresses() —
    // он и так вызывается при visible=true и читает актуальный profile.

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

    const loadDistricts = async () => {
        try {
            const districtsResponse = await DeliveryAddressApi.getDistricts();
            const districtsData = districtsResponse?.data || districtsResponse || [];
            setDistricts(Array.isArray(districtsData) ? districtsData : []);
            return Array.isArray(districtsData) ? districtsData : [];
        } catch (error) {
            console.error('Ошибка загрузки районов:', error);
            // Не показываем алерт здесь — он будет показан общей логикой loadAddresses,
            // если упали оба запроса. Если упали только районы, пользователь увидит
            // сообщение прямо в пикере.
            setDistricts([]);
            throw error;
        }
    };

    const loadAddresses = async () => {
        try {
            setLoading(true);
            // Promise.allSettled, чтобы падение одного запроса не убивало весь экран:
            // например, если districts по какой-то причине вернёт ошибку,
            // мы всё равно покажем существующие адреса, а пикер района
            // покажет понятное сообщение с кнопкой «Повторить».
            const [addressesResult, districtsResult] = await Promise.allSettled([
                DeliveryAddressApi.getAddresses(),
                DeliveryAddressApi.getDistricts(),
            ]);

            let addressesData = [];
            if (addressesResult.status === 'fulfilled') {
                const raw = addressesResult.value;
                addressesData = raw?.data || raw || [];
            }

            let districtsData = [];
            if (districtsResult.status === 'fulfilled') {
                const raw = districtsResult.value;
                districtsData = raw?.data || raw || [];
            }

            // Обновляем связанные с профилем адреса при изменении профиля
            if (hasProfileAddress && profileAddress && Array.isArray(addressesData)) {
                addressesData = await updateLinkedAddresses(addressesData);
            }

            // addresses перезаписываем только при успехе — иначе сетевой
            // сбой убьёт уже отрисованный список (на iOS это создавало
            // ощущение "новый адрес пропал после переоткрытия пикера").
            if (addressesResult.status === 'fulfilled') {
                setAddresses(Array.isArray(addressesData) ? addressesData : []);
            }
            // districts перезаписываем только при успехе по той же причине —
            // не хотим терять уже загруженный список районов из-за разовой ошибки.
            if (districtsResult.status === 'fulfilled') {
                setDistricts(Array.isArray(districtsData) ? districtsData : []);
            }

            // Если упали оба запроса — показываем алерт. Если упал только один,
            // пользователь увидит проблему точечно (пустой пикер района
            // или пустой список адресов).
            if (
                addressesResult.status === 'rejected' &&
                districtsResult.status === 'rejected'
            ) {
                const error =
                    addressesResult.reason || districtsResult.reason || new Error();
                console.error('Ошибка загрузки адресов и районов:', error);

                const isNetworkError =
                    error?.code === 'ERR_NETWORK' ||
                    error?.message === 'Network Error' ||
                    !error?.response;

                const message = isNetworkError
                    ? 'Нет связи с сервером. Проверьте подключение к интернету и попробуйте снова.'
                    : extractServerErrorMessage(error, 'Не удалось загрузить адреса');

                GlobalAlert.showError('Не удалось загрузить адреса', message);
            } else if (addressesResult.status === 'rejected') {
                console.error('Ошибка загрузки адресов:', addressesResult.reason);
            } else if (districtsResult.status === 'rejected') {
                console.error('Ошибка загрузки районов:', districtsResult.reason);
            }
        } catch (error) {
            console.error('Ошибка загрузки адресов:', error);
            const message = extractServerErrorMessage(error, 'Не удалось загрузить адреса');
            GlobalAlert.showError('Не удалось загрузить адреса', message);
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
        const trimmedTitle = (addressForm.title || '').trim();
        const trimmedAddress = (addressForm.address || '').trim();

        if (!trimmedTitle || !trimmedAddress || !addressForm.districtId) {
            GlobalAlert.showError('Ошибка', 'Заполните все обязательные поля');
            return;
        }

        // Локальная предпроверка по серверным правилам — даём понятный текст до запроса.
        const validationMessages = [];
        if (trimmedTitle.length < TITLE_MIN_LENGTH || trimmedTitle.length > TITLE_MAX_LENGTH) {
            validationMessages.push(
                `Название должно быть от ${TITLE_MIN_LENGTH} до ${TITLE_MAX_LENGTH} символов`
            );
        }
        if (
            trimmedAddress.length < ADDRESS_MIN_LENGTH ||
            trimmedAddress.length > ADDRESS_MAX_LENGTH
        ) {
            validationMessages.push(
                `Адрес должен быть от ${ADDRESS_MIN_LENGTH} до ${ADDRESS_MAX_LENGTH} символов (сейчас ${trimmedAddress.length})`
            );
        }
        if (validationMessages.length > 0) {
            const message = validationMessages.length > 1
                ? validationMessages.map((m) => `• ${m}`).join('\n')
                : validationMessages[0];
            GlobalAlert.showError('Проверьте поля', message);
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
            const message = extractServerErrorMessage(error, 'Не удалось сохранить адрес');
            GlobalAlert.showError('Не удалось сохранить адрес', message);
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
                    const message = extractServerErrorMessage(error, 'Не удалось удалить адрес');
                    GlobalAlert.showError('Не удалось удалить адрес', message);
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
            GlobalAlert.showError(
                'Адрес в профиле не заполнен',
                'Откройте раздел «Профиль» и заполните адрес доставки, чтобы использовать его здесь.'
            );
            return;
        }

        // Локальная предпроверка адреса из профиля по серверным правилам:
        // здесь пользователь не может отредактировать значение прямо в этом окне,
        // поэтому нужно явно сказать, что именно поправить в профиле.
        const trimmedProfileAddress = (profileAddress || '').trim();
        const profileIssues = [];

        if (trimmedProfileAddress.length < ADDRESS_MIN_LENGTH) {
            profileIssues.push(
                `Адрес в профиле слишком короткий (${trimmedProfileAddress.length} символов из минимум ${ADDRESS_MIN_LENGTH}). Укажите полный адрес: город, улица, дом, квартира.`
            );
        } else if (trimmedProfileAddress.length > ADDRESS_MAX_LENGTH) {
            profileIssues.push(
                `Адрес в профиле слишком длинный (${trimmedProfileAddress.length} символов из максимум ${ADDRESS_MAX_LENGTH}).`
            );
        }
        if (!profileDistrictId) {
            profileIssues.push('В профиле не выбран район доставки.');
        }

        if (profileIssues.length > 0) {
            const message = profileIssues.length > 1
                ? profileIssues.map((m) => `• ${m}`).join('\n')
                : profileIssues[0];
            GlobalAlert.showError(
                'Адрес из профиля нельзя использовать',
                `${message}\n\nОбновите адрес в разделе «Профиль» и попробуйте снова.`
            );
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
                address: trimmedProfileAddress,
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
            const message = extractServerErrorMessage(
                error,
                'Не удалось создать адрес из профиля'
            );
            GlobalAlert.showError(
                'Не удалось создать адрес из профиля',
                `${message}\n\nПроверьте адрес в разделе «Профиль» и попробуйте снова.`
            );
        } finally {
            setLoading(false);
        }
    };



    const renderAddressItem = (address) => {
        // Подсвечиваем красным адрес из профиля, который заведомо не пройдёт
        // серверную валидацию, и блокируем сохранение — чтобы пользователь
        // не упирался в непонятную ошибку 400.
        const hasProfileError = address.isFromProfile && !!profileAddressIssue;

        return (
            <View
                key={address.id}
                style={[
                    styles.addressItem,
                    selectedAddress?.id === address.id && styles.selectedAddressItem,
                    hasProfileError && styles.addressItemError
                ]}
            >
                <View style={styles.addressTopRow}>
                    <TouchableOpacity
                        style={styles.addressContent}
                        onPress={async () => {
                            // Если это адрес из профиля (id: 'profile'),
                            // и он не подходит — сразу показываем алерт с причиной,
                            // не делая бесполезный запрос на сервер.
                            if (address.id === 'profile' || address.isFromProfile) {
                                if (hasProfileError) {
                                    GlobalAlert.showError(
                                        'Адрес из профиля нельзя использовать',
                                        profileAddressIssue
                                    );
                                    return;
                                }
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
                                {hasProfileError && (
                                    <Text style={styles.errorIndicator}>⚠️</Text>
                                )}
                                <Text
                                    style={[
                                        styles.addressTitle,
                                        hasProfileError && styles.addressTitleError
                                    ]}
                                    numberOfLines={2}
                                >
                                    {address.title}
                                </Text>
                            </View>
                        </View>
                        <Text
                            style={[
                                styles.addressText,
                                hasProfileError && styles.addressTextError
                            ]}
                        >
                            {address.address}
                        </Text>
                        <Text
                            style={[
                                styles.districtText,
                                !address.district?.name && styles.districtTextMissing
                            ]}
                        >
                            Район: {address.district?.name || 'не указан'}
                        </Text>
                    </TouchableOpacity>

                    {/* Кнопки управления адресом */}
                    <View style={styles.addressActions}>
                        {!address.isFromProfile && (
                            <>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => handleEditAddress(address)}
                                >
                                    <IconEdit width={20} height={20} color={colors.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.deleteButton]}
                                    onPress={() => handleDeleteAddress(address)}
                                >
                                    <IconDelete width={18} height={18} color={colors.error} />
                                </TouchableOpacity>
                            </>
                        )}
                        {address.isFromProfile && !hasProfileError && (
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleCreateFromProfileAddress()}
                            >
                                <Text style={styles.actionButtonText}>💾</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {hasProfileError && (
                    <View style={styles.errorMessageBox}>
                        <Text style={styles.errorMessageText}>
                            {profileAddressIssue}
                        </Text>
                    </View>
                )}

                {(address.isDefault || selectedAddress?.id === address.id || address.isFromProfile) && (
                    <View style={styles.addressBadgesRow}>
                        {address.isDefault && (
                            <Text style={styles.defaultBadge}>По умолчанию</Text>
                        )}
                        {selectedAddress?.id === address.id && (
                            <Text style={styles.selectedBadge}>Выбран</Text>
                        )}
                        {address.isFromProfile && !hasProfileError && (
                            <Text style={styles.profileBadge}>👤 Из профиля</Text>
                        )}
                        {address.isFromProfile && hasProfileError && (
                            <Text style={styles.profileBadgeError}>👤 Из профиля · нужно исправить</Text>
                        )}
                    </View>
                )}
            </View>
        );
    };


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
            
            <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Название *</Text>
                <TextInput
                    style={styles.inputField}
                    placeholder="Дом, Работа, и т.д."
                    placeholderTextColor={colors.textTertiary}
                    value={addressForm.title}
                    onChangeText={(text) => setAddressForm(prev => ({ ...prev, title: text }))}
                    onFocus={() => setIsTextInputFocused(true)}
                    onBlur={() => setIsTextInputFocused(false)}
                    keyboardAppearance={colors.keyboardAppearance}
                    selectionColor={colors.primary}
                    selectTextOnFocus={false}
                />
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Адрес *</Text>
                <TextInput
                    style={[styles.inputField, styles.multilineInput]}
                    placeholder="Введите полный адрес"
                    placeholderTextColor={colors.textTertiary}
                    value={addressForm.address}
                    onChangeText={(text) => setAddressForm(prev => ({ ...prev, address: text }))}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    onFocus={() => setIsTextInputFocused(true)}
                    onBlur={() => setIsTextInputFocused(false)}
                    keyboardAppearance={colors.keyboardAppearance}
                    selectionColor={colors.primary}
                    selectTextOnFocus={false}
                    scrollEnabled={false}
                />
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Район *</Text>
                <TouchableOpacity
                    style={styles.districtPickerButton}
                    activeOpacity={0.7}
                    onPress={() => {
                        // Перед открытием выпадающего списка убираем клавиатуру —
                        // иначе она перекроет половину списка районов на iOS.
                        Keyboard.dismiss();
                        setIsTextInputFocused(false);
                        setShowDistrictPicker(true);
                    }}
                >
                    <Text
                        style={[
                            styles.districtPickerButtonText,
                            !selectedDistrict && styles.districtPickerPlaceholder,
                        ]}
                        numberOfLines={1}
                    >
                        {selectedDistrict ? selectedDistrict.name : 'Выберите район из списка'}
                    </Text>
                    <Text style={styles.districtPickerChevron}>▾</Text>
                </TouchableOpacity>
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
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={addressForm.isDefault ? colors.textInverse : colors.surfaceSecondary}
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
                            handleClose();
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
            onRequestClose={handleClose}
        >
            <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Выбор адреса доставки</Text>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.loadingText}>Загрузка...</Text>
                    </View>
                ) : (
                    // KeyboardAvoidingView нужен именно для iOS: на нём клавиатура
                    // не двигает контент сама, и без этой обёртки чипы района и кнопка
                    // «Создать адрес» оказывались под клавиатурой.
                    <KeyboardAvoidingView
                        style={styles.keyboardAvoiding}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                    >
                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.contentContainer}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                    >
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
                    </KeyboardAvoidingView>
                )}

                {/* Выпадающий список районов. Рендерим как абсолютный overlay
                    внутри текущей модалки — это надёжнее, чем вложенный Modal
                    (на iOS нативный Modal-в-Modal иногда конфликтует с клавиатурой
                    и анимацией закрытия родительской модалки). */}
                {showDistrictPicker && (
                    <View style={styles.districtPickerOverlay}>
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={() => setShowDistrictPicker(false)}
                        />
                        <View style={styles.districtPickerSheet}>
                            <View style={styles.districtPickerHeader}>
                                <Text style={styles.districtPickerTitle}>Выберите район</Text>
                                <TouchableOpacity
                                    onPress={() => setShowDistrictPicker(false)}
                                    style={styles.districtPickerCloseBtn}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Text style={styles.districtPickerCloseText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            {districts.length === 0 ? (
                                <View style={styles.districtPickerEmpty}>
                                    {loading ? (
                                        <>
                                            <ActivityIndicator size="small" color={colors.primary} />
                                            <Text style={styles.districtPickerEmptyText}>
                                                Загрузка списка районов...
                                            </Text>
                                        </>
                                    ) : (
                                        <>
                                            <Text style={styles.districtPickerEmptyText}>
                                                Не удалось загрузить список районов.
                                            </Text>
                                            <TouchableOpacity
                                                style={styles.districtPickerRetryBtn}
                                                onPress={() => {
                                                    loadDistricts().catch(() => {});
                                                }}
                                            >
                                                <Text style={styles.districtPickerRetryText}>
                                                    Повторить
                                                </Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            ) : (
                                <ScrollView
                                    style={styles.districtPickerList}
                                    keyboardShouldPersistTaps="handled"
                                    showsVerticalScrollIndicator
                                >
                                    {districts.map((district) => {
                                        const isSelected =
                                            String(addressForm.districtId) === String(district.id);
                                        return (
                                            <TouchableOpacity
                                                key={district.id}
                                                style={[
                                                    styles.districtPickerItem,
                                                    isSelected && styles.districtPickerItemSelected,
                                                ]}
                                                onPress={() => {
                                                    setAddressForm((prev) => ({
                                                        ...prev,
                                                        districtId: String(district.id),
                                                    }));
                                                    setShowDistrictPicker(false);
                                                }}
                                            >
                                                <Text
                                                    style={[
                                                        styles.districtPickerItemText,
                                                        isSelected &&
                                                            styles.districtPickerItemTextSelected,
                                                    ]}
                                                >
                                                    {district.name}
                                                </Text>
                                                {isSelected && (
                                                    <Text style={styles.districtPickerCheck}>✓</Text>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </View>
                    </View>
                )}
            </SafeAreaView>
        </Modal>
    );
};

const createStyles = (colors, isDark, insets) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background
    },
    keyboardAvoiding: {
        flex: 1,
    },
    contentContainer: {
        // Нижний отступ, чтобы при открытой клавиатуре в форме нового адреса
        // были видны и чипы района, и кнопка «Создать адрес».
        paddingBottom: 32,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: insets.top + 12,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary
    },
    closeButton: {
        padding: 8
    },
    closeButtonText: {
        fontSize: 18,
        color: colors.textSecondary
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
        color: colors.textPrimary
    },
    profileButton: {
        backgroundColor: colors.success,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        marginRight: 8
    },
    profileButtonText: {
        fontSize: 14,
        color: colors.textInverse,
        fontWeight: '500'
    },
    addButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6
    },
    addButtonText: {
        fontSize: 14,
        color: colors.textInverse,
        fontWeight: '500'
    },
    addressItem: {
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.22 : 0.1,
        shadowRadius: isDark ? 6 : 2,
        elevation: isDark ? 3 : 2,
        paddingVertical: 12,
        gap: 2,
    },
    selectedAddressItem: {
        borderColor: colors.primary,
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
        backgroundColor: colors.surfaceSecondary,
        minWidth: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border
    },
    deleteButton: {
        backgroundColor: colors.errorSubtle,
        borderColor: colors.errorBorder
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
        color: colors.primary,
        fontWeight: 'bold',
        marginRight: 8
    },
    addressTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
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
        color: colors.primary,
        backgroundColor: isDark ? colors.surfaceSecondary : colors.primary + '12',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    profileBadge: {
        fontSize: 12,
        color: colors.textInverse,
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12
    },
    linkedBadge: {
        fontSize: 12,
        color: colors.textInverse,
        backgroundColor: '#FF9500',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12
    },
    defaultAddressContainer: {
        marginVertical: 16,
        padding: 16,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border
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
        color: colors.textPrimary,
        flex: 1
    },
    defaultAddressHint: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20
    },
    selectedBadge: {
        fontSize: 12,
        color: colors.textInverse,
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12
    },
    addressText: {
        fontSize: 14,
        color: colors.textPrimary,
        marginBottom: 4
    },
    districtText: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '600'
    },
    districtTextMissing: {
        color: colors.error || '#A52834',
        fontWeight: '500',
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
        color: colors.primary,
        fontWeight: '500'
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        flex: 1,
        textAlign: 'center'
    },
    inputContainer: {
        marginBottom: 16
    },
    inputField: {
        backgroundColor: colors.inputBackground,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.inputBorder,
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 48,
        fontSize: 16,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 8
    },
    inputText: {
        fontSize: 16,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    multilineInput: {
        minHeight: 96,
        textAlignVertical: 'top',
    },
    districtPickerButton: {
        backgroundColor: colors.inputBackground,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.inputBorder,
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    districtPickerButtonText: {
        flex: 1,
        fontSize: 16,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    districtPickerPlaceholder: {
        color: colors.textTertiary,
        fontWeight: '400',
    },
    districtPickerChevron: {
        marginLeft: 8,
        fontSize: 14,
        color: colors.textSecondary,
    },
    districtPickerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        zIndex: 1000,
        elevation: 10,
    },
    districtPickerSheet: {
        width: '100%',
        maxWidth: 420,
        maxHeight: '70%',
        backgroundColor: colors.surface,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 12,
    },
    districtPickerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    districtPickerTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    districtPickerCloseBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    districtPickerCloseText: {
        fontSize: 18,
        color: colors.textSecondary,
    },
    districtPickerList: {
        maxHeight: 420,
    },
    districtPickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    districtPickerItemSelected: {
        backgroundColor: colors.surfaceSecondary,
    },
    districtPickerItemText: {
        flex: 1,
        fontSize: 15,
        color: colors.textPrimary,
    },
    districtPickerItemTextSelected: {
        color: colors.primary,
        fontWeight: '600',
    },
    districtPickerCheck: {
        marginLeft: 12,
        fontSize: 16,
        color: colors.primary,
        fontWeight: '700',
    },
    districtPickerEmpty: {
        paddingHorizontal: 16,
        paddingVertical: 24,
        alignItems: 'center',
        gap: 8,
    },
    districtPickerEmptyText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    districtPickerRetryBtn: {
        marginTop: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: colors.primary,
    },
    districtPickerRetryText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textInverse,
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
        color: colors.primary
    },
    footer: {
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 12
    },
    footerHint: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
        marginBottom: 16
    },
    confirmButton: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textInverse
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
        color: colors.textPrimary,
        marginBottom: 16,
        textAlign: 'center'
    },
    profileAddressContent: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: colors.border
    },
    profileAddressText: {
        fontSize: 16,
        color: colors.textPrimary,
        fontWeight: '500',
        marginBottom: 8,
        lineHeight: 24
    },
    profileDistrictText: {
        fontSize: 14,
        color: colors.textSecondary,
        fontStyle: 'italic'
    },
    profileAddressActions: {
        gap: 12,
        marginBottom: 20
    },
    profileAddressButton: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center'
    },
    profileAddressButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textInverse
    },
    profileAddressButtonSecondary: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.primary
    },
    profileAddressButtonSecondaryText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.primary
    },
    backToAddressesButton: {
        alignItems: 'center',
        paddingVertical: 12
    },
    backToAddressesButtonText: {
        fontSize: 14,
        color: colors.primary,
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
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: 8
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20
    },

    // Подсветка карточки адреса с ошибкой (адрес из профиля,
    // не проходящий валидацию, или адрес, который сервер отверг).
    addressItemError: {
        backgroundColor: colors.errorSubtle || '#FDECEC',
        borderColor: colors.error || '#DC3545',
        borderWidth: 2,
    },
    errorIndicator: {
        fontSize: 16,
        marginRight: 8,
    },
    addressTitleError: {
        color: colors.error || '#DC3545',
    },
    addressTextError: {
        color: colors.error || '#DC3545',
    },
    errorMessageBox: {
        marginTop: 8,
        marginHorizontal: 16,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#FDECEC',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.errorBorder || '#F5C2C7',
    },
    errorMessageText: {
        fontSize: 13,
        lineHeight: 18,
        color: colors.error || '#A52834',
        fontWeight: '500',
    },
    profileBadgeError: {
        fontSize: 12,
        color: '#FFFFFF',
        backgroundColor: colors.error || '#DC3545',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
}); 