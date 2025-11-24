import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CustomAlert } from './CustomAlert';

const CustomAlertContext = createContext({
    showAlert: () => {},
    hideAlert: () => {},
    showSuccess: () => {},
    showError: () => {},
    showWarning: () => {},
    showInfo: () => {},
    showConfirm: () => {},
});

// Глобальный ref для использования вне React компонентов
let globalAlertRef = null;

export const setGlobalAlertRef = (ref) => {
    globalAlertRef = ref;
};

// Глобальные функции для использования в утилитах
export const GlobalAlert = {
    show: (config) => {
        if (globalAlertRef?.showAlert) {
            globalAlertRef.showAlert(config);
        }
    },
    showSuccess: (title, message, buttons) => {
        if (globalAlertRef?.showSuccess) {
            globalAlertRef.showSuccess(title, message, buttons);
        }
    },
    showError: (title, message, buttons) => {
        if (globalAlertRef?.showError) {
            globalAlertRef.showError(title, message, buttons);
        }
    },
    showWarning: (title, message, buttons) => {
        if (globalAlertRef?.showWarning) {
            globalAlertRef.showWarning(title, message, buttons);
        }
    },
    showInfo: (title, message, buttons) => {
        if (globalAlertRef?.showInfo) {
            globalAlertRef.showInfo(title, message, buttons);
        }
    },
    showConfirm: (title, message, onConfirm, onCancel) => {
        if (globalAlertRef?.showConfirm) {
            globalAlertRef.showConfirm(title, message, onConfirm, onCancel);
        }
    },
};

export const useGlobalAlert = () => {
    const context = useContext(CustomAlertContext);
    if (!context) {
        throw new Error('useGlobalAlert must be used within CustomAlertProvider');
    }
    return context;
};

// Алиас для удобства использования
export const useCustomAlert = useGlobalAlert;

export const CustomAlertProvider = ({ children }) => {
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

    const hideAlert = useCallback(() => {
        setAlertConfig((prev) => ({
            ...prev,
            visible: false,
        }));
    }, []);

    const showSuccess = useCallback((title, message, buttons) => {
        const shouldAutoClose = !(buttons && buttons.length > 0);
        console.log('✅ showSuccess вызван:', { 
            title, 
            buttonsCount: buttons?.length || 0, 
            shouldAutoClose 
        });
        showAlert({ 
            type: 'success', 
            title, 
            message, 
            buttons, 
            autoClose: shouldAutoClose, // НЕ закрывать автоматически если есть кнопки
            autoCloseDuration: 2500,
        });
    }, [showAlert]);

    const showError = useCallback((title, message, buttons) => {
        const shouldAutoClose = !(buttons && buttons.length > 0);
        console.log('❌ showError вызван:', { 
            title, 
            buttonsCount: buttons?.length || 0, 
            shouldAutoClose 
        });
        showAlert({ 
            type: 'error', 
            title, 
            message, 
            buttons,
            autoClose: shouldAutoClose, // НЕ закрывать автоматически если есть кнопки
            autoCloseDuration: 3000,
        });
    }, [showAlert]);

    const showWarning = useCallback((title, message, buttons) => {
        const shouldAutoClose = !(buttons && buttons.length > 0);
        console.log('⚠️ showWarning вызван:', { 
            title, 
            buttonsCount: buttons?.length || 0, 
            shouldAutoClose 
        });
        showAlert({ 
            type: 'warning', 
            title, 
            message, 
            buttons,
            autoClose: shouldAutoClose, // НЕ закрывать автоматически если есть кнопки
            autoCloseDuration: 3000,
        });
    }, [showAlert]);

    const showInfo = useCallback((title, message, buttons) => {
        const shouldAutoClose = !(buttons && buttons.length > 0);
        console.log('ℹ️ showInfo вызван:', { 
            title, 
            buttonsCount: buttons?.length || 0, 
            shouldAutoClose 
        });
        showAlert({ 
            type: 'info', 
            title, 
            message, 
            buttons,
            autoClose: shouldAutoClose, // НЕ закрывать автоматически если есть кнопки
            autoCloseDuration: 3000,
        });
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

    const contextValue = {
        showAlert,
        hideAlert,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showConfirm,
    };

    // Устанавливаем глобальный ref при монтировании
    useEffect(() => {
        setGlobalAlertRef(contextValue);
        return () => {
            setGlobalAlertRef(null);
        };
    }, [contextValue]);

    return (
        <CustomAlertContext.Provider value={contextValue}>
            {children}
            <CustomAlert
                visible={alertConfig.visible}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={alertConfig.buttons}
                onClose={hideAlert}
                autoClose={alertConfig.autoClose}
                autoCloseDuration={alertConfig.autoCloseDuration}
                showCloseButton={alertConfig.showCloseButton}
                customIcon={alertConfig.customIcon}
            />
        </CustomAlertContext.Provider>
    );
};


