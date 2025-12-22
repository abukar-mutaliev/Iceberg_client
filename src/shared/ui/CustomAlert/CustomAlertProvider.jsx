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

// Глобальное состояние для алерта (используется CustomAlertContainer)
let globalAlertState = {
    visible: false,
    type: 'info',
    title: '',
    message: '',
    buttons: [],
    autoClose: false,
    autoCloseDuration: 3000,
    showCloseButton: true,
    customIcon: null,
};
let globalAlertSetter = null;

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

    // Сохраняем setter для использования в CustomAlertContainer
    useEffect(() => {
        globalAlertSetter = setAlertConfig;
        return () => {
            globalAlertSetter = null;
        };
    }, []);

    const showAlert = useCallback((config) => {
        const newConfig = {
            visible: true,
            type: config.type || 'info',
            title: config.title || '',
            message: config.message || '',
            buttons: config.buttons || [],
            autoClose: config.autoClose || false,
            autoCloseDuration: config.autoCloseDuration || 3000,
            showCloseButton: config.showCloseButton !== false,
            customIcon: config.customIcon || null,
        };
        
        globalAlertState = newConfig;
        setAlertConfig(newConfig);
        
        // Также обновляем состояние в CustomAlertContainer если он существует
        if (globalAlertSetter) {
            globalAlertSetter(newConfig);
        }
    }, []);

    const hideAlert = useCallback(() => {
        setAlertConfig((prev) => ({
            ...prev,
            visible: false,
        }));
        
        globalAlertState = { ...globalAlertState, visible: false };
        
        if (globalAlertSetter) {
            globalAlertSetter((prev) => ({
                ...prev,
                visible: false,
            }));
        }
    }, []);

    const showSuccess = useCallback((title, message, buttons) => {
        const shouldAutoClose = !(buttons && buttons.length > 0);
        showAlert({ 
            type: 'success', 
            title, 
            message, 
            buttons, 
            autoClose: shouldAutoClose,
            autoCloseDuration: 2500,
        });
    }, [showAlert]);

    const showError = useCallback((title, message, buttons) => {
        const shouldAutoClose = !(buttons && buttons.length > 0);
        showAlert({ 
            type: 'error', 
            title, 
            message, 
            buttons,
            autoClose: shouldAutoClose,
            autoCloseDuration: 3000,
        });
    }, [showAlert]);

    const showWarning = useCallback((title, message, buttons) => {
        const shouldAutoClose = !(buttons && buttons.length > 0);
        showAlert({ 
            type: 'warning', 
            title, 
            message, 
            buttons,
            autoClose: shouldAutoClose,
            autoCloseDuration: 3000,
        });
    }, [showAlert]);

    const showInfo = useCallback((title, message, buttons) => {
        const shouldAutoClose = !(buttons && buttons.length > 0);
        showAlert({ 
            type: 'info', 
            title, 
            message, 
            buttons,
            autoClose: shouldAutoClose,
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
            {/* Рендерим CustomAlert прямо внутри провайдера */}
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

// Компонент для рендеринга алерта на верхнем уровне
// Должен быть внутри CustomAlertProvider для доступа к контексту
export const CustomAlertContainer = () => {
    const context = useContext(CustomAlertContext);
    
    // Если контекст не доступен, используем глобальное состояние (fallback)
    const [alertConfig, setAlertConfig] = useState(globalAlertState);

    // Синхронизируем с глобальным setter только если нет контекста
    useEffect(() => {
        if (!context || !context.showAlert) {
            globalAlertSetter = setAlertConfig;
            return () => {
                if (globalAlertSetter === setAlertConfig) {
                    globalAlertSetter = null;
                }
            };
        }
    }, [context]);

    const hideAlert = useCallback(() => {
        if (context && context.hideAlert) {
            // Используем контекст если доступен
            context.hideAlert();
        } else {
            // Fallback на глобальное состояние
            setAlertConfig((prev) => ({
                ...prev,
                visible: false,
            }));
            globalAlertState = { ...globalAlertState, visible: false };
        }
    }, [context]);

    // Если контекст доступен, берем данные из него через глобальное состояние
    // которое обновляется в showAlert
    return (
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
    );
};


