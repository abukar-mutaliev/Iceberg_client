import React, {memo, useState, useCallback, useRef} from 'react';
import {View, Text, Image, TouchableOpacity, StyleSheet} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {ProductCard} from '@entities/product/ui/ProductCard';
import {StopCard} from '@entities/stop/ui/StopCard';
import {CachedVoice} from './CachedVoice';
import {MessageErrorActions} from './MessageErrorActions';
import {ReplyPreview} from './ReplyPreview';
import {MessageReactions} from './MessageReactions';
import {getBaseUrl} from '@shared/api/api';
import {CachedImage} from './CachedImage/CachedImage';
import ChatApi from '@entities/chat/api/chatApi';

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

const StatusTicks = React.memo(({status}) => {
    // Отправляется (оптимистичное сообщение) - как в WhatsApp
    if (status === 'SENDING') {
        return (
            <View style={styles.ticksContainer}>
                <Text style={[styles.tick, styles.tickSending]}>✓</Text>
            </View>
        );
    }
    
    // Ошибка отправки
    if (status === 'FAILED') {
        return (
            <View style={styles.ticksContainer}>
                <Text style={[styles.tick, styles.tickFailed]}>❌</Text>
            </View>
        );
    }
    
    // Прочитано
    if (status === 'read' || status === 'READ') {
        return (
            <View style={styles.ticksContainer}>
                <Text style={[styles.tick, styles.tickRead]}>✓</Text>
                <Text style={[styles.tick, styles.tickRead, styles.secondTick]}>✓</Text>
            </View>
        );
    }
    
    // Доставлено
    if (status === 'DELIVERED') {
        return (
            <View style={styles.ticksContainer}>
                <Text style={[styles.tick]}>✓</Text>
                <Text style={[styles.tick, styles.secondTick]}>✓</Text>
            </View>
        );
    }
    
    // Отправлено
    if (status === 'SENT') {
        return (
            <View style={styles.ticksContainer}>
                <Text style={[styles.tick]}>✓</Text>
            </View>
        );
    }

    // По умолчанию - одна галочка
    return (
        <View style={styles.ticksContainer}>
            <Text style={[styles.tick]}>✓</Text>
        </View>
    );
});

// Компонент для измерения ширины текста
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

