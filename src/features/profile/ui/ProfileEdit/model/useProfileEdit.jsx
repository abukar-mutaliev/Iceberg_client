import { useState, useEffect, useRef } from 'react';
import { Keyboard, Platform, Alert, PermissionsAndroid } from 'react-native';
import { updateProfile, fetchProfile } from '@entities/profile';
import { normalize } from '@shared/lib/normalize';

export const useProfileEdit = (profile, dispatch, navigation) => {
    const scrollViewRef = useRef(null);
    const nameInputRef = useRef(null);
    const phoneInputRef = useRef(null);

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [gender, setGender] = useState('');
    const [showGenderDropdown, setShowGenderDropdown] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [currentScrollPosition, setCurrentScrollPosition] = useState(0);

    const [isNameEditable, setIsNameEditable] = useState(false);
    const [isPhoneEditable, setIsPhoneEditable] = useState(false);

    useEffect(() => {
        if (profile?.user) {
            setName(profile.name || '');
            setPhone(profile.phone || '');
            setGender(profile.user.gender || '');
        } else if (profile) {
            setName(profile.name || '');
            setPhone(profile.phone || '');
            setGender(profile.gender || '');
        }
    }, [profile]);

    const activateField = (fieldRef, setEditableState, scrollToPosition = 0) => {
        setEditableState(true);
        setTimeout(() => {
            if (fieldRef.current) {
                fieldRef.current.focus();
                if (scrollViewRef.current && scrollToPosition > 0) {
                    scrollViewRef.current.scrollTo({
                        y: scrollToPosition,
                        animated: true,
                    });
                }
            }
        }, 100);
    };

    const handleNameEditPress = () => {
        if (isNameEditable) {
            setIsNameEditable(false);
            Keyboard.dismiss();
        } else {
            activateField(nameInputRef, setIsNameEditable, 0);
        }
    };

    const handlePhoneEditPress = () => {
        if (isPhoneEditable) {
            setIsPhoneEditable(false);
            Keyboard.dismiss();
        } else {
            activateField(phoneInputRef, setIsPhoneEditable, normalize(100));
        }
    };

    const handleGoBack = () => {
        Keyboard.dismiss();
        navigation.goBack();
    };

    const toggleGenderDropdown = () => {
        setShowGenderDropdown(!showGenderDropdown);
        Keyboard.dismiss();
    };

    const handleSaveProfile = async () => {
        Keyboard.dismiss();
        try {
            setIsSaving(true);
            await dispatch(
                updateProfile({
                    name,
                    phone,
                    gender,
                })
            ).unwrap();
            navigation.goBack();
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Ошибка', 'Не удалось сохранить изменения');
        } finally {
            setIsSaving(false);
        }
    };

    const handleScroll = (event) => {
        setCurrentScrollPosition(event.nativeEvent.contentOffset.y);
    };

    return {
        name,
        phone,
        gender,
        scrollViewRef,
        nameInputRef,
        phoneInputRef,
        isNameEditable,
        isPhoneEditable,
        showGenderDropdown,
        isSaving,
        isUploading,
        setName,
        setPhone,
        setGender,
        setShowGenderDropdown,
        handleNameEditPress,
        handlePhoneEditPress,
        handleGoBack,
        toggleGenderDropdown,
        handleSaveProfile,
        handleScroll,
    };
};
