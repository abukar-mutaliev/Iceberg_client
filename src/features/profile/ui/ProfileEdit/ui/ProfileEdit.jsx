import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { selectProfile, selectProfileLoading } from '@/entities/profile';
import { useNavigation } from '@react-navigation/native';
import { normalize, normalizeFont } from '@/shared/lib/normalize';
import { ProfileHeader } from "@shared/ui/ProfileHeader";
import { ProfileAvatar } from "@entities/profile/ui/ProfileAvatar";
import {useProfileEdit} from "@features/profile/ui/ProfileEdit/model/useProfileEdit";
import {ProfileFields} from "@features/profile/ui/ProfileEdit/ui/ProfileFields";
import {ProfileSaveButton} from "@features/profile/ui/ProfileEdit/ui/ProfileSaveButton";

export const ProfileEdit = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const profile = useSelector(selectProfile);
    const isLoading = useSelector(selectProfileLoading);

    const {
        name,
        phone,
        gender,
        scrollViewRef,
        isNameEditable,
        isPhoneEditable,
        isSaving,
        handleGoBack,
        handleScroll,
        handleSaveProfile,
        setName,
        setPhone,
        setGender,
        handleNameEditPress,
        handlePhoneEditPress,
    } = useProfileEdit(profile, dispatch, navigation);

    console.log('ProfileEdit render, profile:', profile);

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={[styles.loadingText, { fontSize: normalizeFont(14) }]}>Загрузка профиля...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ProfileHeader title="Редактирование профиля" onGoBack={handleGoBack} />

            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps="handled"
                onScroll={handleScroll}
                scrollEventThrottle={16}
            >
                <View style={styles.profileImageContainer}>
                    <ProfileAvatar
                        profile={profile}
                        size={118}
                        editable={true}
                    />
                </View>

                <View style={[styles.nameContainer, { marginTop: normalize(10), marginBottom: normalize(30) }]}>
                    <Text style={[styles.profileName, { fontSize: normalizeFont(18) }]}>
                        {profile?.name}
                    </Text>
                </View>

                <ProfileFields
                    name={name}
                    phone={phone}
                    gender={gender}
                    isNameEditable={isNameEditable}
                    isPhoneEditable={isPhoneEditable}
                    setName={setName}
                    setPhone={setPhone}
                    setGender={setGender}
                    handleNameEditPress={handleNameEditPress}
                    handlePhoneEditPress={handlePhoneEditPress}
                />

                <ProfileSaveButton
                    onPress={handleSaveProfile}
                    isSaving={isSaving}
                />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    contentContainer: {
        paddingBottom: 40,
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