// Компонент для отображения опроса
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
    onAddReaction
}) => {
    const [poll, setPoll] = useState(message.poll || null);
    const [isVoting, setIsVoting] = useState(false);

    // Обновляем опрос если он изменился
    React.useEffect(() => {
        if (message.poll) {
            // Всегда обновляем опрос из сообщения, если он есть
            setPoll(message.poll);
        }
    }, [message.poll]);
    
    // Обновляем опрос при изменении message (например, через WebSocket)
    React.useEffect(() => {
        if (message.poll) {
            // Если опрос обновился (например, через WebSocket), обновляем локальное состояние
            // Особенно важно обновить, если у нас был временный ID
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

        // Проверяем, что у опроса есть реальный ID (не временный)
        const pollId = poll.id;
        if (!pollId || typeof pollId === 'string' && pollId.startsWith('temp_')) {
            return;
        }

        setIsVoting(true);
        try {
            // Определяем, какие варианты должны быть выбраны после голосования
            const currentVotedOptionIds = poll.options
                ?.filter(opt => opt.votes?.some(vote => vote.userId === currentUserId))
                .map(opt => opt.id) || [];
            
            // Запрещаем изменение голоса - можно только добавить, но не убрать
            let newOptionIds = [];
            if (poll.allowMultiple) {
                // Множественный выбор: можно только добавлять варианты
                if (currentVotedOptionIds.includes(optionId)) {
                    // Уже проголосовано за этот вариант - ничего не делаем
                    setIsVoting(false);
                    return;
                } else {
                    // Добавляем голос
                    newOptionIds = [...currentVotedOptionIds, optionId];
                }
            } else {
                // Одиночный выбор: можно выбрать только один раз
                if (currentVotedOptionIds.length > 0) {
                    // Уже проголосовано - нельзя изменить
                    setIsVoting(false);
                    return;
                } else {
                    // Выбираем вариант
                    newOptionIds = [optionId];
                }
            }

            const result = await ChatApi.votePoll(pollId, newOptionIds);
            
            // Обновляем опрос из ответа
            // Сервер возвращает: { status: 'success', data: { poll: ... } }
            let updatedPoll = null;
            
            // Проверяем разные возможные форматы ответа
            if (result?.data?.data?.poll) {
                updatedPoll = result.data.data.poll;
            } else if (result?.data?.poll) {
                updatedPoll = result.data.poll;
            } else if (result?.poll) {
                updatedPoll = result.poll;
            } else if (result?.data?.data && result.data.data.options) {
                // Если это сам опрос без обертки
                updatedPoll = result.data.data;
            }
            
            if (updatedPoll && updatedPoll.options) {
                setPoll(updatedPoll);
            } else {
                // Если не получили обновленный опрос, ждем обновления через WebSocket или message.poll
                // Опрос обновится через useEffect когда придет обновленное сообщение
                // Но также проверяем message.poll напрямую
                if (message.poll && message.poll.id && typeof message.poll.id === 'number') {
                    setPoll(message.poll);
                }
            }
        } catch (error) {
            // Ошибка обрабатывается через UI
        } finally {
            setIsVoting(false);
        }
    }, [poll, isVoting, currentUserId]);

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
        >
            <View style={styles.pollContainer}>
                <Text style={styles.pollQuestion}>{poll.question}</Text>
                
                {/* Заголовок с иконкой */}
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
                    // Запрещаем изменение голоса: если уже проголосовано, нельзя изменить
                    const hasVoted = userVotedOptions.length > 0;
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
                            {/* Полоска слева для выбранного варианта */}
                            {hasVoted && isVoted && (
                                <View style={styles.pollOptionLeftBar} />
                            )}
                            
                            <View style={styles.pollOptionRow}>
                                {/* Радио кнопка или чекбокс */}
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
                
                {/* Информация о голосах */}
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

const BubbleContainer = ({
                             isOwn,
                             showAvatar,
                             avatarUri,
                             children,
                             status,
                             time,
                             text,
                             hasImage,
                             // Пропсы для выбора
                             isSelectionMode = false,
                             isSelected = false,
                             isHighlighted = false,
                             isContextMenuActive = false,
                             hasContextMenu = false,
                             canDelete = false,
                             onToggleSelection,
                             onLongPress,
                             // Пропс для открытия профиля при клике на аватар
                             onAvatarPress,
                             // Пропсы для ответов
                             replyTo,
                             onReplyPress,
                             onReply,
                             currentUserId
                         }) => {
    const containerRef = useRef(null);
    const [textWidth, setTextWidth] = useState(0);
    const [timeWidth, setTimeWidth] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);

    const handleTextLayout = (event) => {
        setTextWidth(event.nativeEvent.layout.width);
    };

    const handleTimeLayout = (event) => {
        setTimeWidth(event.nativeEvent.layout.width);
    };

    const handleContainerLayout = (event) => {
        setContainerWidth(event.nativeEvent.layout.width);
    };

    // Определяем, помещается ли время рядом с текстом
    const timeSpace = isOwn ? timeWidth + 20 : timeWidth; // +20 для галочек у исходящих (уменьшено с 30)
    const canFitInline = textWidth + timeSpace < 280; // максимальная ширина пузыря
    const isShortMessage = text && text.length < 30; // короткое сообщение

    // Для сообщений с изображениями не используем inline время
    const shouldShowTimeInline = !hasImage && canFitInline && isShortMessage;

    // Обработчик long press - измеряем позицию и передаем в onLongPress
    const handleLongPress = useCallback(() => {
        if (onLongPress && containerRef.current) {
            containerRef.current.measureInWindow((x, y, width, height) => {
                // Передаем координаты центра сообщения
                onLongPress({ x: x + width / 2, y: y + height / 2 });
            });
        } else if (onLongPress) {
            onLongPress();
        }
    }, [onLongPress]);

    // Обработчик нажатия для выбора сообщений
    const handlePress = useCallback(() => {
        if (onToggleSelection) {
            onToggleSelection();
        }
    }, [onToggleSelection]);

    const canPress = isSelectionMode || hasContextMenu;

    return (
        <TouchableOpacity
            ref={containerRef}
            style={[
                styles.messageContainer,
                isOwn ? styles.ownMessageContainer : styles.otherMessageContainer,
                // Затемнение при выборе сообщения в режиме выбора
                isSelectionMode && isSelected && styles.selectedMessageContainer,
                // Затемнение родительского контейнера при активном контекстном меню (только вне режима выбора)
                !isSelectionMode && isContextMenuActive && (isOwn ? styles.contextMenuActiveContainerOwn : styles.contextMenuActiveContainerOther)
            ]}
            onLongPress={handleLongPress}
            onPress={canPress ? handlePress : undefined}
            activeOpacity={canPress ? 0.7 : 1}
            disabled={false}
        >
            {/* Измерительные компоненты (невидимые) */}
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

            {/* Аватар вверху для входящих сообщений */}
            {!isOwn && showAvatar && (
                <View style={styles.avatarContainer}>
                    <Avatar uri={avatarUri} onPress={onAvatarPress}/>
                </View>
            )}

            {/* Пустое место для входящих без аватара */}
            {!isOwn && !showAvatar && <View style={styles.avatarSpacer}/>}

            {/* Контейнер пузыря */}
            <View style={[styles.bubbleWrapper, isOwn && styles.ownBubbleWrapper]}>
                <View
                    style={[
                        styles.bubble, 
                        isOwn ? styles.ownBubble : styles.otherBubble,
                        isHighlighted && styles.highlightedBubble
                    ]}
                    onLayout={handleContainerLayout}
                >
                    {/* Контент сообщения */}
                    <View style={styles.messageContent}>
                        {/* Превью ответа */}
                        {replyTo && (
                            <ReplyPreview
                                replyTo={replyTo}
                                onPress={() => onReplyPress?.(replyTo)}
                                isInMessage={true}
                                currentUserId={currentUserId}
                            />
                        )}
                        
                        {shouldShowTimeInline ? (
                            // Время в одной строке с текстом для коротких сообщений
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
                            // Обычная компоновка для длинных сообщений и сообщений с изображениями
                            <>
                                <View style={styles.textContainer}>
                                    {children}
                                </View>
                                {/* Футер с временем показываем только если time не пустое */}
                                {time && (
                                    <View style={styles.messageFooter}>
                                        <Text style={styles.timestamp}>{time}</Text>
                                        {isOwn && <StatusTicks status={status}/>}
                                    </View>
                                )}
                            </>
                        )}
                    </View>

                    {/* Хвостик WhatsApp внизу - ИСПРАВЛЕНО */}
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
                         isContextMenuActive,
                         hasContextMenu,
                         canDelete,
                         onToggleSelection,
                         onLongPress,
                         onAvatarPress,
                         replyTo,
                         onReplyPress,
                         onReply,
                         currentUserId,
                         message,
                         onAddReaction,
                         onRemoveReaction,
                         onShowReactionPicker
                     }) => {
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
                isContextMenuActive={isContextMenuActive}
                hasContextMenu={hasContextMenu}
                canDelete={canDelete}
                onToggleSelection={onToggleSelection}
                onLongPress={onLongPress}
                onAvatarPress={onAvatarPress}
                replyTo={replyTo}
                onReplyPress={onReplyPress}
                onReply={onReply}
                currentUserId={currentUserId}
            >
                <Text style={styles.messageText}>{text}</Text>
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
                          isContextMenuActive,
                          hasContextMenu,
                          canDelete,
                          onToggleSelection,
                          onLongPress,
                          onAvatarPress,
                          replyTo,
                          onReplyPress,
                          onReply,
                          currentUserId,
                          message,
                          onAddReaction
                      }) => (
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
            isContextMenuActive={isContextMenuActive}
            hasContextMenu={hasContextMenu}
            canDelete={canDelete}
            onToggleSelection={onToggleSelection}
            onLongPress={onLongPress}
            onAvatarPress={onAvatarPress}
            replyTo={replyTo}
            onReplyPress={onReplyPress}
            onReply={onReply}
            currentUserId={currentUserId}
        >
            <View style={styles.imageContainer}>
                {attachments.map((attachment, index) => (
                    <View key={attachment.id || index} style={styles.imageWrapper}>
                        <TouchableOpacity
                            onPress={() => onImagePress?.(attachment.path)}
                            activeOpacity={0.8}
                        >
                            <CachedImage
                                source={{uri: attachment.path}}
                                style={styles.messageImage}
                                resizeMode="cover"
                            />
                        </TouchableOpacity>
                    </View>
                ))}
                {/* Подпись отображается под изображением в том же пузырьке */}
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

const ProductMessage = ({
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
                            isContextMenuActive,
                            hasContextMenu,
                            canDelete,
                            onToggleSelection,
                            onLongPress,
                            onAvatarPress,
                            replyTo,
                            onReplyPress,
                            onReply,
                            currentUserId,
                            message,
                            onAddReaction
                        }) => {

    const transformedProduct = {
        id: product.productId || productId,
        name: product.name,
        description: product.description,
        price: product.price,
        images: product.images || [],
        image: product.images && product.images.length > 0
            ? `${getBaseUrl()}/uploads/${product.images[0]}`
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
                isContextMenuActive={isContextMenuActive}
                canDelete={canDelete}
                onToggleSelection={onToggleSelection}
                onLongPress={onLongPress}
                onAvatarPress={onAvatarPress}
                replyTo={replyTo}
                onReplyPress={onReplyPress}
                onReply={onReply}
                currentUserId={currentUserId}
            >
                <View style={styles.productCardContainer}>
                    <ProductCard
                        product={transformedProduct}
                        productId={productId}
                        onPress={() => onOpenProduct?.(productId)}
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
                          isContextMenuActive,
                          hasContextMenu,
                          canDelete,
                          onToggleSelection,
                          onLongPress,
                          onAvatarPress,
                          onContactDriver,
                          replyTo,
                          onReplyPress,
                          onReply,
                          currentUserId,
                          message,
                          onAddReaction
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

    // Логирование для отладки
    if (__DEV__) {
        console.log('StopMessage: transformedStop', {
            stopId: transformedStop.stopId,
            hasPhoto: !!transformedStop.photo,
            photo: transformedStop.photo,
            originalStop: stop
        });
    }

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
                isContextMenuActive={isContextMenuActive}
                canDelete={canDelete}
                onToggleSelection={onToggleSelection}
                onLongPress={onLongPress}
                onAvatarPress={onAvatarPress}
                replyTo={replyTo}
                onReplyPress={onReplyPress}
                onReply={onReply}
                currentUserId={currentUserId}
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
                                       onImagePress,
                                       showAvatar = true,
                                       incomingAvatarUri,
                                       isSelectionMode = false,
                                       isSelected = false,
                                       isHighlighted = false,
                                       isContextMenuActive = false,
                                       hasContextMenu = false,
                                       canDelete = false,
                                       onToggleSelection,
                                       onLongPress,
                                       onRetryMessage,
                                       onCancelMessage,
                                       isRetrying = false,
                                       onAvatarPress,
                                       onContactDriver,
                                       onReply,
                                       onReplyPress,
                                       onAddReaction,
                                       onRemoveReaction,
                                       onShowReactionPicker
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
    const avatarUri = avatarUriBase || (!isOwn ? incomingAvatarUri : null);

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
                    isContextMenuActive={isContextMenuActive}
                    hasContextMenu={hasContextMenu}
                    canDelete={canDelete}
                    onToggleSelection={onToggleSelection}
                    onLongPress={onLongPress}
                    onAvatarPress={onAvatarPress}
                    replyTo={message.replyTo}
                    onReplyPress={onReplyPress}
                    onReply={() => onReply?.(message)}
                    currentUserId={currentUserId}
                    message={message}
                    onAddReaction={onAddReaction}
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
                    isContextMenuActive={isContextMenuActive}
                    hasContextMenu={hasContextMenu}
                    canDelete={canDelete}
                    onToggleSelection={onToggleSelection}
                    onLongPress={onLongPress}
                    onAvatarPress={onAvatarPress}
                    replyTo={message.replyTo}
                    onReplyPress={onReplyPress}
                    onReply={() => onReply?.(message)}
                    currentUserId={currentUserId}
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
                    isContextMenuActive={isContextMenuActive}
                    hasContextMenu={hasContextMenu}
                    canDelete={canDelete}
                    onToggleSelection={onToggleSelection}
                    onLongPress={onLongPress}
                    onAvatarPress={onAvatarPress}
                    replyTo={message.replyTo}
                    onReplyPress={onReplyPress}
                    onReply={() => onReply?.(message)}
                    currentUserId={currentUserId}
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
                    isContextMenuActive={isContextMenuActive}
                    canDelete={canDelete}
                    onToggleSelection={onToggleSelection}
                    onLongPress={onLongPress}
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
        if (!productData) {
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
                    isContextMenuActive={isContextMenuActive}
                    canDelete={canDelete}
                    onToggleSelection={onToggleSelection}
                    onLongPress={onLongPress}
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

        return (
            <ProductMessage
                product={productData}
                productId={productId}
                isOwn={isOwn}
                time={time}
                status={status}
                onOpenProduct={onOpenProduct}
                avatarUri={avatarUri}
                showAvatar={showAvatar}
                isSelectionMode={isSelectionMode}
                isSelected={isSelected}
                isContextMenuActive={isContextMenuActive}
                hasContextMenu={hasContextMenu}
                canDelete={canDelete}
                onToggleSelection={onToggleSelection}
                onLongPress={onLongPress}
                onAvatarPress={onAvatarPress}
                replyTo={message.replyTo}
                onReplyPress={onReplyPress}
                onReply={() => onReply?.(message)}
                currentUserId={currentUserId}
                message={message}
                onAddReaction={onAddReaction}
                onShowReactionPicker={onShowReactionPicker}
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
                isContextMenuActive={isContextMenuActive}
                hasContextMenu={hasContextMenu}
                canDelete={canDelete}
                onToggleSelection={onToggleSelection}
                onLongPress={onLongPress}
                onAvatarPress={onAvatarPress}
                currentUserId={currentUserId}
                replyTo={message.replyTo}
                onReplyPress={onReplyPress}
                onReply={() => onReply?.(message)}
                onAddReaction={onAddReaction}
                onShowReactionPicker={onShowReactionPicker}
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
                // Логирование для отладки
                if (__DEV__) {
                    console.log('StopMessage: Using message.stop relation', {
                        stopId,
                        hasPhoto: !!stopData?.photo,
                        photo: stopData?.photo,
                        stopData
                    });
                }
            }
            // Если не получилось, пробуем из content
            else if (message?.content) {
                stopData = JSON.parse(message.content);
                stopId = stopData?.stopId || message?.stopId;
                // Логирование для отладки
                if (__DEV__) {
                    console.log('StopMessage: Using message.content', {
                        stopId,
                        hasPhoto: !!stopData?.photo,
                        photo: stopData?.photo,
                        stopData
                    });
                }
            }
        } catch (error) {
            // Ошибка парсинга обрабатывается через fallback UI
            if (__DEV__) {
                console.error('StopMessage: Error parsing stop data', error);
            }
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
                    isContextMenuActive={isContextMenuActive}
                    canDelete={canDelete}
                    onToggleSelection={onToggleSelection}
                    onLongPress={onLongPress}
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
                    isContextMenuActive={isContextMenuActive}
                    canDelete={canDelete}
                    onToggleSelection={onToggleSelection}
                    onLongPress={onLongPress}
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
                isContextMenuActive={isContextMenuActive}
                hasContextMenu={hasContextMenu}
                canDelete={canDelete}
                onToggleSelection={onToggleSelection}
                onLongPress={onLongPress}
                onAvatarPress={onAvatarPress}
                onContactDriver={onContactDriver}
                replyTo={message.replyTo}
                onReplyPress={onReplyPress}
                onReply={() => onReply?.(message)}
                currentUserId={currentUserId}
                message={message}
                onAddReaction={onAddReaction}
                onShowReactionPicker={onShowReactionPicker}
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
            isContextMenuActive={isContextMenuActive}
            hasContextMenu={hasContextMenu}
            canDelete={canDelete}
            onToggleSelection={onToggleSelection}
            onLongPress={onLongPress}
            onAvatarPress={onAvatarPress}
            replyTo={message.replyTo}
            onReplyPress={onReplyPress}
            onReply={() => onReply?.(message)}
            currentUserId={currentUserId}
            message={message}
            onAddReaction={onAddReaction}
            onRemoveReaction={onRemoveReaction}
            onShowReactionPicker={onShowReactionPicker}
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
    
    const shouldSkipRender = (
        prevProps.message?.id === nextProps.message?.id &&
        prevProps.message?.status === nextProps.message?.status &&
        prevProps.currentUserId === nextProps.currentUserId &&
        prevProps.showAvatar === nextProps.showAvatar &&
        prevProps.incomingAvatarUri === nextProps.incomingAvatarUri &&
        prevProps.isSelectionMode === nextProps.isSelectionMode &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.isHighlighted === nextProps.isHighlighted &&
        prevProps.canDelete === nextProps.canDelete
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
        minWidth: 260,
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

    // Контент
    messageContent: {
        minWidth: 20,
    },
    textContainer: {
        flexShrink: 1,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 19,
        color: '#000000',
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
        overflow: 'visible',
        borderRadius: 13,
        minWidth: 180,
    },
    imageWrapper: {
        position: 'relative',
        marginBottom: 0,
    },
    messageImage: {
        width: 250,
        height: 250,
        backgroundColor: '#F0F0F0',
        borderRadius: 13,
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
});

export default MessageBubble;
