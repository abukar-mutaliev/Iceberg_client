import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Pressable} from 'react-native';

/**
 * Компонент для выбора эмодзи из расширенного списка
 */
export const FullEmojiPicker = ({visible, onClose, onEmojiSelect}) => {
    // Расширенный список популярных эмодзи
    const emojiCategories = {
        'Популярные': ['👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '🔥', '💯', '✨', '🎉', '💪'],
        'Лица': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓'],
        'Жесты': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
        'Сердца': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
        'Символы': ['🔥', '✨', '💫', '⭐', '🌟', '💯', '✅', '❌', '⚠️', '❗', '❓', '💤', '💢', '💬', '💭'],
    };
    
    const handleEmojiSelect = (emoji) => {
        if (onEmojiSelect) {
            onEmojiSelect(emoji);
        }
        onClose();
    };
    
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable 
                style={styles.overlay} 
                onPress={onClose}
                activeOpacity={1}
            >
                <View 
                    style={styles.container}
                    onStartShouldSetResponder={() => true}
                >
                    {/* Заголовок */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Выберите реакцию</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {/* Список эмодзи по категориям */}
                    <ScrollView style={styles.scrollView}>
                        {Object.entries(emojiCategories).map(([category, emojis]) => (
                            <View key={category} style={styles.categoryContainer}>
                                <Text style={styles.categoryTitle}>{category}</Text>
                                <View style={styles.emojiGrid}>
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
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    closeButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
    },
    closeButtonText: {
        fontSize: 20,
        color: '#666',
    },
    scrollView: {
        padding: 16,
    },
    categoryContainer: {
        marginBottom: 24,
    },
    categoryTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 12,
    },
    emojiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    emojiButton: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: '#f9f9f9',
    },
    emoji: {
        fontSize: 28,
    },
});


