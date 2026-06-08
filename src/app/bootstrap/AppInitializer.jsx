import React, { useRef, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { useChatSocket } from '@entities/chat/hooks/useChatSocket';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { useAppBootstrap } from './useAppBootstrap';
import { useAppResumeAuthSync } from './useAppResumeAuthSync';
import { useAppUpdateCheck } from './useAppUpdateCheck';

export const AppInitializer = ({ children }) => {
    const [error, setError] = useState(null);
    const hasInitialized = useRef(false);
    const { colors } = useTheme();

    useAuth();
    const dispatch = useDispatch();

    useChatSocket();
    useAppUpdateCheck();
    useAppResumeAuthSync(dispatch);
    useAppBootstrap(dispatch, hasInitialized);

    if (error) {
        return (
            <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
                <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
                <Button
                    title="Повторить"
                    color={colors.primary}
                    onPress={() => {
                        setError(null);
                        hasInitialized.current = false;
                    }}
                />
            </View>
        );
    }

    return children;
};

const styles = StyleSheet.create({
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8f8f8',
    },
    errorText: {
        textAlign: 'center',
        marginBottom: 20,
        fontSize: 16,
        color: '#666',
        lineHeight: 22,
    },
});
