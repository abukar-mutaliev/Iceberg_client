import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useProfileAvatar } from '../lib/useProfileAvatar';
import { ProfileAvatarView } from './ProfileAvatarView';
import { useAuth } from "@entities/auth/hooks/useAuth";
import { PermissionInfoModal } from '@entities/chat/ui/Composer/components/PermissionInfoModal';

export const ProfileAvatar = ({
    profile,
    size = 118,
    centered = true,
    editable = false,
    useCurrentUserFallback = true
}) => {
    const { currentUser } = useAuth();
    const [key, setKey] = useState(0);

    const {
        avatarUri,
        isUploading,
        uploadProgress,
        modalVisible,
        setModalVisible,
        closeAvatarModal,
        beginCloseAvatarModal,
        debugText,
        handleChooseAvatar,
        loadAvatarUri,
        permissionModalVisible,
        setPermissionModalVisible,
        permissionType,
    } = useProfileAvatar(profile, currentUser, editable, useCurrentUserFallback);

    useEffect(() => {
        // Принудительно обновляем компонент при изменении avatarUri
        if (avatarUri) {
            setKey(prevKey => prevKey + 1);
        }
    }, [avatarUri, loadAvatarUri, profile]);

    return (
        <>
            <ProfileAvatarView
                key={key}
                avatarUri={avatarUri}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                size={size}
                centered={centered}
                editable={editable}
                onAvatarPress={handleChooseAvatar}
                modalVisible={modalVisible}
                setModalVisible={setModalVisible}
                onCloseModal={closeAvatarModal}
                onBeginClose={beginCloseAvatarModal}
                debugText={__DEV__ ? debugText : null}
            />
            <PermissionInfoModal
                visible={permissionModalVisible}
                onClose={() => setPermissionModalVisible(false)}
                type={permissionType}
            />
        </>
    );
};

