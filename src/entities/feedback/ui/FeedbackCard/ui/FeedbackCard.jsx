import React, { useState, lazy, Suspense, memo, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, TextInput } from 'react-native';
import { useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { selectUser } from '@entities/auth';
import { FeedbackCardHeader } from './FeedbackCardHeader';
import { FeedbackCardPhotos } from './FeedbackCardPhotos';
import IconDelete from "@shared/ui/Icon/Profile/IconDelete";
import { Color } from '@app/styles/GlobalStyles'

const PhotoViewerModal = lazy(() =>
    import('@features/feedback/FeedbackPhotoViewerModal').then(module => ({
        default: module.FeedbackPhotoViewerModal,
    }))
);

export const FeedbackCard = memo(({
                               feedback,
                               feedbacks = null,
                               canDelete = false,
                               onDelete = null,
                               onExpandComment = null,
                               onProductPress = () => {},
                               onAuthorPress = null,
                               canReply = false,
                               onReplySubmit = null,
                               isReplySubmitting = false,
                           }) => {
    const feedbackData = feedback || feedbacks;
    if (!feedbackData) return null;

    const currentUser = useSelector(selectUser);
    const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
    const [isCommentExpanded, setIsCommentExpanded] = useState(false);
    const [isReplyExpanded, setIsReplyExpanded] = useState(false);
    const [isReplyEditorVisible, setIsReplyEditorVisible] = useState(false);
    const [replyInput, setReplyInput] = useState('');

    const COMMENT_MAX_LINES = 3;
    const REPLY_MAX_LINES = 2;
    const existingReply = feedbackData.supplierReply || feedbackData.reply || '';

    useEffect(() => {
        setReplyInput(existingReply);
    }, [existingReply, feedbackData.id]);

    const handlePhotoPress = useCallback((index) => {
        setSelectedPhotoIndex(index);
        setPhotoViewerVisible(true);
    }, []);

    const handleClosePhotoViewer = useCallback(() => {
        setPhotoViewerVisible(false);
    }, []);

    const handleToggleComment = useCallback(() => {
        const newState = !isCommentExpanded;
        setIsCommentExpanded(newState);
        if (onExpandComment) {
            onExpandComment(feedbackData.id, newState);
        }
    }, [isCommentExpanded, feedbackData.id, onExpandComment]);

    const handleToggleReply = useCallback(() => {
        const newState = !isReplyExpanded;
        setIsReplyExpanded(newState);
        if (onExpandComment) {
            onExpandComment(newState);
        }
    }, [isReplyExpanded, onExpandComment]);

    const handleDelete = useCallback(() => {
        if (onDelete) {
            onDelete(feedbackData.id);
        }
    }, [feedbackData.id, onDelete]);

    const handleSubmitReply = useCallback(async () => {
        const trimmedReply = replyInput.trim();
        if (!trimmedReply || !onReplySubmit) return;
        try {
            await onReplySubmit(feedbackData.id, trimmedReply);
            setIsReplyEditorVisible(false);
        } catch (error) {
            // Ошибка обрабатывается в вызывающем компоненте
        }
    }, [replyInput, onReplySubmit, feedbackData.id]);

    const commentLength = feedbackData.comment?.length || 0;
    const replyLength = existingReply?.length || 0;
    const shouldShowCommentButton = commentLength > 150;
    const shouldShowReplyButton = replyLength > 80;
    const hasPhotos = feedbackData.photoUrls && Array.isArray(feedbackData.photoUrls) && feedbackData.photoUrls.length > 0;

    return (
        <View style={styles.cardWrapper}>
            <View style={styles.card}>
                <LinearGradient
                    style={styles.feedbackBackground}
                    locations={[0, 0.99]}
                    colors={['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)']}
                    useAngle={true}
                    angle={180}
                />
                <FeedbackCardHeader feedback={feedbackData} currentUser={currentUser} onAuthorPress={onAuthorPress} />
                {hasPhotos && (
                    <FeedbackCardPhotos
                        photoUrls={feedbackData.photoUrls}
                        onPhotoPress={handlePhotoPress}
                    />
                )}
                {commentLength > 0 && (
                    <View style={styles.commentContainer}>
                        <Text
                            style={styles.commentText}
                            numberOfLines={isCommentExpanded ? undefined : COMMENT_MAX_LINES}
                        >
                            {feedbackData.comment}
                        </Text>
                        {shouldShowCommentButton && (
                            <TouchableOpacity onPress={handleToggleComment} style={styles.showMoreButton}>
                                <Text style={styles.showMoreText}>
                                    {isCommentExpanded ? 'скрыть' : 'еще'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
                {replyLength > 0 && (
                    <View style={styles.replyContainer}>
                        <View style={styles.replyBackground} />
                        <View style={styles.replyBadgeContainer}>
                            <Text style={styles.replyBadgeText}>Ответ поставщика</Text>
                        </View>
                        <View style={styles.replyTextContainer}>
                            <Text
                                style={styles.replyText}
                                numberOfLines={isReplyExpanded ? undefined : REPLY_MAX_LINES}
                            >
                                {existingReply}
                            </Text>
                        </View>
                        {shouldShowReplyButton && (
                            <TouchableOpacity onPress={handleToggleReply} style={styles.showMoreButtonReply}>
                                <Text style={styles.showMoreText}>
                                    {isReplyExpanded ? 'скрыть' : 'еще'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
                {canReply && (
                    <View style={styles.replyActionsContainer}>
                        {!isReplyEditorVisible ? (
                            <TouchableOpacity
                                onPress={() => setIsReplyEditorVisible(true)}
                                style={styles.replyActionButton}
                            >
                                <Text style={styles.replyActionButtonText}>
                                    {existingReply ? 'Изменить ответ' : 'Ответить на отзыв'}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.replyEditorContainer}>
                                <TextInput
                                    value={replyInput}
                                    onChangeText={setReplyInput}
                                    placeholder="Введите ответ поставщика..."
                                    multiline
                                    maxLength={2000}
                                    style={styles.replyInput}
                                    textAlignVertical="top"
                                    editable={!isReplySubmitting}
                                />
                                <View style={styles.replyEditorButtonsRow}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setIsReplyEditorVisible(false);
                                            setReplyInput(existingReply);
                                        }}
                                        style={[styles.replyEditorButton, styles.replyEditorCancelButton]}
                                        disabled={isReplySubmitting}
                                    >
                                        <Text style={styles.replyEditorCancelButtonText}>Отмена</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleSubmitReply}
                                        style={[
                                            styles.replyEditorButton,
                                            styles.replyEditorSubmitButton,
                                            (!replyInput.trim() || isReplySubmitting) && styles.replyEditorSubmitButtonDisabled
                                        ]}
                                        disabled={!replyInput.trim() || isReplySubmitting}
                                    >
                                        <Text style={styles.replyEditorSubmitButtonText}>
                                            {isReplySubmitting ? 'Сохранение...' : 'Сохранить'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                )}
                {canDelete && onDelete && (
                    <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                        <IconDelete color={Color.red} />
                    </TouchableOpacity>
                )}
                {photoViewerVisible && hasPhotos && (
                    <Suspense fallback={<View />}>
                        <PhotoViewerModal
                            photos={feedbackData.photoUrls}
                            initialIndex={selectedPhotoIndex}
                            visible={photoViewerVisible}
                            onClose={handleClosePhotoViewer}
                        />
                    </Suspense>
                )}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    cardWrapper: {
        width: '100%',
        marginBottom: 16,
        borderRadius: 19,
        backgroundColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
    },
    card: {
        width: '100%',
        position: 'relative',
        marginBottom: 0,
        backgroundColor: 'white',
        borderRadius: 19,
        overflow: 'hidden',
        paddingBottom: 12,
    },
    feedbackBackground: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 19,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderColor: '#c1fff4',
        borderWidth: 0.5,
    },
    commentContainer: {
        paddingHorizontal: 16,
        marginTop: 8,
        position: 'relative',
    },
    commentText: {
        fontSize: 13,
        lineHeight: 18,
        paddingBottom: 10,
    },
    replyContainer: {
        marginHorizontal: 16,
        marginTop: 10,
        marginBottom: 5,
        position: 'relative',
        borderRadius: 10,
        overflow: 'hidden',
    },
    replyBackground: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 10,
        backgroundColor: '#F5F5F5',
    },
    replyTextContainer: {
        padding: 12,
        paddingRight: 25,
        paddingTop: 8,
    },
    replyText: {
        fontSize: 13,
        lineHeight: 18,
    },
    replyBadgeContainer: {
        alignSelf: 'flex-start',
        marginLeft: 10,
        marginTop: 8,
        backgroundColor: '#6B4EFF',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    replyBadgeText: {
        fontSize: 10,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    replyActionsContainer: {
        marginHorizontal: 16,
        marginTop: 8,
    },
    replyActionButton: {
        alignSelf: 'flex-start',
        paddingVertical: 4,
        paddingHorizontal: 2,
    },
    replyActionButtonText: {
        fontSize: 13,
        color: '#6B4EFF',
        fontWeight: '500',
    },
    replyEditorContainer: {
        marginTop: 4,
    },
    replyInput: {
        minHeight: 80,
        maxHeight: 140,
        borderWidth: 1,
        borderColor: '#D9D9D9',
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        lineHeight: 18,
        color: '#1A1A1A',
    },
    replyEditorButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 8,
    },
    replyEditorButton: {
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    replyEditorCancelButton: {
        backgroundColor: '#ECECEC',
    },
    replyEditorCancelButtonText: {
        fontSize: 12,
        color: '#444444',
        fontWeight: '500',
    },
    replyEditorSubmitButton: {
        backgroundColor: '#6B4EFF',
        marginLeft: 8,
    },
    replyEditorSubmitButtonDisabled: {
        backgroundColor: '#B9B0FF',
    },
    replyEditorSubmitButtonText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    showMoreButton: {
        alignItems: 'flex-end',
        paddingTop: 4,
    },
    showMoreButtonReply: {
        position: 'absolute',
        bottom: 5,
        right: 10,
    },
    showMoreText: {
        fontSize: 13,
        color: '#6B4EFF',
        bottom: 10,
        padding: 5,
    },
    deleteButton: {
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        backgroundColor: 'transparent',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 5,
    },
    deleteButtonText: {
        color: 'white',
        fontSize: 12,
    },
    productLink: {
        paddingHorizontal: 16,
        marginTop: 8,
    },
    productLinkText: {
        fontSize: 13,
        color: '#5E00FF',
        fontWeight: '500',
    },
});

export default FeedbackCard;