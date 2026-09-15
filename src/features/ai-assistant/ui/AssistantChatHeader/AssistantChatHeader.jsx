import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { AssistantAvatar } from '../AssistantAvatar';
import { ASSISTANT_CHAT_TITLE, ASSISTANT_SUBTITLE } from '../../constants';

/**
 * Шапка чата с ИИ-помощником — по образцу ChatHeader в DirectChatScreen.
 */
export const AssistantChatHeader = memo(({ onBackPress, onProfilePress }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const textColor = isDark ? colors.textPrimary : '#000000';

    return (
        <View style={styles.wrapper}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={onBackPress}
                    style={styles.backButton}
                    activeOpacity={0.6}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Text style={[styles.backButtonText, { color: textColor }]}>←</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onProfilePress}
                    activeOpacity={0.7}
                    style={styles.avatarContainer}
                >
                    <AssistantAvatar size={35} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.chatInfoContainer}
                    activeOpacity={0.7}
                    onPress={onProfilePress}
                >
                    <Text style={styles.chatName} numberOfLines={1}>
                        {ASSISTANT_CHAT_TITLE}
                    </Text>
                    <Text style={styles.chatStatus} numberOfLines={1}>
                        {ASSISTANT_SUBTITLE}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

const createStyles = (colors, isDark) => StyleSheet.create({
    wrapper: {
        position: 'relative',
        zIndex: 1000,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? colors.surface : '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 8,
        height: 64,
        width: '100%',
    },
    backButton: {
        padding: 12,
        marginRight: 4,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 44,
        minHeight: 44,
    },
    backButtonText: {
        fontSize: 26,
        fontWeight: '400',
        textAlign: 'center',
        lineHeight: 26,
    },
    avatarContainer: {
        marginRight: 8,
    },
    chatInfoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    chatName: {
        fontSize: 16,
        fontWeight: '500',
        color: isDark ? colors.textPrimary : '#000000',
        marginBottom: 2,
    },
    chatStatus: {
        fontSize: 11,
        color: isDark ? colors.textSecondary : '#666666',
    },
});

export default AssistantChatHeader;
