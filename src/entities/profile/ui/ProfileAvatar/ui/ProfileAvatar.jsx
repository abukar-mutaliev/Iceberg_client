import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useProfileAvatar } from '../lib/useProfileAvatar';
import { ProfileAvatarView } from './ProfileAvatarView';
import { useAuth } from "@entities/auth/hooks/useAuth";

export const ProfileAvatar = ({ profile, size = 118, centered = true, editable = false }) => {
    const { currentUser } = useAuth();
    const [key, setKey] = useState(0);

    const {
        avatarUri,
        isUploading,
        uploadProgress,
        modalVisible,
        setModalVisible,
        debugText,
        handleChooseAvatar,
        loadAvatarUri
    } = useProfileAvatar(profile, currentUser, editable);

    useEffect(() => {

        setKey(prevKey => prevKey + 1);
    }, [loadAvatarUri, profile]);

    return (
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
            debugText={__DEV__ ? debugText : null}
        />
    );
};

