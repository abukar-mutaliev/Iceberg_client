import React, { useState, lazy, Suspense, memo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { selectUser } from '@entities/auth';
import { FeedbackCardHeader } from './FeedbackCardHeader';
import { FeedbackCardPhotos } from './FeedbackCardPhotos';

const PhotoViewerModal = lazy(() =>
    import('@features/feedback/FeedbackPhotoViewerModal').then(module => ({
        default: module.FeedbackPhotoViewerModal,
    }))
);

const FeedbackCard = memo(({
                               feedback,
                               feedbacks = null,
                               canDelete = false,
                               onDelete = null,
                               onExpandComment = null,
                               onProductPress = () => {} // Добавляем пропс для перехода к продукту
                           }) => {
    const feedbackData = feedback || feedbacks;
    if (!feedbackData) return null;

    const currentUser = useSelector(selectUser);
    const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
    const [isCommentExpanded, setIsCommentExpanded] = useState(false);
    const [isReplyExpanded, setIsReplyExpanded] = useState(false);

    const COMMENT_MAX_LINES = 3;
    const REPLY_MAX_LINES = 2;

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
            onExpandCommentascendancy(newState);
        }
    }, [isReplyExpanded, feedbackData.id, onExpandComment]);

    const handleDelete = useCallback(() => {
        if (onDelete) {
            onDelete(feedbackData.id);
        }
    }, [feedbackData.id, onDelete]);

    const commentLength = feedbackData.comment?.length || 0;
    const replyLength = feedbackData.reply?.length || 0;
    const shouldShowCommentButton = commentLength > 150;
    const shouldShowReplyButton = replyLength > 80;
    const hasPhotos = feedbackData.photoUrls && Array.isArray(feedbackData.photoUrls) && feedbackData.photoUrls.length > 0;

    return (
        <View style={styles.card}>
            <LinearGradient
                style={styles.feedbackBackground}
                locations={[0, 0.99]}
                colors={['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)']}
                useAngle={true}
                angle={180}
            />
            <FeedbackCardHeader feedback={feedbackData} currentUser={currentUser} />
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
                    <View style={styles.replyTextContainer}>
                        <Text
                            style={styles.replyText}
                            numberOfLines={isReplyExpanded ? undefined : REPLY_MAX_LINES}
                        >
                            {feedbackData.reply}
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
            {canDelete && onDelete && (
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Text style={styles.deleteButtonText}>Удалить</Text>
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
    );
});

const styles = StyleSheet.create({
    card: {
        width: '100%',
        position: 'relative',
        marginBottom: 0,
        backgroundColor: 'transparent',
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
    },
    replyText: {
        fontSize: 13,
        lineHeight: 18,
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
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(255, 0, 0, 0.8)',
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

export { FeedbackCard };
export default FeedbackCard;