import React from 'react';
import {ImageViewerModal} from "@shared/ui/ImageViewerModal";

/**
 * Компонент для просмотра аватара поставщика в модальном окне
 * @param {boolean} visible - видимость модального окна
 * @param {object} supplier - объект поставщика
 * @param {function} onClose - функция закрытия модального окна
 */
export const SupplierAvatarViewer = ({
                                         visible,
                                         supplier,
                                         onClose
                                     }) => {
    if (!supplier) return null;

    // Получаем URI аватара поставщика
    const avatarUri = supplier.user?.avatar ||
        supplier.avatar ||
        supplier.supplier?.avatar ||
        (supplier.images && supplier.images[0]);

    // Формируем заголовок
    const supplierName = supplier.supplier && supplier.supplier.companyName
        ? supplier.supplier.companyName
        : supplier.companyName || supplier.email || 'Поставщик';

    return (
        <ImageViewerModal
            visible={visible}
            imageUri={avatarUri}
            onClose={onClose}
            title={supplierName}
        />
    );
};