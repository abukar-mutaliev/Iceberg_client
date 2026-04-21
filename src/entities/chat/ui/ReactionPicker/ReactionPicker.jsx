import React, {useMemo} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, ScrollView, Dimensions} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useTheme} from '@app/providers/themeProvider/ThemeProvider';

const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * Компонент для выбора эмодзи реакции
 */
export const ReactionPicker = ({visible, onClose, onEmojiSelect, onShowMoreEmojis, position}) => {
    const {colors, isDark} = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    // Популярные эмодзи для реакций (как в WhatsApp)
    const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '🔥'];
    
    const handleEmojiSelect = (emoji) => {
        if (onEmojiSelect) {
            onEmojiSelect(emoji);
        }
        onClose();
    };
    
    const handleShowMore = () => {
        // НЕ вызываем onClose здесь, потому что это очистит messageId
        // onShowMoreEmojis сам закроет ReactionPicker и откроет FullEmojiPicker
        if (onShowMoreEmojis) {
            onShowMoreEmojis(); // Открываем полное окно эмодзи
        }
    };
    
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable 
                style={[
                    styles.overlay,
                    !position && styles.overlayCentered,
                    position && styles.overlayAbsolute
                ]} 
                onPress={onClose}
                activeOpacity={1}
            >
                <View 
                    style={[
                        styles.container,
                        position && {
                            position: 'absolute',
                            // Центрируем по горизонтали относительно позиции сообщения
                            left: Math.max(10, Math.min(position.x - 200, SCREEN_WIDTH - 420)),
                            // Размещаем над сообщением
                            top: position.y - 65,
                        }
                    ]}
                    onStartShouldSetResponder={() => true}
                >
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        style={styles.scrollView}
                    >
                        {emojis.map((emoji, index) => (
                            <TouchableOpacity
                                key={`${emoji}-${index}`}
                                style={styles.emojiButton}
                                onPress={() => handleEmojiSelect(emoji)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.emoji}>{emoji}</Text>
                            </TouchableOpacity>
                        ))}
                        
                        {/* Пустое место для кнопки + справа */}
                        {onShowMoreEmojis && <View style={styles.spacer} />}
                    </ScrollView>
                    
                    {/* Кнопка + зафиксирована справа */}
                    {onShowMoreEmojis && (
                        <TouchableOpacity
                            style={styles.fixedMoreButton}
                            onPress={handleShowMore}
                            activeOpacity={0.7}
                        >
                            <Icon name="plus-circle" size={26} color={isDark ? colors.textSecondary : '#666'} />
                        </TouchableOpacity>
                    )}
                </View>
            </Pressable>
        </Modal>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    overlayCentered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayAbsolute: {
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
    },
    container: {
        position: 'relative',
        backgroundColor: isDark ? colors.surfaceElevated : 'white',
        borderRadius: 30,
        paddingVertical: 6,
        paddingHorizontal: 4,
        maxWidth: SCREEN_WIDTH - 40, // Отступы по 20px с каждой стороны
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: isDark ? 0.5 : 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    scrollView: {
        flexGrow: 0,
    },
    scrollContent: {
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingRight: 52, // Отступ справа для кнопки +
    },
    emojiButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        marginHorizontal: 2,
    },
    emoji: {
        fontSize: 24,
    },
    spacer: {
        width: 4, // Небольшой отступ перед кнопкой +
    },
    fixedMoreButton: {
        position: 'absolute',
        right: 4,
        top: 6,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: isDark ? colors.surface : '#f0f0f0',
    },
});

