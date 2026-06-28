import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useAssistantChatNavigation } from '../../../hooks/useAssistantChatNavigation';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { ChatBackground } from '@entities/chat/ui/ChatBackground';
import { HeaderWithBackButton } from '@shared/ui/HeaderWithBackButton';
import { useOpenManagerChat } from '@features/help/hooks/useOpenManagerChat';
import { useChatKeyboard } from '@screens/chat/hooks/useChatKeyboard';
import { useTabBar } from '@widgets/navigation/context';
import { getImageUrl } from '@shared/api/api';
import { useAiAssistant } from '../../../hooks/useAiAssistant';
import { ASSISTANT_CHAT_TITLE } from '../../../constants';

const resolveProductImage = (product) => {
    if (!product) return null;
    const img = Array.isArray(product.images) ? product.images[0] : (product.image || null);
    return img ? getImageUrl(img) : null;
};

const formatProductPrice = (product) => {
    const value = product?.price ?? product?.boxPrice;
    if (value === null || value === undefined || value === '') return null;
    return `${Number(value).toLocaleString('ru-RU')} ₽`;
};

const TAB_BAR_HEIGHT = 80;

/**
 * Экран диалога с ИИ-помощником поддержки.
 * Оформлен в стиле обычного чата (DirectChatScreen): фон-обои, «пузыри»
 * с хвостиками и поддержка тёмной темы.
 */
