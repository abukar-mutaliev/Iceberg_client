import React, {memo, useState} from 'react';
import {View, Text, Image, TouchableOpacity, StyleSheet} from 'react-native';
import {ProductCard} from '@entities/product/ui/ProductCard';
import {VoiceMessageBubble} from './VoiceMessageBubble';
import {MessageErrorActions} from './MessageErrorActions';
import {getBaseUrl} from '@shared/api/api';

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
                             canDelete = false,
                             onToggleSelection,
                             onLongPress,
                             // Пропс для открытия профиля при клике на аватар
                             onAvatarPress
                         }) => {
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

    return (
        <TouchableOpacity
            style={[
                styles.messageContainer,
                isOwn ? styles.ownMessageContainer : styles.otherMessageContainer,
                isSelectionMode && isSelected && styles.selectedMessageContainer
            ]}
            onLongPress={canDelete ? onLongPress : undefined}
            onPress={isSelectionMode && canDelete ? onToggleSelection : undefined}
            activeOpacity={isSelectionMode ? 0.7 : 1}
            disabled={!canDelete}
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
                    style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}
                    onLayout={handleContainerLayout}
                >
                    {/* Контент сообщения */}
                    <View style={styles.messageContent}>
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
                         canDelete,
                         onToggleSelection,
                         onLongPress,
                         onAvatarPress
                     }) => (
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
        canDelete={canDelete}
        onToggleSelection={onToggleSelection}
        onLongPress={onLongPress}
        onAvatarPress={onAvatarPress}
    >
        <Text style={styles.messageText}>{text}</Text>
    </BubbleContainer>
);

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
                          canDelete,
                          onToggleSelection,
                          onLongPress,
                          onAvatarPress
                      }) => {
    return (
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
            canDelete={canDelete}
            onToggleSelection={onToggleSelection}
            onLongPress={onLongPress}
            onAvatarPress={onAvatarPress}
        >
            <View style={styles.imageContainer}>
                {attachments.map((attachment, index) => (
                    <View key={attachment.id || index} style={styles.imageWrapper}>
                        <TouchableOpacity
                            onPress={() => onImagePress?.(attachment.path)}
                            activeOpacity={0.8}
                        >
                            <Image
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
    );
};


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
                            canDelete,
                            onToggleSelection,
                            onLongPress,
                            onAvatarPress
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
            canDelete={canDelete}
            onToggleSelection={onToggleSelection}
            onLongPress={onLongPress}
            onAvatarPress={onAvatarPress}
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
                                       onImagePress,
                                       showAvatar = true,
                                       incomingAvatarUri,
                                       isSelectionMode = false,
                                       isSelected = false,
                                       canDelete = false,
                                       onToggleSelection,
                                       onLongPress,
                                       onRetryMessage,
                                       onCancelMessage,
                                       isRetrying = false,
                                       onAvatarPress
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
                canDelete={canDelete}
                onToggleSelection={onToggleSelection}
                onLongPress={onLongPress}
                onAvatarPress={onAvatarPress}
            />
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
                    canDelete={canDelete}
                    onToggleSelection={onToggleSelection}
                    onLongPress={onLongPress}
                    onAvatarPress={onAvatarPress}
                />
            );
        }

        // Для голосовых сообщений используем BubbleContainer, но время и статус передаем в компонент
        return (
            <View>
                <BubbleContainer
                    isOwn={isOwn}
                    time={''}  // Пустое время - VoiceMessageBubble сам его отобразит
                    status={''}  // Пустой статус - VoiceMessageBubble сам отобразит галочки
                    avatarUri={avatarUri}
                    showAvatar={showAvatar}
                    text={''}
                    hasImage={false}
                    isSelectionMode={isSelectionMode}
                    isSelected={isSelected}
                    canDelete={canDelete}
                    onToggleSelection={onToggleSelection}
                    onLongPress={onLongPress}
                    onAvatarPress={onAvatarPress}
                >
                    <VoiceMessageBubble
                        messageId={message.id}
                        attachment={voiceAttachment}
                        isOwnMessage={isOwn}
                        time={time}
                        status={status}
                    />
                </BubbleContainer>
                
                {/* Показываем кнопки retry/cancel только для своих сообщений */}
                {isOwn && message.status === 'FAILED' && message.isRetryable && (
                    <MessageErrorActions
                        message={message}
                        onRetry={() => onRetryMessage?.(message)}
                        onCancel={() => onCancelMessage?.(message)}
                        isRetrying={isRetrying}
                    />
                )}
            </View>
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
                console.log('MessageBubble: Получены данные о товаре из content:', productData);
            }
            // Если не получилось, пробуем из product (старый способ)
            else if (message?.product) {
                productData = message.product;
                console.log('MessageBubble: Получены данные о товаре из product:', productData);
            }
        } catch (error) {
            console.error('MessageBubble: Ошибка парсинга данных о товаре:', error);
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
                    canDelete={canDelete}
                    onToggleSelection={onToggleSelection}
                    onLongPress={onLongPress}
                    onAvatarPress={onAvatarPress}
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
                    canDelete={canDelete}
                    onToggleSelection={onToggleSelection}
                    onLongPress={onLongPress}
                    onAvatarPress={onAvatarPress}
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
                canDelete={canDelete}
                onToggleSelection={onToggleSelection}
                onLongPress={onLongPress}
                onAvatarPress={onAvatarPress}
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
            canDelete={canDelete}
            onToggleSelection={onToggleSelection}
            onLongPress={onLongPress}
            onAvatarPress={onAvatarPress}
        />
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.message?.id === nextProps.message?.id &&
        prevProps.message?.status === nextProps.message?.status &&
        prevProps.currentUserId === nextProps.currentUserId &&
        prevProps.showAvatar === nextProps.showAvatar &&
        prevProps.incomingAvatarUri === nextProps.incomingAvatarUri &&
        prevProps.isSelectionMode === nextProps.isSelectionMode &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.canDelete === nextProps.canDelete
    );
});

const styles = StyleSheet.create({
    messageContainer: {
        flexDirection: 'row',
        marginVertical: 1,
        alignItems: 'flex-start',
        marginHorizontal: -8,
        paddingHorizontal: 16,
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
});

export default MessageBubble;