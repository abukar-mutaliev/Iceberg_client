import React, {memo, useState, useCallback, useRef, useEffect} from 'react';
import {View, Text, Image, TouchableOpacity, StyleSheet} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useSelector} from 'react-redux';
import {ProductCard} from '@entities/product/ui/ProductCard';
import {StopCard} from '@entities/stop/ui/StopCard';
import {WarehouseCard} from '@entities/warehouse/ui/WarehouseCard';
import {CachedVoice} from './CachedVoice';
import {MessageErrorActions} from './MessageErrorActions';
import {ReplyPreview} from './ReplyPreview';
import {MessageReactions} from './ReactionPicker/MessageReactions';
import {getImageUrl} from '@shared/api/api';
import {CachedImage} from './CachedImage/CachedImage';
import ChatApi from '@entities/chat/api/chatApi';
import {selectIsProductDeleted} from '@entities/product/model/selectors';
import {PROCESSING_ROLE_LABELS} from '@entities/admin/lib/constants';

// ============= ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ =============

const Avatar = ({uri, onPress}) => {
    const imageSource = uri ? {uri} : null;

    return (
        <TouchableOpacity 
            style={styles.avatar} 
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
            disabled={!onPress}
        >
            {imageSource ? (
                <Image source={imageSource} style={styles.avatarImage} resizeMode="cover"/>
            ) : (
                <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarPlaceholderText}>👤</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const StatusTicks = memo(({status}) => {
    if (status === 'SENDING') {
        return (
            <View style={styles.ticksContainer}>
                <Text style={[styles.tick, styles.tickSending]}>✓</Text>
            </View>
        );
    }
    
    if (status === 'FAILED') {
        return (
            <View style={styles.ticksContainer}>
                <Text style={[styles.tick, styles.tickFailed]}>❌</Text>
            </View>
        );
    }
    
    if (status === 'read' || status === 'READ') {
        return (
            <View style={styles.ticksContainer}>
                <Text style={[styles.tick, styles.tickRead]}>✓</Text>
                <Text style={[styles.tick, styles.tickRead, styles.secondTick]}>✓</Text>
            </View>
        );
    }
    
    if (status === 'DELIVERED') {
        return (
            <View style={styles.ticksContainer}>
                <Text style={[styles.tick]}>✓</Text>
                <Text style={[styles.tick, styles.secondTick]}>✓</Text>
            </View>
        );
    }
    
    if (status === 'SENT') {
        return (
            <View style={styles.ticksContainer}>
                <Text style={[styles.tick]}>✓</Text>
            </View>
        );
    }

    return (
        <View style={styles.ticksContainer}>
            <Text style={[styles.tick]}>✓</Text>
        </View>
    );
});

const MeasureText = ({text, onLayout, style}) => {
    return (
        <Text
            style={[style, {position: 'absolute', opacity: 0, top: -1000}]}
            onLayout={onLayout}
        >
            {text}
        </Text>
    );
};

// ============= КОМПОНЕНТ ОПРОСА =============

const PollMessage = memo(({
    message,
    isOwn,
    time,
    status,
    avatarUri,
    showAvatar,
    isSelectionMode,
    isSelected,
    isContextMenuActive,
    hasContextMenu,
    canDelete,
    onToggleSelection,
    onLongPress,
    onAvatarPress,
    currentUserId,
    replyTo,
    onReplyPress,
    onReply,
    onAddReaction,
    showSenderName = false,
    senderName = null,
    senderId = null,
    senderNameColor = '#667781',
    onSenderNamePress = null,
    isForwarded = false
}) => {
    const [poll, setPoll] = useState(message.poll || null);
    const [isVoting, setIsVoting] = useState(false);

    useEffect(() => {
        if (message.poll) {
            setPoll(message.poll);
        }
    }, [message.poll]);
    
    useEffect(() => {
        if (message.poll) {
            const currentPollId = poll?.id;
            const messagePollId = message.poll.id;
            
            if (!poll || 
                messagePollId === currentPollId || 
                (currentPollId && typeof currentPollId === 'string' && currentPollId.startsWith('temp_')) ||
                (messagePollId && typeof messagePollId === 'number' && currentPollId !== messagePollId)) {
                setPoll(message.poll);
            }
        }
    }, [message]);

    const handleVote = useCallback(async (optionId) => {
        if (!poll || isVoting) return;

        const pollId = poll.id;
        if (!pollId || typeof pollId === 'string' && pollId.startsWith('temp_')) {
            return;
        }

        setIsVoting(true);
        try {
            const currentVotedOptionIds = poll.options
                ?.filter(opt => opt.votes?.some(vote => vote.userId === currentUserId))
                .map(opt => opt.id) || [];
            
            let newOptionIds = [];
            if (poll.allowMultiple) {
                if (currentVotedOptionIds.includes(optionId)) {
                    setIsVoting(false);
                    return;
                } else {
                    newOptionIds = [...currentVotedOptionIds, optionId];
                }
            } else {
                if (currentVotedOptionIds.length > 0) {
                    setIsVoting(false);
                    return;
                } else {
                    newOptionIds = [optionId];
                }
            }

            const result = await ChatApi.votePoll(pollId, newOptionIds);
            
            let updatedPoll = null;
            
            if (result?.data?.data?.poll) {
                updatedPoll = result.data.data.poll;
            } else if (result?.data?.poll) {
                updatedPoll = result.data.poll;
            } else if (result?.poll) {
                updatedPoll = result.poll;
            } else if (result?.data?.data && result.data.data.options) {
                updatedPoll = result.data.data;
            }
            
            if (updatedPoll && updatedPoll.options) {
                setPoll(updatedPoll);
            } else {
                if (message.poll && message.poll.id && typeof message.poll.id === 'number') {
                    setPoll(message.poll);
                }
            }
        } catch (error) {
            console.error('Ошибка голосования:', error);
        } finally {
            setIsVoting(false);
        }
    }, [poll, isVoting, currentUserId, message.poll]);

    if (!poll) {
        return (
            <BubbleContainer
                isOwn={isOwn}
                time={time}
                status={status}
                avatarUri={avatarUri}
                showAvatar={showAvatar}
                text={message.content || 'Опрос'}
                hasImage={false}
                isSelectionMode={isSelectionMode}
                isSelected={isSelected}
                isContextMenuActive={isContextMenuActive}
                canDelete={canDelete}
                onToggleSelection={onToggleSelection}
                onLongPress={onLongPress}
                onAvatarPress={onAvatarPress}
                replyTo={replyTo}
                onReplyPress={onReplyPress}
                onReply={onReply}
                isForwarded={isForwarded}
            >
                <Text style={styles.messageText}>Опрос недоступен</Text>
            </BubbleContainer>
        );
    }

    const totalVotes = poll.options?.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0) || 0;
    const userVotedOptions = poll.options?.filter(opt => 
        opt.votes?.some(vote => vote.userId === currentUserId)
    ) || [];
    const hasVoted = userVotedOptions.length > 0;

    return (
        <>
            <BubbleContainer
                isOwn={isOwn}
                time={time}
                status={status}
                avatarUri={avatarUri}
                showAvatar={showAvatar}
                text={poll.question}
                hasImage={false}
                isSelectionMode={isSelectionMode}
                isSelected={isSelected}
                isContextMenuActive={isContextMenuActive}
                hasContextMenu={hasContextMenu}
                canDelete={canDelete}
                onToggleSelection={onToggleSelection}
                onLongPress={onLongPress}
                onAvatarPress={onAvatarPress}
                replyTo={replyTo}
                onReplyPress={onReplyPress}
                onReply={onReply}
                showSenderName={showSenderName}
                senderName={senderName}
                senderId={senderId}
                senderNameColor={senderNameColor}
                onSenderNamePress={onSenderNamePress}
                isForwarded={isForwarded}
            >
                <View style={styles.pollContainer}>
                    <Text style={styles.pollQuestion}>{poll.question}</Text>
                    
                    <View style={styles.pollHeader}>
                        <Ionicons name="chatbubbles" size={16} color="#666" style={styles.pollHeaderIcon} />
                        <Text style={styles.pollHeaderText}>
                            {poll.allowMultiple ? 'Выберите один или несколько вариантов' : 'Выберите один вариант'}
                        </Text>
                    </View>

                    {poll.options?.map((option, index) => {
                        const voteCount = option.votes?.length || 0;
                        const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                        const isVoted = userVotedOptions.some(vo => vo.id === option.id);
                        const canVote = !hasVoted || (poll.allowMultiple && !isVoted);

                        return (
                            <TouchableOpacity
                                key={option.id || index}
                                style={[
                                    styles.pollOption,
                                    isVoted && styles.pollOptionVoted,
                                    !canVote && styles.pollOptionDisabled
                                ]}
                                onPress={() => canVote && handleVote(option.id)}
                                disabled={!canVote || isVoting}
                                activeOpacity={canVote ? 0.7 : 1}
                            >
                                {hasVoted && isVoted && (
                                    <View style={styles.pollOptionLeftBar} />
                                )}
                                
                                <View style={styles.pollOptionRow}>
                                    <View style={[
                                        styles.pollOptionRadio,
                                        isVoted && styles.pollOptionRadioVoted
                                    ]}>
                                        {isVoted && (
                                            <Ionicons name="checkmark" size={14} color="#fff" />
                                        )}
                                    </View>
                                    
                                    <View style={styles.pollOptionContent}>
                                        <Text style={[
                                            styles.pollOptionText,
                                            isVoted && styles.pollOptionTextVoted
                                        ]}>
                                            {option.text}
                                        </Text>
                                        {hasVoted && (
                                            <Text style={[
                                                styles.pollOptionVoteCount,
                                                isVoted && styles.pollOptionVoteCountVoted
                                            ]}>
                                                {percentage.toFixed(0)}%
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                    
                    {totalVotes > 0 && (
                        <View style={styles.pollFooter}>
                            <Ionicons name="person" size={12} color="#8696A0" />
                            <Text style={styles.pollFooterText}>
                                {totalVotes} {totalVotes === 1 ? 'голос' : totalVotes < 5 ? 'голоса' : 'голосов'}
                            </Text>
                        </View>
                    )}
                </View>
            </BubbleContainer>
            {message?.reactions && message.reactions.length > 0 && (
                <View style={[styles.reactionsWrapper, isOwn ? styles.reactionsWrapperOwn : styles.reactionsWrapperOther]}>
                    <MessageReactions
                        reactions={message.reactions}
                        currentUserId={currentUserId}
                        messageId={message.id}
                        onReactionPress={onAddReaction}
                        onReactionLongPress={onAddReaction}
                    />
                </View>
            )}
        </>
    );
});

// ============= КОМПОНЕНТ КОНТЕЙНЕРА ПУЗЫРЯ =============

const BubbleContainer = ({
    isOwn,
    showAvatar,
    avatarUri,
    children,
    status,
    time,
    text,
    hasImage,
    isSelectionMode = false,
    isSelected = false,
    isHighlighted = false,
    isPressed = false,
    isContextMenuActive = false,
    hasContextMenu = false,
    canDelete = false,
    onToggleSelection,
    onLongPress,
    onPress,
    onAvatarPress,
    replyTo,
    onReplyPress,
    onReply,
    currentUserId,
    showSenderName = false,
    senderName = null,
    senderId = null,
    senderNameColor = '#667781',
    onSenderNamePress = null,
    isForwarded = false
}) => {
    const containerRef = useRef(null);
    const [textWidth, setTextWidth] = useState(0);
    const [timeWidth, setTimeWidth] = useState(0);

    const handleTextLayout = (event) => {
        setTextWidth(event.nativeEvent.layout.width);
    };

    const handleTimeLayout = (event) => {
        setTimeWidth(event.nativeEvent.layout.width);
    };

    const timeSpace = isOwn ? timeWidth + 20 : timeWidth;
    const canFitInline = textWidth + timeSpace < 280;
    const isShortMessage = text && text.length < 30;
    const shouldShowTimeInline = !hasImage && canFitInline && isShortMessage;

    const handleLongPress = useCallback(() => {
        if (onLongPress && containerRef.current) {
            containerRef.current.measureInWindow((x, y, width, height) => {
                onLongPress({ x: x + width / 2, y: y + height / 2 });
            });
        } else if (onLongPress) {
            onLongPress();
        }
    }, [onLongPress]);

    const handlePress = useCallback(() => {
        if (isSelectionMode && onToggleSelection) {
            onToggleSelection();
        } else if (onPress && !isSelectionMode) {
            onPress();
        }
    }, [onToggleSelection, onPress, isSelectionMode]);

    // Для голосовых сообщений отключаем перехват нажатий в BubbleContainer
    const isVoiceMessage = text === '' && !hasImage && !replyTo;
    const canPress = isSelectionMode || (hasContextMenu && !isVoiceMessage) || (onPress && !isSelectionMode);

    return (
        <TouchableOpacity
            ref={containerRef}
            style={[
                styles.messageContainer,
                isOwn ? styles.ownMessageContainer : styles.otherMessageContainer,
                isSelectionMode && isSelected && styles.selectedMessageContainer,
                !isSelectionMode && isContextMenuActive && (isOwn ? styles.contextMenuActiveContainerOwn : styles.contextMenuActiveContainerOther),
                isPressed && !isSelectionMode && (isOwn ? styles.pressedBubbleOwn : styles.pressedBubbleOther)
            ]}
            onLongPress={handleLongPress}
            delayLongPress={150}
            onPress={canPress ? handlePress : undefined}
            activeOpacity={canPress ? 0.7 : 1}
            disabled={false}
        >
            {text && (
                <MeasureText
                    text={text}
                    style={styles.messageText}
                    onLayout={handleTextLayout}
                />
            )}
            <MeasureText
                text={time}
                style={styles.timestamp}
                onLayout={handleTimeLayout}
            />

            {!isOwn && showAvatar && (
                <View style={styles.avatarContainer}>
                    <Avatar uri={avatarUri} onPress={onAvatarPress}/>
                </View>
            )}

            {!isOwn && !showAvatar && <View style={styles.avatarSpacer}/>}

            <View style={[styles.bubbleWrapper, isOwn && styles.ownBubbleWrapper]}>
                    <View
                    style={[
                        styles.bubble, 
                        isOwn ? styles.ownBubble : styles.otherBubble,
                        isHighlighted && styles.highlightedBubble,
                        isPressed && !isSelectionMode && (isOwn ? styles.pressedBubbleInnerOwn : styles.pressedBubbleInnerOther)
                    ]}
                >
                    <View style={styles.messageContent}>
                        {showSenderName && senderName && !isOwn && senderId && onSenderNamePress && (
                            <TouchableOpacity
                                onPress={() => onSenderNamePress(senderId)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.senderName, { color: senderNameColor }]} numberOfLines={1}>
                                    {senderName}
                                </Text>
                            </TouchableOpacity>
                        )}
                        {showSenderName && senderName && !isOwn && (!senderId || !onSenderNamePress) && (
                            <Text style={[styles.senderName, { color: senderNameColor }]} numberOfLines={1}>
                                {senderName}
                            </Text>
                        )}
                        
                        {isForwarded && (
                            <View style={styles.forwardedLabel}>
                                <Ionicons name="arrow-redo" size={14} color="#8696A0" />
                                <Text style={styles.forwardedLabelText}>Переслано</Text>
                            </View>
                        )}
                        
                        {replyTo && (
                            <ReplyPreview
                                replyTo={replyTo}
                                onPress={() => onReplyPress?.(replyTo)}
                                isInMessage={true}
                                currentUserId={currentUserId}
                            />
                        )}
                        
                        {shouldShowTimeInline ? (
                            <View style={styles.inlineContainer}>
                                <View style={styles.textContainer}>
                                    {children}
                                </View>
                                <View style={styles.inlineTimeContainer}>
                                    <Text style={styles.timestamp}>{time}</Text>
                                    {isOwn && <StatusTicks status={status}/>}
                                </View>
                            </View>
                        ) : (
                            <>
                                <View style={styles.textContainer}>
                                    {children}
                                </View>
                                {time && (
                                    <View style={styles.messageFooter}>
                                        <Text style={styles.timestamp}>{time}</Text>
                                        {isOwn && <StatusTicks status={status}/>}
                                    </View>
                                )}
                            </>
                        )}
                    </View>

                    {isOwn ? (
                        <View style={styles.ownTailContainer}>
                            <View style={styles.ownTailTriangle}/>
                        </View>
                    ) : (
                        <View style={styles.otherTailContainer}>
                            <View style={styles.otherTailTriangle}/>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

// ============= КОМПОНЕНТ ТЕКСТОВОГО СООБЩЕНИЯ =============

const TextMessage = ({
    text,
    isOwn,
    time,
    status,
    avatarUri,
    showAvatar,
    isSelectionMode,
    isSelected,
    isHighlighted,
    isPressed = false,
    isContextMenuActive,
    hasContextMenu,
    canDelete,
    onToggleSelection,
    onLongPress,
    onPress,
    onAvatarPress,
    replyTo,
    onReplyPress,
    onReply,
    currentUserId,
    message,
    onAddReaction,
    onRemoveReaction,
    onShowReactionPicker,
    showSenderName = false,
    senderName = null,
    senderId = null,
    senderNameColor = '#667781',
    onSenderNamePress = null,
    isForwarded = false
}) => {
    const MAX_TEXT_LENGTH = 1000;
    
    // ИСПРАВЛЕНИЕ: используем только id сообщения для ключа
    const messageId = message?.id || 'unknown';
    
    // Локальное состояние для раскрытия текста
    const [isExpanded, setIsExpanded] = useState(false);
    
    // ИСПРАВЛЕНИЕ: проверяем нужна ли кнопка на основе длины текста
    const needsExpandButton = text && text.length > MAX_TEXT_LENGTH;
    
    // ИСПРАВЛЕНИЕ: сбрасываем состояние только при смене сообщения
    useEffect(() => {
        setIsExpanded(false);
    }, [messageId]);

    const handleExpandPress = useCallback((e) => {
        if (e && e.stopPropagation) {
            e.stopPropagation();
        }
        setIsExpanded(true);
    }, []);

    const renderTextContent = () => {
        // Если текст короткий или уже раскрыт - показываем полностью
        if (!needsExpandButton || isExpanded) {
            return <Text style={styles.messageText}>{text}</Text>;
        }

        // Обрезаем текст и показываем кнопку
        const truncatedText = text.substring(0, MAX_TEXT_LENGTH);
        
        return (
            <View>
                <Text style={styles.messageText}>
                    {truncatedText}
                    {!isExpanded && '...'}
                </Text>
                {!isExpanded && (
                    <TouchableOpacity
                        onPress={handleExpandPress}
                        activeOpacity={0.7}
                        style={styles.expandButton}
                        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                    >
                        <Text style={styles.expandButtonText}>Далее</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <>
            <BubbleContainer
                isOwn={isOwn}
                time={time}
                status={status}
                avatarUri={avatarUri}
                showAvatar={showAvatar}
                text={text}
                hasImage={false}
                isSelectionMode={isSelectionMode}
                isSelected={isSelected}
                isHighlighted={isHighlighted}
                isPressed={isPressed}
                isContextMenuActive={isContextMenuActive}
                hasContextMenu={hasContextMenu}
                canDelete={canDelete}
                onToggleSelection={onToggleSelection}
                onLongPress={onLongPress}
                onPress={onPress}
                onAvatarPress={onAvatarPress}
                replyTo={replyTo}
                onReplyPress={onReplyPress}
                onReply={onReply}
                currentUserId={currentUserId}
                showSenderName={showSenderName}
                senderName={senderName}
                senderId={senderId}
                senderNameColor={senderNameColor}
                onSenderNamePress={onSenderNamePress}
                isForwarded={isForwarded}
            >
                {renderTextContent()}
            </BubbleContainer>
            {message?.reactions && message.reactions.length > 0 && (
                <View style={[styles.reactionsWrapper, isOwn ? styles.reactionsWrapperOwn : styles.reactionsWrapperOther]}>
                    <MessageReactions
                        reactions={message.reactions}
                        currentUserId={currentUserId}
                        messageId={message.id}
                        onReactionPress={onAddReaction}
                        onReactionLongPress={onAddReaction}
                    />
                </View>
            )}
        </>
    );
};

// ============= ОСТАЛЬНЫЕ КОМПОНЕНТЫ СООБЩЕНИЙ =============

const ImageMessage = ({
    attachments = [],
    caption,
    isOwn,
    time,
    status,
    avatarUri,
    showAvatar,
    onImagePress,
    isSelectionMode,
    isSelected,
    isHighlighted,
    isPressed = false,
    isContextMenuActive,
    hasContextMenu,
    canDelete,
    onToggleSelection,
    onLongPress,
    onPress,
    onAvatarPress,
    replyTo,
    onReplyPress,
    onReply,
    currentUserId,
    message,
    onAddReaction,
    showSenderName = false,
    senderName = null,
    senderId = null,
    senderNameColor = '#667781',
    onSenderNamePress = null,
    isForwarded = false
}) => {
    const imageCount = attachments.length;
    
    // Определяем размеры сетки в зависимости от количества изображений (максимум 4)
    const getGridLayout = (count) => {
        if (count === 1) return { rows: 1, cols: 1 };
        if (count === 2) return { rows: 1, cols: 2 };
        if (count === 3) return { rows: 2, cols: 2 }; // 2 вверху, 1 внизу
        if (count >= 4) return { rows: 2, cols: 2 }; // Максимум 4 изображения в сетке
        return { rows: 2, cols: 2 };
    };
    
    const { rows, cols } = getGridLayout(imageCount);
    const containerWidth = 250;
    const gap = 2;
    const imageSize = (containerWidth - (gap * (cols - 1))) / cols;
    
    // Функция для определения позиции изображения в сетке
    const getImageStyle = (index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const isFirstRow = row === 0;
        const isLastRow = row === rows - 1;
        const isFirstCol = col === 0;
        const isLastCol = col === cols - 1;
        
        // Для 3 изображений: первое занимает 2 колонки вверху
        if (imageCount === 3 && index === 0) {
            return {
                width: imageSize * 2 + gap,
                height: imageSize,
                marginRight: gap,
                marginBottom: gap,
                borderTopLeftRadius: 13,
                borderTopRightRadius: 13,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
            };
        }
        
        // Для 3 изображений: второе и третье внизу
        if (imageCount === 3 && index > 0) {
            const borderRadius = {
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                borderBottomLeftRadius: index === 1 ? 0 : 13,
                borderBottomRightRadius: index === 2 ? 13 : 0,
            };
            return {
                width: imageSize,
                height: imageSize,
                marginRight: index === 1 ? gap : 0,
                marginBottom: 0,
                ...borderRadius,
            };
        }
        
        // Для остальных случаев
        const isLastInRow = isLastCol;
        
        // Определяем скругления углов
        let borderRadius = {};
        if (isFirstRow && isFirstCol) {
            borderRadius.borderTopLeftRadius = 13;
        }
        if (isFirstRow && isLastCol) {
            borderRadius.borderTopRightRadius = 13;
        }
        if (isLastRow && isFirstCol) {
            borderRadius.borderBottomLeftRadius = 13;
        }
        if (isLastRow && isLastCol) {
            borderRadius.borderBottomRightRadius = 13;
        }
        
        return {
            width: imageSize,
            height: imageSize,
            marginRight: isLastInRow ? 0 : gap,
            marginBottom: isLastRow ? 0 : gap,
            ...borderRadius,
        };
    };
    
    // Показываем счетчик для изображений больше 4
    const remainingCount = imageCount > 4 ? imageCount - 4 : 0;
    
    return (
        <>
            <BubbleContainer
                isOwn={isOwn}
                time={time}
                status={status}
                avatarUri={avatarUri}
                showAvatar={showAvatar}
                text={caption || ''}
                hasImage={true}
                isSelectionMode={isSelectionMode}
                isSelected={isSelected}
                isHighlighted={isHighlighted}
                isPressed={isPressed}
                isContextMenuActive={isContextMenuActive}
                hasContextMenu={hasContextMenu}
                canDelete={canDelete}
                onToggleSelection={onToggleSelection}
                onLongPress={onLongPress}
                onPress={onPress}
                onAvatarPress={onAvatarPress}
                replyTo={replyTo}
                onReplyPress={onReplyPress}
                onReply={onReply}
                currentUserId={currentUserId}
                showSenderName={showSenderName}
                senderName={senderName}
                senderId={senderId}
                senderNameColor={senderNameColor}
                onSenderNamePress={onSenderNamePress}
                isForwarded={isForwarded}
            >
                <View style={styles.imageContainer}>
                    <View style={styles.imageGrid}>
                        {attachments.slice(0, 4).map((attachment, index) => {
                            const imageStyle = getImageStyle(index);
                            const { borderTopLeftRadius, borderTopRightRadius, borderBottomLeftRadius, borderBottomRightRadius, ...containerStyle } = imageStyle;
                            return (
                                <TouchableOpacity
                                    key={attachment.id || index}
                                    onPress={() => onImagePress?.(attachment.path)}
                                    activeOpacity={0.8}
                                    style={[styles.imageWrapper, containerStyle]}
                                >
                                    <CachedImage
                                        source={{uri: attachment.path}}
                                        style={[
                                            styles.messageImage, 
                                            { 
                                                width: imageStyle.width, 
                                                height: imageStyle.height,
                                                borderTopLeftRadius: borderTopLeftRadius || 0,
                                                borderTopRightRadius: borderTopRightRadius || 0,
                                                borderBottomLeftRadius: borderBottomLeftRadius || 0,
                                                borderBottomRightRadius: borderBottomRightRadius || 0,
                                            }
                                        ]}
                                        resizeMode="cover"
                                    />
                                    {index === 3 && remainingCount > 0 && (
                                        <View style={styles.imageOverlay}>
                                            <Text style={styles.imageOverlayText}>+{remainingCount}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    {caption && (
                        <View style={styles.imageCaptionContainer}>
                            <Text style={styles.messageText}>{caption}</Text>
                        </View>
                    )}
                </View>
            </BubbleContainer>
            {message?.reactions && message.reactions.length > 0 && (
                <View style={[styles.reactionsWrapper, isOwn ? styles.reactionsWrapperOwn : styles.reactionsWrapperOther]}>
                    <MessageReactions
                        reactions={message.reactions}
                        currentUserId={currentUserId}
                        messageId={message.id}
                        onReactionPress={onAddReaction}
                        onReactionLongPress={onAddReaction}
                    />
                </View>
            )}
        </>
    );
};

const ProductMessage = memo(({
    product,
    productId,
    isOwn,
    time,
    status,
    onOpenProduct,
    avatarUri,
    showAvatar,
    isSelectionMode,
    isSelected,
    isPressed = false,
    isContextMenuActive,
    hasContextMenu,
    canDelete,
    onToggleSelection,
    onLongPress,
    onPress,
    onAvatarPress,
    replyTo,
    onReplyPress,
    onReply,
    currentUserId,
    message,
    onAddReaction,
    showSenderName = false,
    senderName = null,
    senderId = null,
    senderNameColor = '#667781',
    onSenderNamePress = null,
    isForwarded = false
}) => {
    // Проверяем, удален ли продукт
    const isProductDeleted = useSelector((state) => selectIsProductDeleted(state, productId));

    // Если продукт удален, показываем специальное сообщение
    if (isProductDeleted) {
        return (
            <>
                <BubbleContainer
                    isOwn={isOwn}
                    time={time}
                    status={status}
                    avatarUri={avatarUri}
                    showAvatar={showAvatar}
                    text={''}
                    hasImage={false}
                    isSelectionMode={isSelectionMode}
                    isSelected={isSelected}
                    isPressed={isPressed}
                    isContextMenuActive={isContextMenuActive}
                    canDelete={canDelete}
                    onToggleSelection={onToggleSelection}
                    onLongPress={onLongPress}
                    onPress={onPress}
                    onAvatarPress={onAvatarPress}
                    replyTo={replyTo}
                    onReplyPress={onReplyPress}
                    onReply={onReply}
                    currentUserId={currentUserId}
                    showSenderName={showSenderName}
                    senderName={senderName}
                    senderId={senderId}
                    senderNameColor={senderNameColor}
                    onSenderNamePress={onSenderNamePress}
                    isForwarded={isForwarded}
                >
                    <View style={styles.deletedProductContainer}>
                        <View style={styles.deletedProductIcon}>
                            <Ionicons name="ban" size={24} color="#999" />
                        </View>
                        <Text style={styles.deletedProductText}>
                            Товар удален
                        </Text>
                        {product?.name && (
                            <Text style={styles.deletedProductName} numberOfLines={2}>
                                {product.name}
                            </Text>
                        )}
                    </View>
                </BubbleContainer>
                {message?.reactions && message.reactions.length > 0 && (
                    <View style={[styles.reactionsWrapper, isOwn ? styles.reactionsWrapperOwn : styles.reactionsWrapperOther]}>
                        <MessageReactions
                            reactions={message.reactions}
                            currentUserId={currentUserId}
                            messageId={message.id}
                            onReactionPress={onAddReaction}
                            onReactionLongPress={onAddReaction}
                        />
                    </View>
                )}
            </>
        );
    }

    const transformedProduct = {
        id: product.productId || productId,
        name: product.name,
        description: product.description,
        price: product.price,
        images: product.images || [],
        image: product.images && product.images.length > 0
            ? getImageUrl(product.images[0])
            : null,
        stockQuantity: 1,
        isActive: true,
        itemsPerBox: 1,
        boxPrice: product.price,
        availableBoxes: 1,
        pricePerItem: product.price
    };

    return (
        <>
            <BubbleContainer
                isOwn={isOwn}
                time={time}
                status={status}
                avatarUri={avatarUri}
                showAvatar={showAvatar}
                text={''}
                hasImage={false}
                isSelectionMode={isSelectionMode}
                isSelected={isSelected}
                isPressed={isPressed}
                isContextMenuActive={isContextMenuActive}
                canDelete={canDelete}
                onToggleSelection={onToggleSelection}
                onLongPress={onLongPress}
                onPress={onPress}
                onAvatarPress={onAvatarPress}
                replyTo={replyTo}
                onReplyPress={onReplyPress}
                onReply={onReply}
                currentUserId={currentUserId}
                showSenderName={showSenderName}
                senderName={senderName}
                senderId={senderId}
                senderNameColor={senderNameColor}
                onSenderNamePress={onSenderNamePress}
                isForwarded={isForwarded}
            >
                <View style={styles.productCardContainer}>
                    <ProductCard
                        product={transformedProduct}
                        productId={productId}
                        onPress={() => {
                            // Если режим выбора активен, выделяем сообщение вместо открытия товара
                            if (isSelectionMode && onToggleSelection) {
                                onToggleSelection();
                            } else {
                                onOpenProduct?.(productId);
                            }
                        }}
                        width={250}
                        compact={true}
                    />
                </View>
            </BubbleContainer>
            {message?.reactions && message.reactions.length > 0 && (
                <View style={[styles.reactionsWrapper, isOwn ? styles.reactionsWrapperOwn : styles.reactionsWrapperOther]}>
                    <MessageReactions
                        reactions={message.reactions}
                        currentUserId={currentUserId}
                        messageId={message.id}
                        onReactionPress={onAddReaction}
                        onReactionLongPress={onAddReaction}
                    />
                </View>
            )}
        </>
    );
});

const WarehouseMessage = ({
    warehouse,
    warehouseId,
    isOwn,
    time,
    status,
    onOpenWarehouse,
    avatarUri,
    showAvatar,
    isSelectionMode,
    isSelected,
    isPressed = false,
    isContextMenuActive,
    hasContextMenu,
    canDelete,
    onToggleSelection,
    onLongPress,
    onPress,
    onAvatarPress,
    replyTo,
    onReplyPress,
    onReply,
    currentUserId,
    message,
    onAddReaction,
    showSenderName = false,
    senderName = null,
    senderId = null,
    senderNameColor = '#667781',
    onSenderNamePress = null,
    isForwarded = false
}) => {
    // Преобразуем данные склада в нужный формат
    const transformedWarehouse = {
        id: warehouse.id || warehouseId || warehouse.warehouseId,
        name: warehouse.name || 'Склад',
        address: warehouse.address || '',
        district: warehouse.district || null,
        image: warehouse.image || null,
        isActive: warehouse.isActive !== false,
        maxDeliveryRadius: warehouse.maxDeliveryRadius,
        latitude: warehouse.latitude,
        longitude: warehouse.longitude,
        workingHours: warehouse.workingHours || null,
        autoManageStatus: warehouse.autoManageStatus || false
    };

    const finalWarehouseId = transformedWarehouse.id || warehouseId;

    return (
        <>
            <BubbleContainer
                isOwn={isOwn}
                time={time}
                status={status}
                avatarUri={avatarUri}
                showAvatar={showAvatar}
                text={''}
                hasImage={false}
                isSelectionMode={isSelectionMode}
                isSelected={isSelected}
                isPressed={isPressed}
                isContextMenuActive={isContextMenuActive}
                canDelete={canDelete}
                onToggleSelection={onToggleSelection}
                onLongPress={onLongPress}
                onPress={onPress}
                onAvatarPress={onAvatarPress}
                replyTo={replyTo}
                onReplyPress={onReplyPress}
                onReply={onReply}
                currentUserId={currentUserId}
                showSenderName={showSenderName}
                senderName={senderName}
                senderId={senderId}
                senderNameColor={senderNameColor}
                onSenderNamePress={onSenderNamePress}
                isForwarded={isForwarded}
            >
                <View style={styles.warehouseCardContainer}>
                    <WarehouseCard
                        warehouse={transformedWarehouse}
                        onPress={() => {
                            console.log('🔵 WarehouseMessage: onPress called', {
                                finalWarehouseId,
                                hasOnOpenWarehouse: !!onOpenWarehouse,
                                warehouse: transformedWarehouse
                            });
                            if (finalWarehouseId && onOpenWarehouse) {
                                onOpenWarehouse(finalWarehouseId);
                            } else {
                                console.warn('⚠️ WarehouseMessage: Cannot navigate', {
                                    hasId: !!finalWarehouseId,
                                    hasHandler: !!onOpenWarehouse
                                });
                            }
                        }}
                        width={250}
                        compact={true}
                    />
                </View>
            </BubbleContainer>
            {message?.reactions && message.reactions.length > 0 && (
                <View style={[styles.reactionsWrapper, isOwn ? styles.reactionsWrapperOwn : styles.reactionsWrapperOther]}>
                    <MessageReactions
                        reactions={message.reactions}
                        currentUserId={currentUserId}
                        messageId={message.id}
                        onReactionPress={onAddReaction}
                        onReactionLongPress={onAddReaction}
                    />
                </View>
            )}
        </>
    );
};

const ContactMessage = ({
    contact,
    contactUserId,
    isOwn,
    time,
    status,
    onOpenContact,
    avatarUri,
    showAvatar,
    isSelectionMode,
    isSelected,
    isPressed = false,
    isContextMenuActive,
    hasContextMenu,
    canDelete,
    onToggleSelection,
    onLongPress,
    onPress,
    onAvatarPress,
    replyTo,
    onReplyPress,
    onReply,
    currentUserId,
    message,
    onAddReaction,
    showSenderName = false,
    senderName = null,
    senderId = null,
    senderNameColor = '#667781',
    onSenderNamePress = null,
    isForwarded = false
}) => {
    // Получаем данные контакта
    const contactData = contact || {};
    const finalContactUserId = contactUserId || contactData.userId;
    
    // Получаем имя контакта
    const contactName = contactData.name || 'Пользователь';
    const contactRole = contactData.role || '';
    const contactPhone = contactData.phone || '';
    const contactEmail = contactData.email || '';
    const contactAvatar = contactData.avatar || null;
    
    // Получаем отображаемое название роли
    const getRoleDisplay = () => {
        if (contactRole === 'SUPPLIER') return 'Поставщик';
        if (contactRole === 'CLIENT') return 'Клиент';
        if (contactRole === 'EMPLOYEE') {
            // Для сотрудников показываем должность вместо "Сотрудник"
            // Пробуем получить processingRole из разных источников
            const processingRole = contactData.processingRole || 
                                   contactData.employee?.processingRole || 
                                   (message?.contactUser?.employee?.processingRole) ||
                                   (message?.contact?.employee?.processingRole) ||
                                   null;
            
            if (processingRole && PROCESSING_ROLE_LABELS[processingRole]) {
                return PROCESSING_ROLE_LABELS[processingRole];
            }
            
            // Fallback на "Сотрудник" если должность не определена
            return 'Сотрудник';
        }
        if (contactRole === 'ADMIN') return 'Администратор';
        if (contactRole === 'DRIVER') return 'Водитель';
        return contactRole || '';
    };
    
    const avatarUriFinal = contactAvatar ? getImageUrl(contactAvatar) : null;

    return (
        <>
            <BubbleContainer
                isOwn={isOwn}
                time={time}
                status={status}
                avatarUri={avatarUri}
                showAvatar={showAvatar}
                text={''}
                hasImage={false}
                isSelectionMode={isSelectionMode}
                isSelected={isSelected}
                isPressed={isPressed}
                isContextMenuActive={isContextMenuActive}
                canDelete={canDelete}
                onToggleSelection={onToggleSelection}
                onLongPress={onLongPress}
                onPress={onPress}
                onAvatarPress={onAvatarPress}
                replyTo={replyTo}
                onReplyPress={onReplyPress}
                onReply={onReply}
                currentUserId={currentUserId}
                showSenderName={showSenderName}
                senderName={senderName}
                senderId={senderId}
                senderNameColor={senderNameColor}
                onSenderNamePress={onSenderNamePress}
                isForwarded={isForwarded}
            >
                <TouchableOpacity
                    style={styles.contactCardContainer}
                    onPress={() => {
                        if (isSelectionMode && onToggleSelection) {
                            onToggleSelection();
                        } else if (finalContactUserId && onOpenContact) {
                            onOpenContact(finalContactUserId);
                        }
                    }}
                    activeOpacity={0.7}
                    disabled={isSelectionMode}
                >
                    {avatarUriFinal ? (
                        <Image source={{ uri: avatarUriFinal }} style={styles.contactAvatar} />
                    ) : (
                        <View style={styles.contactAvatarPlaceholder}>
                            <Text style={styles.contactAvatarPlaceholderText}>👤</Text>
                        </View>
                    )}
                    <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>{contactName}</Text>
                        {contactRole && (
                            <Text style={styles.contactRole}>{getRoleDisplay()}</Text>
                        )}
                        {contactPhone && (
                            <View style={styles.contactDetailRow}>
                                <Ionicons name="call-outline" size={14} color="#8696A0" />
                                <Text style={styles.contactDetailText}>{contactPhone}</Text>
                            </View>
                        )}
                        {contactEmail && (
                            <View style={styles.contactDetailRow}>
                                <Ionicons name="mail-outline" size={14} color="#8696A0" />
                                <Text style={styles.contactDetailText}>{contactEmail}</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </BubbleContainer>
            {message?.reactions && message.reactions.length > 0 && (
                <View style={[styles.reactionsWrapper, isOwn ? styles.reactionsWrapperOwn : styles.reactionsWrapperOther]}>
                    <MessageReactions
                        reactions={message.reactions}
                        currentUserId={currentUserId}
                        messageId={message.id}
                        onReactionPress={onAddReaction}
                        onReactionLongPress={onAddReaction}
                    />
                </View>
            )}
        </>
    );
};

const StopMessage = ({
    stop,
    stopId,
    isOwn,
    time,
    status,
    onOpenStop,
    avatarUri,
    showAvatar,
    isSelectionMode,
    isSelected,
    isPressed = false,
    isContextMenuActive,
    hasContextMenu,
    canDelete,
    onToggleSelection,
    onLongPress,
    onPress,
    onAvatarPress,
    onContactDriver,
    replyTo,
    onReplyPress,
    onReply,
    currentUserId,
    message,
    onAddReaction,
    showSenderName = false,
    senderName = null,
    senderId = null,
    senderNameColor = '#667781',
    onSenderNamePress = null,
    isForwarded = false
}) => {
    const transformedStop = {
        stopId: stop.stopId || stop.id || stopId,
        address: stop.address,
        startTime: stop.startTime,
        endTime: stop.endTime,
        photo: stop.photo || null, // Убеждаемся, что photo передается
        mapLocation: stop.mapLocation,
        description: stop.description,
        truckModel: stop.truckModel,
        truckNumber: stop.truckNumber,
        district: stop.district,
        // Добавляем данные о водителе
        driver: stop.driver,
        driverName: stop.driverName || stop.driver?.name,
        driverPhone: stop.driverPhone || stop.driver?.phone,
        driverUserId: stop.driverUserId || stop.driver?.userId
    };

    // Используем stopId из transformedStop для навигации
    const finalStopId = transformedStop.stopId || stopId;

    return (
        <>
            <BubbleContainer
                isOwn={isOwn}
                time={time}
                status={status}
                avatarUri={avatarUri}
                showAvatar={showAvatar}
                text={''}
                hasImage={false}
                isSelectionMode={isSelectionMode}
                isSelected={isSelected}
                isPressed={isPressed}
                isContextMenuActive={isContextMenuActive}
                canDelete={canDelete}
                onToggleSelection={onToggleSelection}
                onLongPress={onLongPress}
                onPress={onPress}
                onAvatarPress={onAvatarPress}
                replyTo={replyTo}
                onReplyPress={onReplyPress}
                onReply={onReply}
                currentUserId={currentUserId}
                showSenderName={showSenderName}
                senderName={senderName}
                senderId={senderId}
                senderNameColor={senderNameColor}
                onSenderNamePress={onSenderNamePress}
                isForwarded={isForwarded}
            >
                <View style={styles.stopCardContainer}>
                    <StopCard
                        stop={transformedStop}
                        onPress={() => {
                            if (finalStopId && onOpenStop) {
                                onOpenStop(finalStopId);
                            }
                        }}
                        width={250}
                        compact={true}
                        showContactButton={!isOwn}
                        onContactDriver={onContactDriver}
                    />
                </View>
            </BubbleContainer>
            {message?.reactions && message.reactions.length > 0 && (
                <View style={[styles.reactionsWrapper, isOwn ? styles.reactionsWrapperOwn : styles.reactionsWrapperOther]}>
                    <MessageReactions
                        reactions={message.reactions}
                        currentUserId={currentUserId}
                        messageId={message.id}
                        onReactionPress={onAddReaction}
                        onReactionLongPress={onAddReaction}
                    />
                </View>
            )}
        </>
    );
};

const SystemMessage = ({text, time}) => (
    <View style={styles.systemMessageContainer}>
        <View style={styles.systemMessageBubble}>
            <Text style={styles.systemMessageText}>{text}</Text>
        </View>
    </View>
);

export const MessageBubble = memo(({
                                       message,
                                       currentUserId,
                                       onOpenProduct,
                                       onOpenStop,
                                       onOpenWarehouse,
                                       onOpenContact,
                                       onImagePress,
                                       showAvatar = true,
                                       incomingAvatarUri,
                                       isSelectionMode = false,
                                       isSelected = false,
                                       isHighlighted = false,
                                       isPressed = false,
                                       isContextMenuActive = false,
                                       hasContextMenu = false,
                                       canDelete = false,
                                       onToggleSelection,
                                       onLongPress,
                                       onPress,
                                       onRetryMessage,
                                       onCancelMessage,
                                       isRetrying = false,
                                       onAvatarPress,
                                       onContactDriver,
                                       onReply,
                                       onReplyPress,
                                       onAddReaction,
                                       onRemoveReaction,
                                       onShowReactionPicker,
                                       roomType = null,
                                       participants = [],
                                       onSenderNamePress = null
                                   }) => {
    const isOwn = message?.senderId === currentUserId;
    const createdAt = message?.createdAt ? new Date(message.createdAt) : null;
    const time = createdAt ? createdAt.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    }) : '';

    // Нормализуем статус к верхнему регистру для StatusTicks компонента
    const rawStatus = message?.status || 'SENT';
    const status = typeof rawStatus === 'string' ? rawStatus.toUpperCase() : 'SENT';

    const avatarUriBase = message?.sender?.avatar
        || message?.sender?.image
        || message?.senderAvatar
        || message?.user?.avatar
        || message?.user?.image;
    // Нормализуем URL аватара через getImageUrl (включая замену старых IP-адресов)
    const normalizedAvatarUri = avatarUriBase ? getImageUrl(avatarUriBase) : null;
    const normalizedIncomingAvatarUri = incomingAvatarUri ? getImageUrl(incomingAvatarUri) : null;
    const avatarUri = normalizedAvatarUri || (!isOwn ? normalizedIncomingAvatarUri : null);

    // Функция для генерации цвета на основе ID пользователя (детерминированная)
    const getColorForUserId = (userId) => {
        if (!userId) return '#667781'; // Серый по умолчанию
        
        // Список цветов для имен участников (приглушенные насыщенные цвета для читаемости на белом фоне)
        const colors = [
            '#D32F2F', // Красный
            '#1976D2', // Синий
            '#388E3C', // Зеленый
            '#7B1FA2', // Фиолетовый
            '#F57C00', // Оранжевый
            '#0097A7', // Циан
            '#C2185B', // Розовый
            '#5D4037', // Коричневый
            '#455A64', // Сине-серый
            '#E64A19', // Глубокий оранжевый
            '#00796B', // Бирюзовый
            '#512DA8', // Темно-фиолетовый
            '#1565C0', // Темно-синий
            '#2E7D32', // Темно-зеленый
            '#AD1457', // Темно-розовый
        ];
        
        // Генерируем индекс на основе ID пользователя
        const hash = String(userId).split('').reduce((acc, char) => {
            return ((acc << 5) - acc) + char.charCodeAt(0);
        }, 0);
        
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    };

    // Функция для получения имени отправителя (для групп и каналов)
    const getSenderName = () => {
        // Показываем имя только для входящих сообщений в группах и каналах
        if (isOwn) return null;
        
        const roomTypeUpper = roomType ? String(roomType).toUpperCase().trim() : '';
        if (roomTypeUpper !== 'GROUP' && roomTypeUpper !== 'BROADCAST') {
            return null;
        }

        // Проверяем данные из message.sender
        if (message?.sender) {
            const sender = message.sender;
            const name = sender.client?.name ||
                         sender.admin?.name ||
                         sender.employee?.name ||
                         sender.supplier?.contactPerson ||
                         sender.driver?.name ||
                         sender.email?.split('@')[0] ||
                         sender.name;

            if (name) return name;
        }

        // Ищем дополнительные данные в массиве participants
        if (participants && Array.isArray(participants) && message?.senderId) {
            const participant = participants.find(p =>
                (p?.userId ?? p?.user?.id ?? p?.id) === message.senderId
            );

            if (participant) {
                const user = participant.user || participant;
                const name = user.client?.name ||
                             user.admin?.name ||
                             user.employee?.name ||
                             user.supplier?.contactPerson ||
                             user.driver?.name ||
                             user.email?.split('@')[0] ||
                             user.name;

                if (name) return name;
            }
        }

        // Fallback
        if (message?.sender?.email) {
            return message.sender.email.split('@')[0];
        }

        return null;
    };

    const senderName = getSenderName();
    const showSenderName = Boolean(senderName);
    const senderId = message?.senderId || message?.sender?.id;
    const senderNameColor = getColorForUserId(senderId);
    const isForwarded = Boolean(message?.originalMessageId || message?.isForwarded || message?.forwardedFrom || message?.forwardedFromId);

    if (message.type === 'SYSTEM') {
        return (
            <SystemMessage
                text={message?.content || ''}
                time={time}
            />
        );
    }

    if (message.type === 'IMAGE') {
        // Проверяем разные возможные поля для подписи
        let caption = message?.content || message?.text || message?.caption;

        // Если подпись не найдена в основных полях, проверяем attachments
        if (!caption && message?.attachments && Array.isArray(message.attachments)) {
            for (const attachment of message.attachments) {
                if (attachment.caption || attachment.description || attachment.text) {
                    caption = attachment.caption || attachment.description || attachment.text;
                    break;
                }
            }
        }

        return (
            <>
                <ImageMessage
                    attachments={message.attachments || []}
                    caption={caption}
                    isOwn={isOwn}
                    time={time}
                    status={status}
                    avatarUri={avatarUri}
                    showAvatar={showAvatar}
                    onImagePress={onImagePress}
                    isSelectionMode={isSelectionMode}
                    isSelected={isSelected}
                    isHighlighted={isHighlighted}
                    isPressed={isPressed}
                    isContextMenuActive={isContextMenuActive}
                    hasContextMenu={hasContextMenu}
                    canDelete={canDelete}
                    onToggleSelection={onToggleSelection}
                    onLongPress={onLongPress}
                    onPress={onPress}
                    onAvatarPress={onAvatarPress}
                    replyTo={message.replyTo}
                    onReplyPress={onReplyPress}
                    onReply={() => onReply?.(message)}
                    currentUserId={currentUserId}
                    message={message}
                    onAddReaction={onAddReaction}
                    showSenderName={showSenderName}
                    senderName={senderName}
                    senderId={senderId}
                    senderNameColor={senderNameColor}
                    onSenderNamePress={onSenderNamePress}
                    isForwarded={isForwarded}
                />
                
                {/* Показываем кнопки retry/cancel только для своих сообщений */}
                {isOwn && message.status === 'FAILED' && message.isRetryable && (
                    <MessageErrorActions
                        message={message}
                        onRetry={() => onRetryMessage?.(message)}
                        onCancel={() => onCancelMessage?.(message)}
                        isRetrying={isRetrying}
                    />
                )}
            </>
        );
    }

    if (message.type === 'VOICE') {
        // Получаем аудио вложение
        const voiceAttachment = message?.attachments?.find(att => att.type === 'VOICE');
        
        if (!voiceAttachment) {
            return (
                <TextMessage
                    text="[Голосовое сообщение недоступно]"
                    isOwn={isOwn}
                    time={time}
                    status={status}
                    avatarUri={avatarUri}
                    showAvatar={showAvatar}
                    isSelectionMode={isSelectionMode}
                    isSelected={isSelected}
                    isHighlighted={isHighlighted}
                    isPressed={isPressed}
                    isContextMenuActive={isContextMenuActive}
                    hasContextMenu={hasContextMenu}
                    canDelete={canDelete}
                    onToggleSelection={onToggleSelection}
                    onLongPress={onLongPress}
                    onPress={onPress}
                    onAvatarPress={onAvatarPress}
                    replyTo={message.replyTo}
                    onReplyPress={onReplyPress}
                    onReply={() => onReply?.(message)}
                    currentUserId={currentUserId}
                    showSenderName={showSenderName}
                    senderName={senderName}
                    senderId={senderId}
                    senderNameColor={senderNameColor}
                    onSenderNamePress={onSenderNamePress}
                    isForwarded={isForwarded}
                />
            );
        }

        // Для голосовых сообщений используем BubbleContainer, но время и статус передаем в компонент
        return (
            <>
                <BubbleContainer
                    isOwn={isOwn}
                    time={''}  // Пустое время - CachedVoice сам его отобразит
                    status={''}  // Пустой статус - CachedVoice сам отобразит галочки
                    avatarUri={avatarUri}
                    showAvatar={showAvatar}
                    text={''}
                    hasImage={false}
                    isSelectionMode={isSelectionMode}
                    isSelected={isSelected}
                    isHighlighted={isHighlighted}
                    isPressed={isPressed}
                    isContextMenuActive={isContextMenuActive}
                    hasContextMenu={hasContextMenu}
                    canDelete={canDelete}
                    onToggleSelection={onToggleSelection}
                    onLongPress={onLongPress}
                    onPress={onPress}
                    onAvatarPress={onAvatarPress}
                    replyTo={message.replyTo}
                    onReplyPress={onReplyPress}
                    onReply={() => onReply?.(message)}
                    currentUserId={currentUserId}
                    showSenderName={showSenderName}
                    senderName={senderName}
                    senderId={senderId}
                    senderNameColor={senderNameColor}
                    onSenderNamePress={onSenderNamePress}
                    isForwarded={isForwarded}
                >
                    <CachedVoice
                        messageId={message.id}
                        attachment={voiceAttachment}
                        isOwnMessage={isOwn}
                        time={time}
                        status={status}
                    />
                </BubbleContainer>
                
                {/* Реакции */}
                {message?.reactions && message.reactions.length > 0 && (
                    <View style={[styles.reactionsWrapper, isOwn ? styles.reactionsWrapperOwn : styles.reactionsWrapperOther]}>
                        <MessageReactions
                            reactions={message.reactions}
                            currentUserId={currentUserId}
                            messageId={message.id}
                            onReactionPress={onAddReaction}
                            onReactionLongPress={onAddReaction}
                        />
                    </View>
                )}
                
                {/* Показываем кнопки retry/cancel только для своих сообщений */}
                {isOwn && message.status === 'FAILED' && message.isRetryable && (
                    <MessageErrorActions
                        message={message}
                        onRetry={() => onRetryMessage?.(message)}
                        onCancel={() => onCancelMessage?.(message)}
                        isRetrying={isRetrying}
                    />
                )}
            </>
        );
    }

    if (message.type === 'PRODUCT') {
        // Получаем данные о товаре из content (JSON строка)
        let productData = null;
        let productId = message?.productId;

        try {
            // Сначала пробуем получить из content (новый способ)
            if (message?.content) {
                productData = JSON.parse(message.content);
            }
            // Если не получилось, пробуем из product (старый способ)
            else if (message?.product) {
                productData = message.product;
            }
        } catch (error) {
            // Ошибка парсинга обрабатывается через fallback UI
            // Fallback: показываем сообщение об ошибке
            return (
                <BubbleContainer
                    isOwn={isOwn}
                    time={time}
                    status={status}
                    avatarUri={avatarUri}
                    showAvatar={showAvatar}
                    text={'Ошибка отображения товара'}
                    hasImage={false}
                    isSelectionMode={isSelectionMode}
                    isSelected={isSelected}
                    isHighlighted={isHighlighted}
                    isPressed={isPressed}
                    isContextMenuActive={isContextMenuActive}
                    canDelete={canDelete}
                    onToggleSelection={onToggleSelection}
                    onLongPress={onLongPress}
                    onPress={onPress}
                    onAvatarPress={onAvatarPress}
                    replyTo={message.replyTo}
                    onReplyPress={onReplyPress}
                    onReply={() => onReply?.(message)}
                    currentUserId={currentUserId}
                >
                    <Text style={styles.messageText}>Ошибка отображения товара</Text>
                </BubbleContainer>
            );
        }

        // Если данных о товаре нет, показываем сообщение об ошибке
        if (!productData && !productId) {
            return (
                <BubbleContainer
                    isOwn={isOwn}
                    time={time}
                    status={status}
                    avatarUri={avatarUri}
                    showAvatar={showAvatar}
                    text={'Данные о товаре не найдены'}
                    hasImage={false}
                    isSelectionMode={isSelectionMode}
                    isSelected={isSelected}
                    isHighlighted={isHighlighted}
                    isPressed={isPressed}
                    isContextMenuActive={isContextMenuActive}
                    canDelete={canDelete}
                    onToggleSelection={onToggleSelection}
                    onLongPress={onLongPress}
                    onPress={onPress}
                    onAvatarPress={onAvatarPress}
                    replyTo={message.replyTo}
                    onReplyPress={onReplyPress}
                    onReply={() => onReply?.(message)}
                    currentUserId={currentUserId}
                >
                    <Text style={styles.messageText}>Данные о товаре не найдены</Text>
                </BubbleContainer>
            );
        }

        // Используем productId из productData если он есть, иначе из message
        const finalProductId = productId || productData?.productId || productData?.id;

        return (
            <ProductMessage
                product={productData || {}}
                productId={finalProductId}
                isOwn={isOwn}
                time={time}
                status={status}
                onOpenProduct={onOpenProduct}
                avatarUri={avatarUri}
                showAvatar={showAvatar}
                isSelectionMode={isSelectionMode}
                isSelected={isSelected}
                isPressed={isPressed}
                isContextMenuActive={isContextMenuActive}
                hasContextMenu={hasContextMenu}
                canDelete={canDelete}
                onToggleSelection={onToggleSelection}
                onLongPress={onLongPress}
                onPress={onPress}
                onAvatarPress={onAvatarPress}
                replyTo={message.replyTo}
                onReplyPress={onReplyPress}
                onReply={() => onReply?.(message)}
                currentUserId={currentUserId}
                message={message}
                onAddReaction={onAddReaction}
                onShowReactionPicker={onShowReactionPicker}
                showSenderName={showSenderName}
                senderName={senderName}
                senderId={senderId}
                senderNameColor={senderNameColor}
                onSenderNamePress={onSenderNamePress}
                isForwarded={isForwarded}
            />
        );
    }

    if (message.type === 'POLL') {
        return (
            <PollMessage
                message={message}
                isOwn={isOwn}
                time={time}
                status={status}
                avatarUri={avatarUri}
                showAvatar={showAvatar}
                isSelectionMode={isSelectionMode}
                isSelected={isSelected}
                isPressed={isPressed}
                isContextMenuActive={isContextMenuActive}
                hasContextMenu={hasContextMenu}
                canDelete={canDelete}
                onToggleSelection={onToggleSelection}
                onLongPress={onLongPress}
                onPress={onPress}
                onAvatarPress={onAvatarPress}
                currentUserId={currentUserId}
                replyTo={message.replyTo}
                onReplyPress={onReplyPress}
                onReply={() => onReply?.(message)}
                onAddReaction={onAddReaction}
                onShowReactionPicker={onShowReactionPicker}
                showSenderName={showSenderName}
                senderName={senderName}
                senderId={senderId}
                senderNameColor={senderNameColor}
                onSenderNamePress={onSenderNamePress}
                isForwarded={isForwarded}
            />
        );
    }

    if (message.type === 'STOP') {
        // Получаем данные об остановке из content (JSON строка)
        let stopData = null;
        let stopId = null;

        try {
            // Сначала пробуем получить из relation stop (приоритет)
            if (message?.stop) {
                stopData = message.stop;
                stopId = stopData?.id || message?.stopId;
            }
            // Если не получилось, пробуем из content
            else if (message?.content) {
                stopData = JSON.parse(message.content);
                stopId = stopData?.stopId || message?.stopId;
            }
        } catch (error) {
            // Ошибка парсинга обрабатывается через fallback UI
            return (
                <BubbleContainer
                    isOwn={isOwn}
                    time={time}
                    status={status}
                    avatarUri={avatarUri}
                    showAvatar={showAvatar}
                    text={'Ошибка отображения остановки'}
                    hasImage={false}
                    isSelectionMode={isSelectionMode}
                    isSelected={isSelected}
                    isHighlighted={isHighlighted}
                    isPressed={isPressed}
                    isContextMenuActive={isContextMenuActive}
                    canDelete={canDelete}
                    onToggleSelection={onToggleSelection}
                    onLongPress={onLongPress}
                    onPress={onPress}
                    onAvatarPress={onAvatarPress}
                    replyTo={message.replyTo}
                    onReplyPress={onReplyPress}
                    onReply={() => onReply?.(message)}
                    currentUserId={currentUserId}
                >
                    <Text style={styles.messageText}>Ошибка отображения остановки</Text>
                </BubbleContainer>
            );
        }

        // Если данных об остановке нет, показываем сообщение об ошибке
        if (!stopData) {
            return (
                <BubbleContainer
                    isOwn={isOwn}
                    time={time}
                    status={status}
                    avatarUri={avatarUri}
                    showAvatar={showAvatar}
                    text={'Данные об остановке не найдены'}
                    hasImage={false}
                    isSelectionMode={isSelectionMode}
                    isSelected={isSelected}
                    isHighlighted={isHighlighted}
                    isPressed={isPressed}
                    isContextMenuActive={isContextMenuActive}
                    canDelete={canDelete}
                    onToggleSelection={onToggleSelection}
                    onLongPress={onLongPress}
                    onPress={onPress}
                    onAvatarPress={onAvatarPress}
                    replyTo={message.replyTo}
                    onReplyPress={onReplyPress}
                    onReply={() => onReply?.(message)}
                    currentUserId={currentUserId}
                >
                    <Text style={styles.messageText}>Данные об остановке не найдены</Text>
                </BubbleContainer>
            );
        }

        return (
            <StopMessage
                stop={stopData}
                stopId={stopId}
                isOwn={isOwn}
                time={time}
                status={status}
                onOpenStop={onOpenStop}
                avatarUri={avatarUri}
                showAvatar={showAvatar}
                isSelectionMode={isSelectionMode}
                isSelected={isSelected}
                isPressed={isPressed}
                isContextMenuActive={isContextMenuActive}
                hasContextMenu={hasContextMenu}
                canDelete={canDelete}
                onToggleSelection={onToggleSelection}
                onLongPress={onLongPress}
                onPress={onPress}
                onAvatarPress={onAvatarPress}
                onContactDriver={onContactDriver}
                replyTo={message.replyTo}
                onReplyPress={onReplyPress}
                onReply={() => onReply?.(message)}
                currentUserId={currentUserId}
                message={message}
                onAddReaction={onAddReaction}
                onShowReactionPicker={onShowReactionPicker}
                showSenderName={showSenderName}
                senderName={senderName}
                senderId={senderId}
                senderNameColor={senderNameColor}
                onSenderNamePress={onSenderNamePress}
                isForwarded={isForwarded}
            />
        );
    }

    if (message.type === 'WAREHOUSE') {
        // Получаем данные о складе из content (JSON строка)
        let warehouseData = null;
        let warehouseId = null;

        try {
            // Сначала пробуем получить из relation warehouse (приоритет)
            if (message?.warehouse) {
                warehouseData = message.warehouse;
                warehouseId = warehouseData?.id || message?.warehouseId;
            }
            // Если не получилось, пробуем из content
            else if (message?.content) {
                warehouseData = JSON.parse(message.content);
                warehouseId = warehouseData?.id || message?.warehouseId;
            }
        } catch (error) {
            // Ошибка парсинга обрабатывается через fallback UI
            return (
                <BubbleContainer
                    isOwn={isOwn}
                    time={time}
                    status={status}
                    avatarUri={avatarUri}
                    showAvatar={showAvatar}
                    text={'Ошибка отображения склада'}
                    hasImage={false}
                    isSelectionMode={isSelectionMode}
                    isSelected={isSelected}
                    isHighlighted={isHighlighted}
                    isPressed={isPressed}
                    isContextMenuActive={isContextMenuActive}
                    canDelete={canDelete}
                    onToggleSelection={onToggleSelection}
                    onLongPress={onLongPress}
                    onPress={onPress}
                    onAvatarPress={onAvatarPress}
                    replyTo={message.replyTo}
                    onReplyPress={onReplyPress}
                    onReply={() => onReply?.(message)}
                    currentUserId={currentUserId}
                >
                    <Text style={styles.messageText}>Ошибка отображения склада</Text>
                </BubbleContainer>
            );
        }

        // Если данных о складе нет, показываем сообщение об ошибке
        if (!warehouseData) {
            return (
                <BubbleContainer
                    isOwn={isOwn}
                    time={time}
                    status={status}
                    avatarUri={avatarUri}
                    showAvatar={showAvatar}
                    text={'Данные о складе не найдены'}
                    hasImage={false}
                    isSelectionMode={isSelectionMode}
                    isSelected={isSelected}
                    isHighlighted={isHighlighted}
                    isPressed={isPressed}
                    isContextMenuActive={isContextMenuActive}
                    canDelete={canDelete}
                    onToggleSelection={onToggleSelection}
                    onLongPress={onLongPress}
                    onPress={onPress}
                    onAvatarPress={onAvatarPress}
                    replyTo={message.replyTo}
                    onReplyPress={onReplyPress}
                    onReply={() => onReply?.(message)}
                    currentUserId={currentUserId}
                >
                    <Text style={styles.messageText}>Данные о складе не найдены</Text>
                </BubbleContainer>
            );
        }

        return (
            <WarehouseMessage
                warehouse={warehouseData}
                warehouseId={warehouseId}
                isOwn={isOwn}
                time={time}
                status={status}
                onOpenWarehouse={onOpenWarehouse}
                avatarUri={avatarUri}
                showAvatar={showAvatar}
                isSelectionMode={isSelectionMode}
                isSelected={isSelected}
                isPressed={isPressed}
                isContextMenuActive={isContextMenuActive}
                hasContextMenu={hasContextMenu}
                canDelete={canDelete}
                onToggleSelection={onToggleSelection}
                onLongPress={onLongPress}
                onPress={onPress}
                onAvatarPress={onAvatarPress}
                replyTo={message.replyTo}
                onReplyPress={onReplyPress}
                onReply={() => onReply?.(message)}
                currentUserId={currentUserId}
                message={message}
                onAddReaction={onAddReaction}
                onShowReactionPicker={onShowReactionPicker}
                showSenderName={showSenderName}
                senderName={senderName}
                senderId={senderId}
                senderNameColor={senderNameColor}
                onSenderNamePress={onSenderNamePress}
                isForwarded={isForwarded}
            />
        );
    }

    if (message.type === 'CONTACT') {
        // Получаем данные о контакте из content (JSON строка)
        let contactData = null;
        let contactUserId = null;

        try {
            // Сначала пробуем получить из relation contact (приоритет)
            if (message?.contact) {
                contactData = message.contact;
                contactUserId = contactData?.userId || message?.contactUserId;
            }
            // Если не получилось, пробуем из content
            else if (message?.content) {
                if (typeof message.content === 'string') {
                    contactData = JSON.parse(message.content);
                } else if (typeof message.content === 'object') {
                    contactData = message.content;
                }
                contactUserId = contactData?.userId || message?.contactUserId;
            }
        } catch (error) {
            // Ошибка парсинга обрабатывается через fallback UI
            return (
                <BubbleContainer
                    isOwn={isOwn}
                    time={time}
                    status={status}
                    avatarUri={avatarUri}
                    showAvatar={showAvatar}
                    text={'Ошибка отображения контакта'}
                    hasImage={false}
                    isSelectionMode={isSelectionMode}
                    isSelected={isSelected}
                    isHighlighted={isHighlighted}
                    isPressed={isPressed}
                    isContextMenuActive={isContextMenuActive}
                    canDelete={canDelete}
                    onToggleSelection={onToggleSelection}
                    onLongPress={onLongPress}
                    onPress={onPress}
                    onAvatarPress={onAvatarPress}
                    replyTo={message.replyTo}
                    onReplyPress={onReplyPress}
                    onReply={() => onReply?.(message)}
                    currentUserId={currentUserId}
                >
                    <Text style={styles.messageText}>Ошибка отображения контакта</Text>
                </BubbleContainer>
            );
        }

        // Fallback: если есть relation contactUser, используем его
        if (contactData && !contactData.avatar && message?.contactUser?.avatar) {
            contactData.avatar = message.contactUser.avatar;
        }

        // Если данных о контакте нет, показываем сообщение об ошибке
        if (!contactData) {
            return (
                <BubbleContainer
                    isOwn={isOwn}
                    time={time}
                    status={status}
                    avatarUri={avatarUri}
                    showAvatar={showAvatar}
                    text={'Данные о контакте не найдены'}
                    hasImage={false}
                    isSelectionMode={isSelectionMode}
                    isSelected={isSelected}
                    isHighlighted={isHighlighted}
                    isPressed={isPressed}
                    isContextMenuActive={isContextMenuActive}
                    canDelete={canDelete}
                    onToggleSelection={onToggleSelection}
                    onLongPress={onLongPress}
                    onPress={onPress}
                    onAvatarPress={onAvatarPress}
                    replyTo={message.replyTo}
                    onReplyPress={onReplyPress}
                    onReply={() => onReply?.(message)}
                    currentUserId={currentUserId}
                >
                    <Text style={styles.messageText}>Данные о контакте не найдены</Text>
                </BubbleContainer>
            );
        }

        return (
            <ContactMessage
                contact={contactData}
                contactUserId={contactUserId}
                isOwn={isOwn}
                time={time}
                status={status}
                onOpenContact={onOpenContact}
                avatarUri={avatarUri}
                showAvatar={showAvatar}
                isSelectionMode={isSelectionMode}
                isSelected={isSelected}
                isPressed={isPressed}
                isContextMenuActive={isContextMenuActive}
                hasContextMenu={hasContextMenu}
                canDelete={canDelete}
                onToggleSelection={onToggleSelection}
                onLongPress={onLongPress}
                onPress={onPress}
                onAvatarPress={onAvatarPress}
                replyTo={message.replyTo}
                onReplyPress={onReplyPress}
                onReply={() => onReply?.(message)}
                currentUserId={currentUserId}
                message={message}
                onAddReaction={onAddReaction}
                onShowReactionPicker={onShowReactionPicker}
                showSenderName={showSenderName}
                senderName={senderName}
                senderId={senderId}
                senderNameColor={senderNameColor}
                onSenderNamePress={onSenderNamePress}
                isForwarded={isForwarded}
            />
        );
    }

    return (
        <TextMessage
            text={message?.content || ''}
            isOwn={isOwn}
            time={time}
            status={status}
            avatarUri={avatarUri}
            showAvatar={showAvatar}
            isSelectionMode={isSelectionMode}
            isSelected={isSelected}
            isHighlighted={isHighlighted}
            isPressed={isPressed}
            isContextMenuActive={isContextMenuActive}
            hasContextMenu={hasContextMenu}
            canDelete={canDelete}
            onToggleSelection={onToggleSelection}
            onLongPress={onLongPress}
            onPress={onPress}
            onAvatarPress={onAvatarPress}
            replyTo={message.replyTo}
            onReplyPress={onReplyPress}
            onReply={() => onReply?.(message)}
            currentUserId={currentUserId}
            message={message}
            onAddReaction={onAddReaction}
            onRemoveReaction={onRemoveReaction}
            onShowReactionPicker={onShowReactionPicker}
            showSenderName={showSenderName}
            senderName={senderName}
            senderId={senderId}
            senderNameColor={senderNameColor}
            onSenderNamePress={onSenderNamePress}
            isForwarded={isForwarded}
                />
    );
}, (prevProps, nextProps) => {
    // Если isContextMenuActive изменился, всегда перерисовываем компонент
    if (prevProps.isContextMenuActive !== nextProps.isContextMenuActive) {
        return false; // Перерисовываем компонент
    }
    
    // Проверяем изменения реакций
    const prevReactions = prevProps.message?.reactions || [];
    const nextReactions = nextProps.message?.reactions || [];
    const prevReactionsTimestamp = prevProps.message?._reactionsUpdated;
    const nextReactionsTimestamp = nextProps.message?._reactionsUpdated;
    
    // Сравниваем по timestamp если он есть
    if (prevReactionsTimestamp !== nextReactionsTimestamp) {
        return false; // Перерисовываем компонент
    }
    
    const reactionsChanged = prevReactions.length !== nextReactions.length ||
        JSON.stringify(prevReactions) !== JSON.stringify(nextReactions);
    
    if (reactionsChanged) {
        return false; // Перерисовываем компонент
    }
    
    // Проверяем изменения senderId для перерисовки при изменении отправителя
    const prevSenderId = prevProps.message?.senderId || prevProps.message?.sender?.id;
    const nextSenderId = nextProps.message?.senderId || nextProps.message?.sender?.id;
    
    const shouldSkipRender = (
        prevProps.message?.id === nextProps.message?.id &&
        prevProps.message?.status === nextProps.message?.status &&
        prevProps.currentUserId === nextProps.currentUserId &&
        prevProps.showAvatar === nextProps.showAvatar &&
        prevProps.incomingAvatarUri === nextProps.incomingAvatarUri &&
        prevProps.isSelectionMode === nextProps.isSelectionMode &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.isHighlighted === nextProps.isHighlighted &&
        prevProps.canDelete === nextProps.canDelete &&
        prevSenderId === nextSenderId &&
        prevProps.roomType === nextProps.roomType &&
        prevProps.participants === nextProps.participants
    );
    
    return shouldSkipRender;
});

const styles = StyleSheet.create({
    messageContainer: {
        flexDirection: 'row',
        marginVertical: 1,
        alignItems: 'flex-start',
        marginHorizontal: -8,
        paddingHorizontal: 16,
    },
    pollContainer: {
        padding: 8,
        paddingTop: 6,
        minWidth: 220,
        maxWidth: '100%',
    },
    pollQuestion: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
        marginBottom: 10,
        lineHeight: 19,
    },
    pollHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    pollHeaderIcon: {
        marginTop: 2,
    },
    pollHeaderText: {
        fontSize: 12,
        color: '#666',
        marginLeft: 6,
        flex: 1,
        lineHeight: 16,
    },
    pollOption: {
        backgroundColor: 'transparent',
        borderRadius: 6,
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginBottom: 6,
        position: 'relative',
        overflow: 'visible',
    },
    pollOptionVoted: {
        backgroundColor: 'transparent',
    },
    pollOptionLeftBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        backgroundColor: '#00C853',
        borderRadius: 1.5,
    },
    pollOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 1,
    },
    pollOptionRadio: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#8696A0',
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    pollOptionRadioVoted: {
        borderColor: '#00C853',
        backgroundColor: '#00C853',
    },
    pollOptionContent: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pollOptionText: {
        flex: 1,
        fontSize: 14.5,
        color: '#000',
        lineHeight: 18,
    },
    pollOptionTextVoted: {
        fontWeight: '500',
        color: '#000',
    },
    pollOptionVoteCount: {
        fontSize: 13,
        color: '#8696A0',
        marginLeft: 8,
        fontWeight: '400',
    },
    pollOptionVoteCountVoted: {
        color: '#00C853',
        fontWeight: '600',
    },
    pollFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 6,
    },
    pollFooterText: {
        fontSize: 12,
        color: '#8696A0',
        marginLeft: 4,
    },
    ownMessageContainer: {
        justifyContent: 'flex-end',
    },
    otherMessageContainer: {
        justifyContent: 'flex-start',
    },
    selectedMessageContainer: {
        backgroundColor: 'rgba(191,191,191,0.5)',
        marginHorizontal: -8,
        paddingHorizontal: 16,
        paddingVertical: 4,
    },

    // Аватар ВВЕРХУ
    avatarContainer: {
        marginRight: 8,
        marginTop: 0,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E0E0E0',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    avatarPlaceholder: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#E0E0E0',
        borderRadius: 16,
    },
    avatarPlaceholderText: {
        fontSize: 16,
        color: '#666666',
    },
    avatarSpacer: {
        width: 40,
    },

    // Пузырь
    bubbleWrapper: {
        maxWidth: '85%',
        alignItems: 'flex-start',
    },
    ownBubbleWrapper: {
        alignItems: 'flex-end',
    },
    bubble: {
        paddingHorizontal: 7,
        paddingVertical: 5,
        borderRadius: 7.5,
        position: 'relative',
        minWidth: 60,
        shadowColor: 'rgba(0, 0, 0, 0.13)',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 1,
        shadowRadius: 0.5,
        elevation: 1,
    },
    ownBubble: {
        backgroundColor: '#DCF8C6',
    },
    otherBubble: {
        backgroundColor: '#FFFFFF',
    },
    highlightedBubble: {
        backgroundColor: '#FFF9C4', // Светло-желтый цвет для выделения
        shadowColor: '#FBC02D',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    contextMenuActiveContainerOwn: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)', // Зеленоватое выделение для своих сообщений
    },
    contextMenuActiveContainerOther: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)', // Зеленоватое выделение для чужих сообщений
    },
    pressedBubbleOwn: {
        opacity: 0.85,
    },
    pressedBubbleOther: {
        opacity: 0.85,
    },
    pressedBubbleInnerOwn: {
        backgroundColor: '#C8E6A0', // Более темный зеленый для своих сообщений при нажатии
    },
    pressedBubbleInnerOther: {
        backgroundColor: '#E8E8E8', // Более темный белый для чужих сообщений при нажатии
    },

    // Контент
    messageContent: {
        minWidth: 20,
    },
    textContainer: {
        flexShrink: 1,
    },
    textMessageContainer: {
        position: 'relative',
    },
    textWithButtonContainer: {
        // Контейнер для текста и кнопки
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 4,
        marginBottom: 2,
        zIndex: 10,
    },
    messageTextWrapper: {
        flex: 1,
        minWidth: 0,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 19,
        color: '#000000',
    },
    expandButtonInline: {
        backgroundColor: 'transparent',
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    expandButtonText: {
        fontSize: 16,
        color: '#8966A0',
        fontWeight: '500',
        lineHeight: 19,
    },

    // Время в строке (для коротких сообщений)
    inlineContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    inlineTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
        alignSelf: 'flex-end',
        marginBottom: -2,
    },

    // Футер с временем (для длинных сообщений)
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 2,
        minHeight: 15,
    },
    timestamp: {
        fontSize: 11,
        color: '#8696A0',
        marginRight: 3,
        lineHeight: 11, // добавлено для выравнивания с галочками
    },

    // Галочки статуса - УМЕНЬШЕНЫ И ВЫРОВНЕНЫ С ВРЕМЕНЕМ
    ticksContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        width: 12, // уменьшено с 16
        height: 10, // уменьшено с 12
        justifyContent: 'center',
    },
    tick: {
        fontSize: 12, // уменьшено с 16
        color: '#8696A0',
        fontWeight: '600',
        lineHeight: 11, // выровнено для центрирования с текстом времени
        position: 'absolute',
        textAlignVertical: 'center',
    },
    secondTick: {
        left: 4, // уменьшено с 6
    },
    tickRead: {
        color: '#4FC3F7',
    },
    tickSending: {
        color: '#B0B0B0', // Серый для отправки (как в WhatsApp)
        fontSize: 10,
        opacity: 0.7,
    },
    tickFailed: {
        color: '#F44336', // Красный для ошибки
        fontSize: 12,
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
        borderBottomColor: '#DCF8C6',
        borderTopColor: 'transparent',
        transform: [{rotate: '180deg'}], // Поворот хвостика
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
        borderBottomColor: '#FFFFFF',
        borderTopColor: 'transparent',
        transform: [{rotate: '180deg'}],
    },

    // Изображения
    imageContainer: {
        overflow: 'hidden',
        borderRadius: 13,
        minWidth: 180,
        maxWidth: 250,
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: 250,
    },
    imageWrapper: {
        position: 'relative',
        overflow: 'hidden',
    },
    messageImage: {
        backgroundColor: '#F0F0F0',
    },
    imageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageOverlayText: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: 'bold',
    },
    imageCaptionContainer: {
        padding: 8,
        paddingTop: 12,
        backgroundColor: 'transparent',
        position: 'relative',
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 13,
        borderBottomRightRadius: 13,
        marginTop: 4,
    },

    // Системные сообщения
    systemMessageContainer: {
        marginVertical: 8,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    systemMessageBubble: {
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        maxWidth: '80%',
        alignItems: 'center',
    },
    systemMessageText: {
        fontSize: 12,
        color: '#666666',
        textAlign: 'center',
        fontWeight: '400',
    },
    systemMessageTime: {
        fontSize: 10,
        color: '#999999',
        marginTop: 2,
    },

    productCardContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 250,
    },
    stopCardContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 250,
    },
    warehouseCardContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 250,
    },
    contactCardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        width: 250,
    },
    contactAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E0E0E0',
    },
    contactAvatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E0E0E0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactAvatarPlaceholderText: {
        fontSize: 24,
    },
    contactInfo: {
        flex: 1,
        marginLeft: 12,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    contactRole: {
        fontSize: 14,
        color: '#8696A0',
        marginBottom: 6,
    },
    contactDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    contactDetailText: {
        fontSize: 13,
        color: '#8696A0',
        marginLeft: 6,
    },
    reactionsWrapper: {
        marginTop: -6, // Поднимаем реакции чтобы они заходили на пузырек
        marginBottom: 4,
        paddingHorizontal: 16,
        zIndex: 10,
    },
    reactionsWrapperOwn: {
        alignItems: 'flex-end',
        paddingRight: 8,
    },
    reactionsWrapperOther: {
        alignItems: 'flex-start',
        paddingLeft: 48,
    },
    senderName: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 2,
        marginTop: 0,
    },
    forwardedLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        marginTop: 2,
    },
    forwardedLabelText: {
        fontSize: 12.5,
        color: '#8696A0',
        marginLeft: 4,
        fontWeight: '400',
    },
    deletedProductContainer: {
        width: 250,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
    },
    deletedProductIcon: {
        marginBottom: 8,
    },
    deletedProductText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#999',
        textAlign: 'center',
        marginBottom: 4,
    },
    deletedProductName: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
    },
});

export default MessageBubble;
