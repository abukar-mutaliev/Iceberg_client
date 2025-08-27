import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useProfileAvatar } from '../lib/useProfileAvatar';
import { ProfileAvatarView } from './ProfileAvatarView';
import { useAuth } from "@entities/auth/hooks/useAuth";

export const ProfileAvatar = ({ profile, size = 118, centered = true, editable = false }) => {
    const { currentUser } = useAuth();
    const [key, setKey] = useState(0);
    const componentKey = `profile-avatar-${currentUser?.id || 'no-user'}`;

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

    // Вызываем загрузку аватара при монтировании компонента
    useEffect(() => {
        const loaded = loadAvatarUri();
        console.log('ProfileAvatar - Результат загрузки аватара:', loaded);

        // Обновляем ключ, чтобы перерисовать компонент
        setKey(prevKey => prevKey + 1);
    }, [loadAvatarUri, profile]);

    // Дополнительное логирование для отладки
    useEffect(() => {
        console.log('ProfileAvatar - Текущий avatarUri:', avatarUri);
    }, [avatarUri]);

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

