import { useState, useCallback } from 'react';

/**
 * Хук для управления CustomAlert
 * 
 * @example
 * const { showAlert, AlertComponent } = useCustomAlert();
 * 
 * // В компоненте
 * return (
 *   <View>
 *     {AlertComponent}
 *     <Button onPress={() => showAlert({
 *       type: 'success',
 *       title: 'Успех!',
 *       message: 'Операция выполнена',
 *     })} />
 *   </View>
 * );
 */
export const useCustomAlert = () => {
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        type: 'info',
        title: '',
        message: '',
        buttons: [],
        autoClose: false,
        autoCloseDuration: 3000,
        showCloseButton: true,
        customIcon: null,
    });

    /**
     * Показать Alert
     * 
     * @param {Object} config - Конфигурация Alert
     * @param {string} config.type - Тип: 'success', 'error', 'warning', 'info', 'confirm'
     * @param {string} config.title - Заголовок
     * @param {string} config.message - Сообщение
     * @param {Array} config.buttons - Массив кнопок [{text, style, onPress, icon}]
     * @param {boolean} config.autoClose - Авто-закрытие
     * @param {number} config.autoCloseDuration - Длительность до авто-закрытия (мс)
     * @param {boolean} config.showCloseButton - Показывать кнопку закрытия
     * @param {string} config.customIcon - Кастомная иконка
     */
    const showAlert = useCallback((config) => {
        setAlertConfig({
            visible: true,
            type: config.type || 'info',
            title: config.title || '',
            message: config.message || '',
            buttons: config.buttons || [],
            autoClose: config.autoClose || false,
            autoCloseDuration: config.autoCloseDuration || 3000,
            showCloseButton: config.showCloseButton !== false,
            customIcon: config.customIcon || null,
        });
    }, []);

    /**
     * Скрыть Alert
     */
    const hideAlert = useCallback(() => {
        setAlertConfig((prev) => ({
            ...prev,
            visible: false,
        }));
    }, []);

    /**
     * Быстрые методы для разных типов Alert
     */
    const showSuccess = useCallback((title, message, buttons) => {
        showAlert({ type: 'success', title, message, buttons, autoClose: !buttons });
    }, [showAlert]);

    const showError = useCallback((title, message, buttons) => {
        showAlert({ type: 'error', title, message, buttons });
    }, [showAlert]);

    const showWarning = useCallback((title, message, buttons) => {
        showAlert({ type: 'warning', title, message, buttons });
    }, [showAlert]);

    const showInfo = useCallback((title, message, buttons) => {
        showAlert({ type: 'info', title, message, buttons });
    }, [showAlert]);

    const showConfirm = useCallback((title, message, onConfirm, onCancel) => {
        showAlert({
            type: 'confirm',
            title,
            message,
            buttons: [
                {
                    text: 'Отмена',
                    style: 'cancel',
                    onPress: onCancel,
                },
                {
                    text: 'Подтвердить',
                    style: 'primary',
                    onPress: onConfirm,
                },
            ],
        });
    }, [showAlert]);

    return {
        showAlert,
        hideAlert,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showConfirm,
        alertConfig,
        setAlertConfig,
    };
};