export const AssistantChatScreen = () => {
    const route = useRoute();
    const roomId = route.params?.roomId ?? null;
    const fromScreen = route.params?.fromScreen ?? null;
    const [input, setInput] = React.useState('');
    const [attachedProduct, setAttachedProduct] = React.useState(route.params?.product ?? null);
    const listRef = useRef(null);
    const insets = useSafeAreaInsets();
    const { hideTabBar, showTabBar, isTabBarVisible } = useTabBar();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const { messages, sending, loadingHistory, escalationSuggested, sendQuestion } = useAiAssistant(roomId);
    const { handleGoBack } = useAssistantChatNavigation(fromScreen, attachedProduct);
    const { openManagerChat, loading: openingManager } = useOpenManagerChat('Assistant');
    const {
        keyboardVisible,
        composerContainerStyle,
        keyboardAvoidingBehavior,
        keyboardAvoidingOffset,
    } = useChatKeyboard(insets, {
        headerOffset: 64,
        androidVerticalOffset: 84,
        enableKeyboardGap: true,
    });

    useEffect(() => {
        hideTabBar();
        return () => showTabBar();
    }, [hideTabBar, showTabBar]);

    useFocusEffect(
        useCallback(() => {
            hideTabBar();
            return () => showTabBar();
        }, [hideTabBar, showTabBar])
    );

    const inputBarBottomPadding = useMemo(() => {
        if (keyboardVisible) return 8;
        if (!isTabBarVisible) return Math.max(insets.bottom, 8);
        return TAB_BAR_HEIGHT + insets.bottom;
    }, [keyboardVisible, isTabBarVisible, insets.bottom]);

    const scrollToEnd = useCallback(() => {
        requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }, []);

    const handleSend = useCallback(() => {
        const text = input.trim();
        if (!text || sending) return;
        const attachment = attachedProduct ? { productId: attachedProduct.id, product: attachedProduct } : null;
        setInput('');
        setAttachedProduct(null);
        sendQuestion(text, attachment);
        scrollToEnd();
    }, [input, sending, attachedProduct, sendQuestion, scrollToEnd]);

    const renderItem = useCallback(({ item }) => {
        const isUser = item.role === 'user';

        if (item.type === 'product') {
            const image = resolveProductImage(item.product);
            const price = formatProductPrice(item.product);
            return (
                <View style={[styles.bubbleRow, isUser ? styles.rowUser : styles.rowBot]}>
                    <View style={[styles.bubbleWrapper, isUser && styles.bubbleWrapperUser]}>
                        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot, styles.productBubble]}>
                            {image ? (
                                <Image source={{ uri: image }} style={styles.productImage} resizeMode="cover" />
                            ) : (
                                <View style={[styles.productImage, styles.productImagePlaceholder]}>
                                    <Icon name="image" size={22} color={colors.textTertiary} />
                                </View>
                            )}
                            <View style={styles.productInfo}>
                                <Text style={styles.productName} numberOfLines={2}>
                                    {item.product?.name || 'Товар'}
                                </Text>
                                {price ? <Text style={styles.productPrice}>{price}</Text> : null}
                            </View>
                        </View>
                    </View>
                </View>
            );
        }

        return (
            <View style={[styles.bubbleRow, isUser ? styles.rowUser : styles.rowBot]}>
                <View style={[styles.bubbleWrapper, isUser && styles.bubbleWrapperUser]}>
                    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
                        {item.pending ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <Text style={styles.bubbleText}>{item.content}</Text>
                        )}
                        {isUser ? (
                            <View style={styles.ownTailContainer}>
                                <View style={styles.ownTailTriangle} />
                            </View>
                        ) : (
                            <View style={styles.otherTailContainer}>
                                <View style={styles.otherTailTriangle} />
                            </View>
                        )}
                    </View>
                </View>
            </View>
        );
    }, [styles, colors.primary]);

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right']}>
            <HeaderWithBackButton title={ASSISTANT_CHAT_TITLE} onBackPress={handleGoBack} />
            <ChatBackground>
                <View style={styles.chatContent}>
                    {loadingHistory && (
                        <View style={styles.historyLoader}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    )}
                    <FlatList
                        ref={listRef}
                        data={messages}
                        keyExtractor={(item) => String(item.id)}
                        renderItem={renderItem}
                        style={styles.flex}
                        contentContainerStyle={styles.listContent}
                        onContentSizeChange={scrollToEnd}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
                    />

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : keyboardAvoidingBehavior}
                        keyboardVerticalOffset={keyboardAvoidingOffset}
                        enabled
                    >
                        <View style={composerContainerStyle}>
                            {escalationSuggested && (
                                <TouchableOpacity
                                    style={styles.escalateButton}
                                    onPress={openManagerChat}
                                    disabled={openingManager}
                                    activeOpacity={0.8}
                                >
                                    <Icon name="support-agent" size={20} color="#fff" />
                                    <Text style={styles.escalateText}>
                                        {openingManager ? 'Открываем чат...' : 'Передать оператору'}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {attachedProduct && (
                                <View style={styles.attachmentChip}>
                                    {resolveProductImage(attachedProduct) ? (
                                        <Image
                                            source={{ uri: resolveProductImage(attachedProduct) }}
                                            style={styles.attachmentImage}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={[styles.attachmentImage, styles.productImagePlaceholder]}>
                                            <Icon name="image" size={18} color={colors.textTertiary} />
                                        </View>
                                    )}
                                    <View style={styles.attachmentInfo}>
                                        <Text style={styles.attachmentLabel} numberOfLines={1}>
                                            Вопрос о товаре
                                        </Text>
                                        <Text style={styles.attachmentName} numberOfLines={1}>
                                            {attachedProduct.name || 'Товар'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.attachmentRemove}
                                        onPress={() => setAttachedProduct(null)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Icon name="close" size={18} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            )}

                            <View style={[styles.inputBar, { paddingBottom: inputBarBottomPadding }]}>
                                <TextInput
                                    style={styles.input}
                                    value={input}
                                    onChangeText={setInput}
                                    placeholder={attachedProduct ? 'Спросите что-нибудь о товаре...' : 'Напишите вопрос...'}
                                    placeholderTextColor={colors.textTertiary}
                                    keyboardAppearance={isDark ? 'dark' : 'light'}
                                    multiline
                                    maxLength={4000}
                                    editable={!sending}
                                    onFocus={scrollToEnd}
                                />
                                <TouchableOpacity
                                    style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
                                    onPress={handleSend}
                                    disabled={!input.trim() || sending}
                                    activeOpacity={0.8}
                                >
                                    <Icon name="send" size={22} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </ChatBackground>
        </SafeAreaView>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    chatContent: { flex: 1 },
    flex: { flex: 1 },
    listContent: { paddingHorizontal: 8, paddingTop: 8, paddingBottom: 12 },
    historyLoader: { paddingVertical: 12, alignItems: 'center' },

    bubbleRow: { marginBottom: 8, flexDirection: 'row' },
    rowUser: { justifyContent: 'flex-end' },
    rowBot: { justifyContent: 'flex-start' },

    bubbleWrapper: { maxWidth: '85%', alignItems: 'flex-start' },
    bubbleWrapperUser: { alignItems: 'flex-end' },

    bubble: {
        paddingHorizontal: 9,
        paddingVertical: 7,
        borderRadius: 7.5,
        minWidth: 60,
        position: 'relative',
        shadowColor: 'rgba(0, 0, 0, 0.13)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 0.5,
        elevation: 1,
    },
    bubbleUser: { backgroundColor: isDark ? '#005C4B' : '#DCF8C6' },
    bubbleBot: { backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF' },
    bubbleText: {
        fontSize: 16,
        lineHeight: 21,
        color: isDark ? colors.textPrimary : '#000000',
    },

    ownTailContainer: {
        position: 'absolute',
        top: 0,
        right: -6,
        width: 20,
        height: 20,
        overflow: 'hidden',
    },
    ownTailTriangle: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 0,
        height: 0,
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderBottomWidth: 10,
        borderTopWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: isDark ? '#005C4B' : '#DCF8C6',
        borderTopColor: 'transparent',
        transform: [{ rotate: '180deg' }],
    },
    otherTailContainer: {
        position: 'absolute',
        top: 0,
        left: -3,
        width: 20,
        height: 20,
        overflow: 'hidden',
    },
    otherTailTriangle: {
        position: 'absolute',
        bottom: 0,
        left: -1,
        width: 0,
        height: 0,
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderBottomWidth: 10,
        borderTopWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: isDark ? colors.surfaceElevated : '#FFFFFF',
        borderTopColor: 'transparent',
        transform: [{ rotate: '180deg' }],
    },

    productBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
        minWidth: 220,
    },
    productImage: {
        width: 54,
        height: 54,
        borderRadius: 8,
        marginRight: 10,
        backgroundColor: isDark ? colors.surface : '#EFEFEF',
    },
    productImagePlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    productInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    productName: {
        fontSize: 15,
        fontWeight: '600',
        color: isDark ? colors.textPrimary : '#000000',
        marginBottom: 2,
    },
    productPrice: {
        fontSize: 14,
        color: isDark ? colors.textSecondary : '#444444',
    },

    attachmentChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? colors.surfaceElevated : '#F0F2F5',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginHorizontal: 12,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    attachmentImage: {
        width: 38,
        height: 38,
        borderRadius: 6,
        marginRight: 10,
        backgroundColor: isDark ? colors.surface : '#E4E4E4',
    },
    attachmentInfo: {
        flex: 1,
    },
    attachmentLabel: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '600',
    },
    attachmentName: {
        fontSize: 14,
        color: colors.textPrimary,
    },
    attachmentRemove: {
        padding: 4,
        marginLeft: 6,
    },

    escalateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 20,
        marginBottom: 8,
    },
    escalateText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 8,
    },

    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.divider,
        backgroundColor: colors.surface,
    },
    input: {
        flex: 1,
        maxHeight: 120,
        minHeight: 40,
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 10,
        backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceSecondary,
        borderRadius: 20,
        fontSize: 16,
        color: colors.textPrimary,
    },
    sendButton: {
        marginLeft: 8,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: { opacity: 0.5 },
});
