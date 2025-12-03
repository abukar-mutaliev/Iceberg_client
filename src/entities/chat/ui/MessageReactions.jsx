import React, {useState, useMemo, useRef, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Pressable, Animated} from 'react-native';
import {PanGestureHandler, State} from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Компонент для отображения реакций на сообщение
 */
export const MessageReactions = ({
    reactions = [],
    currentUserId,
    onReactionPress,
    onReactionLongPress,
    messageId,
    style
}) => {
    const [detailsVisible, setDetailsVisible] = useState(false);
    const [selectedEmoji, setSelectedEmoji] = useState(null);
    
    // Анимация для модального окна
    const slideAnim = useRef(new Animated.Value(0)).current;
    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    
    // Функция для получения имени пользователя
    const getUserName = (user) => {
        if (!user) return 'Пользователь';
        
        if (user.client?.name) return user.client.name;
        if (user.admin?.name) return user.admin.name;
        if (user.employee?.name) return user.employee.name;
        if (user.supplier?.contactPerson) return user.supplier.contactPerson;
        
        return user.email?.split('@')[0] || 'Пользователь';
    };
    
    // Функция для получения аватара пользователя
    const getUserAvatar = (user) => {
        return user?.avatar || null;
    };
    
    // Группируем реакции по эмодзи
    const groupedReactions = useMemo(() => {
        if (!reactions || reactions.length === 0) return [];
        
        const grouped = reactions.reduce((acc, reaction) => {
            if (!acc[reaction.emoji]) {
                acc[reaction.emoji] = {
                    emoji: reaction.emoji,
                    count: 0,
                    users: [],
                    hasCurrentUser: false
                };
            }
            acc[reaction.emoji].count++;
            
            // Сохраняем полные данные пользователя
            acc[reaction.emoji].users.push({
                id: reaction.userId,
                name: getUserName(reaction.user),
                user: reaction.user // Сохраняем полный объект пользователя
            });
            
            if (reaction.userId === currentUserId) {
                acc[reaction.emoji].hasCurrentUser = true;
            }
            
            return acc;
        }, {});
        
        return Object.values(grouped);
    }, [reactions, currentUserId]);
    
    const handleReactionPress = (emoji) => {
        // При нажатии открываем модальное окно с деталями (как в WhatsApp)
        // Если реакция не выбрана, выбираем первую по умолчанию
        if (!selectedEmoji || selectedEmoji !== emoji) {
            setSelectedEmoji(emoji);
        }
        setDetailsVisible(true);
    };
    
    const handleReactionLongPress = (emoji) => {
        // Long press добавляет/удаляет реакцию
        if (onReactionLongPress) {
            onReactionLongPress(emoji);
        } else if (onReactionPress) {
            // Если нет отдельного обработчика для long press, используем обычный
            onReactionPress(emoji);
        }
    };
    
    // Анимация открытия модального окна
    useEffect(() => {
        if (detailsVisible) {
            // Сбрасываем значения перед анимацией
            translateY.setValue(0);
            slideAnim.setValue(0);
            overlayOpacity.setValue(0);
            
            // Анимация открытия
            Animated.parallel([
                Animated.timing(overlayOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 1,
                    tension: 65,
                    friction: 11,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [detailsVisible]);
    
    const closeDetails = () => {
        // Запускаем анимацию закрытия
        Animated.parallel([
            Animated.timing(overlayOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setDetailsVisible(false);
            setSelectedEmoji(null);
            translateY.setValue(0);
        });
    };
    
    // Обработка свайпа вниз для закрытия
    const onGestureEvent = Animated.event(
        [{ nativeEvent: { translationY: translateY } }],
        { useNativeDriver: true }
    );
    
    const onHandlerStateChange = ({ nativeEvent }) => {
        if (nativeEvent.state === State.END) {
            const { translationY, velocityY } = nativeEvent;
            const shouldClose = translationY > 100 || velocityY > 500;
            
            if (shouldClose) {
                closeDetails();
            } else {
                // Возвращаем в исходное положение
                Animated.spring(translateY, {
                    toValue: 0,
                    tension: 65,
                    friction: 11,
                    useNativeDriver: true,
                }).start();
            }
        }
    };
    
    // Интерполяция для анимации
    const modalTranslateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [600, 0],
    });
    
    const modalOpacity = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });
    
    // Инициализация выбранной реакции при открытии модального окна
    useEffect(() => {
        if (detailsVisible && !selectedEmoji && groupedReactions.length > 0) {
            setSelectedEmoji(groupedReactions[0].emoji);
        }
    }, [detailsVisible, groupedReactions.length]);
    
    const selectedReactionDetails = useMemo(() => {
        if (!selectedEmoji) {
            // Если реакция не выбрана, показываем первую по умолчанию
            return groupedReactions.length > 0 ? groupedReactions[0] : null;
        }
        return groupedReactions.find(r => r.emoji === selectedEmoji) || (groupedReactions.length > 0 ? groupedReactions[0] : null);
    }, [selectedEmoji, groupedReactions]);
    
    if (groupedReactions.length === 0) {
        return null;
    }
    
    const isSingleReaction = groupedReactions.length === 1;
    const singleReaction = isSingleReaction ? groupedReactions[0] : null;
    const isSingleEmoji = isSingleReaction && singleReaction.count === 1;

    return (
        <>
            <View style={[styles.container, style]}>
                <View style={[
                    styles.reactionsBubble,
                    isSingleEmoji && styles.reactionsBubbleSingle,
                    isSingleReaction && !isSingleEmoji && styles.reactionsBubbleSingleWithCount
                ]}>
                    {groupedReactions.map((reaction, index) => (
                        <TouchableOpacity
                            key={`${reaction.emoji}-${index}`}
                            style={[
                                styles.reactionItem,
                                isSingleEmoji && styles.reactionItemSingle
                            ]}
                            onPress={() => handleReactionPress(reaction.emoji)}
                            onLongPress={() => handleReactionLongPress(reaction.emoji)}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.emoji,
                                isSingleEmoji && styles.emojiSingle
                            ]}>{reaction.emoji}</Text>
                            {reaction.count > 1 && (
                                <Text style={styles.count}>
                                    {reaction.count}
                                </Text>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
            
            {/* Модальное окно с деталями реакции (как в WhatsApp) */}
            <Modal
                visible={detailsVisible}
                transparent={true}
                animationType="none"
                onRequestClose={closeDetails}
            >
                <Animated.View 
                    style={[
                        styles.modalOverlay,
                        { opacity: overlayOpacity }
                    ]}
                >
                    <Pressable 
                        style={StyleSheet.absoluteFill}
                        onPress={closeDetails}
                    />
                    
                    <PanGestureHandler
                        onGestureEvent={onGestureEvent}
                        onHandlerStateChange={onHandlerStateChange}
                        activeOffsetY={10}
                        failOffsetX={[-50, 50]}
                    >
                        <Animated.View
                            style={[
                                styles.modalContent,
                                {
                                    transform: [
                                        { translateY: Animated.add(modalTranslateY, translateY) },
                                    ],
                                    opacity: modalOpacity,
                                }
                            ]}
                        >
                            {/* Handle для свайпа вниз */}
                            <View style={styles.modalHandleContainer}>
                                <View style={styles.modalHandle} />
                            </View>
                            
                            {/* Заголовок с кнопкой закрытия */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {reactions.length} {reactions.length === 1 ? 'реакция' : reactions.length < 5 ? 'реакции' : 'реакций'}
                                </Text>
                                <TouchableOpacity 
                                    style={styles.closeButton}
                                    onPress={closeDetails}
                                >
                                    <Icon name="close" size={24} color="#667781" />
                                </TouchableOpacity>
                            </View>
                        
                        {/* Список всех реакций с переключателями */}
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            style={styles.reactionsTabs}
                            contentContainerStyle={styles.reactionsTabsContent}
                        >
                            {groupedReactions.map((reaction) => (
                                <TouchableOpacity
                                    key={reaction.emoji}
                                    style={[
                                        styles.reactionTab,
                                        selectedEmoji === reaction.emoji && styles.reactionTabActive
                                    ]}
                                    onPress={() => setSelectedEmoji(reaction.emoji)}
                                >
                                    <Text style={styles.reactionTabEmoji}>{reaction.emoji}</Text>
                                    <Text style={[
                                        styles.reactionTabCount,
                                        selectedEmoji === reaction.emoji && styles.reactionTabCountActive
                                    ]}>
                                        {reaction.count}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        
                        {/* Список всех пользователей, поставивших реакции */}
                        <ScrollView 
                            style={styles.usersList}
                            showsVerticalScrollIndicator={true}
                        >
                            {reactions.map((reaction, index) => {
                                const userName = getUserName(reaction.user);
                                const userAvatar = getUserAvatar(reaction.user);
                                const isCurrentUser = reaction.userId === currentUserId;
                                
                                return (
                                    <TouchableOpacity 
                                        key={`${reaction.id || reaction.userId}-${index}`} 
                                        style={styles.userItem}
                                        onPress={isCurrentUser ? () => {
                                            handleReactionLongPress(reaction.emoji);
                                            closeDetails();
                                        } : undefined}
                                        activeOpacity={isCurrentUser ? 0.7 : 1}
                                    >
                                        <View style={styles.avatarContainer}>
                                            <Text style={styles.avatarText}>
                                                {userName.charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={styles.userInfo}>
                                            <View style={styles.userNameContainer}>
                                                <Text style={styles.userName}>
                                                    {isCurrentUser ? 'Вы' : userName}
                                                </Text>
                                                {isCurrentUser && (
                                                    <Text style={styles.deleteHint}>
                                                        Нажмите, чтобы удалить
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                        <Text style={styles.userReactionEmoji}>
                                            {reaction.emoji}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                        </Animated.View>
                    </PanGestureHandler>
                </Animated.View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    reactionsBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        paddingHorizontal: 5,
        paddingVertical: 3,
        minHeight: 22,
        // Тень для эффекта глубины (как в WhatsApp)
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        borderWidth: 0.5,
        borderColor: 'rgba(0, 0, 0, 0.08)',
    },
    reactionsBubbleSingle: {
        // Для одной реакции с одним эмодзи - идеальный круг
        borderRadius: 11,
        paddingHorizontal: 0,
        paddingVertical: 0,
        width: 22,
        height: 22,
        minHeight: 22,
        minWidth: 22,
        maxWidth: 22,
        maxHeight: 22,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 0,
    },
    reactionsBubbleSingleWithCount: {
        // Для одной реакции с количеством - немного меньше
        borderRadius: 14,
        paddingHorizontal: 5,
        paddingVertical: 3,
        minHeight: 20,
    },
    reactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 0,
        paddingHorizontal: 0,
    },
    reactionItemSingle: {
        marginHorizontal: 0,
        paddingHorizontal: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emoji: {
        fontSize: 14,
        lineHeight: 16,
    },
    emojiSingle: {
        fontSize: 14,
        lineHeight: 16,
    },
    count: {
        fontSize: 11,
        marginLeft: 4,
        color: '#667781',
        fontWeight: '600',
        minWidth: 14,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        width: '100%',
        maxHeight: '70%',
        paddingTop: 4,
        paddingBottom: 20,
    },
    modalHandleContainer: {
        alignItems: 'center',
        paddingVertical: 8,
        paddingTop: 8,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#C4C4C4',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E9EDEF',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '500',
        color: '#111B21',
    },
    closeButton: {
        padding: 4,
    },
    reactionsTabs: {
        borderBottomWidth: 1,
        borderBottomColor: '#E9EDEF',
        paddingVertical: 12,
    },
    reactionsTabsContent: {
        paddingHorizontal: 16,
        paddingVertical: 4,
    },
    reactionTab: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        minWidth: 48,
        height: 40,
        borderRadius: 20,
        marginRight: 8,
        backgroundColor: '#F0F2F5',
    },
    reactionTabActive: {
        backgroundColor: '#D9FDD3',
    },
    reactionTabEmoji: {
        fontSize: 22,
        marginRight: 4,
    },
    reactionTabCount: {
        fontSize: 13,
        fontWeight: '500',
        color: '#667781',
    },
    reactionTabCountActive: {
        color: '#00A884',
    },
    usersList: {
        maxHeight: 400,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        minHeight: 60,
    },
    avatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#DFE5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '500',
        color: '#54656F',
    },
    userInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    userNameContainer: {
        flexDirection: 'column',
    },
    userName: {
        fontSize: 16,
        color: '#111B21',
        fontWeight: '400',
        marginBottom: 2,
    },
    deleteHint: {
        fontSize: 13,
        color: '#667781',
        fontWeight: '400',
    },
    userReactionEmoji: {
        fontSize: 24,
        marginLeft: 8,
    },
});

