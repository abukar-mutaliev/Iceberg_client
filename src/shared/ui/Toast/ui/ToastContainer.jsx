import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { normalize } from '@shared/lib/normalize';
import { Toast } from './Toast';

let toastId = 0;

export const ToastContainer = () => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((config) => {
        const id = ++toastId;
        const toast = {
            id,
            ...config,
            onHide: () => {
                setToasts(prev => prev.filter(t => t.id !== id));
            },
        };

        setToasts(prev => [...prev, toast]);

        return id;
    }, []);

    const hideToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const hideAllToasts = useCallback(() => {
        setToasts([]);
    }, []);

    if (typeof window !== 'undefined') {
        window.showToast = showToast;
        window.hideToast = hideToast;
        window.hideAllToasts = hideAllToasts;
    }

    const topToasts = toasts.filter(t => (t.position || 'top') === 'top');
    const bottomToasts = toasts.filter(t => t.position === 'bottom');

    return (
        <View style={styles.root} pointerEvents="box-none">
            {topToasts.length > 0 && (
                <View style={styles.topStack} pointerEvents="box-none">
                    {topToasts.map((toast, index) => (
                        <View
                            key={toast.id}
                            style={[
                                styles.toastItem,
                                { marginTop: index === 0 ? 0 : normalize(10) },
                            ]}
                            pointerEvents="box-none"
                        >
                            <Toast {...toast} />
                        </View>
                    ))}
                </View>
            )}

            {bottomToasts.length > 0 && (
                <View style={styles.bottomStack} pointerEvents="box-none">
                    {bottomToasts.map((toast, index) => (
                        <View
                            key={toast.id}
                            style={[
                                styles.toastItem,
                                { marginTop: index === 0 ? 0 : normalize(10) },
                            ]}
                            pointerEvents="box-none"
                        >
                            <Toast {...toast} />
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2147483647,
        elevation: 2147483647,
    },
    topStack: {
        position: 'absolute',
        top: normalize(50),
        left: normalize(16),
        right: normalize(16),
    },
    bottomStack: {
        position: 'absolute',
        bottom: normalize(50),
        left: normalize(16),
        right: normalize(16),
    },
    toastItem: {
        width: '100%',
    },
});
