import React, { useMemo } from 'react';
import { ImageViewerModal } from '@shared/ui/ImageViewerModal';
import { getImageUrl } from '@shared/api/api';

export const FeedbackPhotoViewerModal = ({
    photos = [],
    initialIndex = 0,
    visible = false,
    onClose,
}) => {
    const normalizedPhotos = useMemo(() => {
        if (!Array.isArray(photos)) {
            return [];
        }
        return photos.map(photo => getImageUrl(photo) || photo).filter(Boolean);
    }, [photos]);

    return (
        <ImageViewerModal
            visible={visible}
            imageList={normalizedPhotos}
            initialIndex={initialIndex}
            onClose={onClose}
        />
    );
};
