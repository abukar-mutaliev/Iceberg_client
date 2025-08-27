import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily } from '@app/styles/GlobalStyles';

export const ValidationMessage = ({
                                      message,
                                      type = 'error',
                                      style
                                  }) => {
    if (!message) return null;

    const getMessageStyle = () => {
        switch (type) {
            case 'error':
                return styles.errorMessage;
            case 'warning':
                return styles.warningMessage;
            case 'success':
                return styles.successMessage;
            case 'info':
                return styles.infoMessage;
            default:
                return styles.errorMessage;
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'error':
                return '❌';
            case 'warning':
                return '⚠️';
            case 'success':
                return '✅';
            case 'info':
                return 'ℹ️';
            default:
                return '❌';
        }
    };

    return (
        <View style={[styles.container, style]}>
            <Text style={styles.icon}>{getIcon()}</Text>
            <Text style={[styles.message, getMessageStyle()]}>{message}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: normalize(4),
        paddingVertical: normalize(2),
    },
    icon: {
        fontSize: normalizeFont(12),
        marginRight: normalize(4),
    },
    message: {
        fontSize: normalizeFont(12),
        fontFamily: FontFamily.sFProText,
        flex: 1,
    },
    errorMessage: {
        color: '#f44336',
    },
    warningMessage: {
        color: '#FFC107',
    },
    successMessage: {
        color: '#4CAF50',
    },
    infoMessage: {
        color: Color.blue2,
    },
});

export default ValidationMessage;