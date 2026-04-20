import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    FlatList
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { FontFamily } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { useCustomAlert } from '@shared/ui/CustomAlert/CustomAlertProvider';
import { 
    fetchMyAppFeedback, 
    createAppFeedback, 
    updateAppFeedback,
    deleteAppFeedback,
    fetchAllAppFeedbacks,
    selectAppFeedback,
    selectAppFeedbackLoading,
    selectAppFeedbackSubmitting,
    selectAppFeedbackError,
    selectAllAppFeedbacks,
    selectAllAppFeedbacksLoading
} from '@entities/appFeedback';
import { AppFeedbackForm } from '@entities/appFeedback/ui/AppFeedbackForm';
import CustomButton from '@shared/ui/Button/CustomButton';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RatingStarSvg from '@shared/ui/Icon/SupplierScreenIcons/RatingStarSvg';
import { useAuth } from '@entities/auth/hooks/useAuth';

/**
 * Компонент секции отзывов о приложении
 */
export const AppFeedbackSection = ({ onFeedbackFieldFocus }) => {
    const dispatch = useDispatch();
    const { currentUser } = useAuth();
    const { showSuccess, showError, showConfirm } = useCustomAlert();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const feedback = useSelector(selectAppFeedback);
    const loading = useSelector(selectAppFeedbackLoading);
    const submitting = useSelector(selectAppFeedbackSubmitting);
    const error = useSelector(selectAppFeedbackError);
    const allFeedbacks = useSelector(selectAllAppFeedbacks);
    const loadingAll = useSelector(selectAllAppFeedbacksLoading);

    const [isEditing, setIsEditing] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const isSuperAdmin =
        currentUser?.role === 'ADMIN' &&
        Boolean(
            currentUser?.admin?.isSuperAdmin ||
                currentUser?.profile?.isSuperAdmin ||
                currentUser?.isSuperAdmin
        );

    // Загрузка отзыва при монтировании
    useEffect(() => {
        dispatch(fetchMyAppFeedback());
        dispatch(fetchAllAppFeedbacks());
    }, [dispatch]);

    // Управление отображением формы и отзыва
    useEffect(() => {
        if (!loading) {
            if (feedback) {
                // Если есть отзыв, скрываем форму (если не в режиме редактирования)
                if (!isEditing) {
                    setShowForm(false);
                }
            } else {
                // Если отзыва нет, показываем форму
                setShowForm(true);
            }
        }
    }, [loading, feedback, isEditing]);

    const handleSubmit = async (feedbackData) => {
        try {
            if (feedback) {
                // Обновляем существующий отзыв
                const result = await dispatch(updateAppFeedback({
                    id: feedback.id,
                    ...feedbackData
                })).unwrap();

                if (result) {
                    showSuccess('Успешно', 'Отзыв обновлен');
                    setIsEditing(false);
                    setShowForm(false);
                }
            } else {
                // Создаем новый отзыв
                const result = await dispatch(createAppFeedback(feedbackData)).unwrap();

                if (result) {
                    showSuccess('Успешно', 'Спасибо за ваш отзыв!');
                    setShowForm(false);
                }
            }
        } catch (err) {
            showError('Ошибка', err || 'Не удалось сохранить отзыв');
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
        setShowForm(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        if (feedback) {
            setShowForm(false);
        }
    };

    const handleDelete = () => {
        showConfirm(
            'Удалить отзыв?',
            'Вы уверены, что хотите удалить свой отзыв?',
            async () => {
                try {
                    await dispatch(deleteAppFeedback(feedback.id)).unwrap();
                    showSuccess('Успешно', 'Отзыв удален');
                    setShowForm(true);
                } catch (err) {
                    showError('Ошибка', err || 'Не удалось удалить отзыв');
                }
            },
            () => {}
        );
    };

    const handleDeleteOtherFeedback = (item) => {
        showConfirm(
            'Удалить отзыв?',
            'Удалить этот отзыв пользователя? Действие необратимо.',
            async () => {
                try {
                    await dispatch(deleteAppFeedback(item.id)).unwrap();
                    showSuccess('Успешно', 'Отзыв удалён');
                } catch (err) {
                    showError('Ошибка', err || 'Не удалось удалить отзыв');
                }
            },
            () => {}
        );
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <Text style={styles.sectionTitle}>Отзыв о приложении</Text>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingText}>Загрузка...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Отзыв о приложении</Text>
            
            {error && !loading && (
                <View style={styles.errorContainer}>
                    <Icon name="error-outline" size={24} color={colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => dispatch(fetchMyAppFeedback())}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.retryButtonText}>Повторить</Text>
                    </TouchableOpacity>
                </View>
            )}

            {showForm && (
                <View style={styles.formContainer}>
                    <AppFeedbackForm
                        initialRating={feedback?.rating || 0}
                        initialComment={feedback?.comment || ''}
                        onSubmit={handleSubmit}
                        onCancel={feedback && !isEditing ? handleCancel : undefined}
                        submitting={submitting}
                        onCommentFocus={onFeedbackFieldFocus}
                    />
                </View>
            )}

            {feedback && !showForm && (
                <View style={styles.feedbackContainer}>
                    <View style={styles.feedbackHeader}>
                        <View style={styles.ratingDisplay}>
                            <View style={styles.starsContainer}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <RatingStarSvg
                                        key={star}
                                        filled={star <= feedback.rating}
                                        width={20}
                                        height={20}
                                        color={colors.primary}
                                    />
                                ))}
                            </View>
                            <Text style={styles.ratingText}>{feedback.rating}/5</Text>
                        </View>
                        <View style={styles.actionsContainer}>
                            <TouchableOpacity
                                onPress={handleEdit}
                                style={styles.actionButton}
                                activeOpacity={0.7}
                            >
                                <Icon name="edit" size={20} color={colors.primary} />
                                <Text style={styles.actionButtonText}>Изменить</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleDelete}
                                style={styles.actionButton}
                                activeOpacity={0.7}
                            >
                                <Icon name="delete" size={20} color={colors.error} />
                                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Удалить</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    {feedback.comment && (
                        <View style={styles.commentContainer}>
                            <Text style={styles.commentText}>{feedback.comment}</Text>
                        </View>
                    )}
                    <Text style={styles.dateText}>
                        {new Date(feedback.createdAt).toLocaleDateString('ru-RU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </Text>
                </View>
            )}

            {/* Список отзывов других пользователей */}
            {allFeedbacks && allFeedbacks.length > 0 && (
                <View style={styles.allFeedbacksContainer}>
                    <Text style={styles.allFeedbacksTitle}>Отзывы других пользователей</Text>
                    {loadingAll ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={styles.loadingText}>Загрузка отзывов...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={allFeedbacks.filter(f => f.id !== feedback?.id)}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <View style={styles.otherFeedbackItem}>
                                    <View style={styles.otherFeedbackHeader}>
                                        <View style={styles.otherFeedbackRating}>
                                            <View style={styles.starsContainer}>
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <RatingStarSvg
                                                        key={star}
                                                        filled={star <= item.rating}
                                                        width={16}
                                                        height={16}
                                                        color={colors.primary}
                                                    />
                                                ))}
                                            </View>
                                            <Text style={styles.otherFeedbackRatingText}>
                                                {item.rating}/5
                                            </Text>
                                        </View>
                                        <View style={styles.otherFeedbackHeaderRight}>
                                            <Text style={styles.otherFeedbackDate}>
                                                {new Date(item.createdAt).toLocaleDateString('ru-RU', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </Text>
                                            {isSuperAdmin && (
                                                <TouchableOpacity
                                                    onPress={() => handleDeleteOtherFeedback(item)}
                                                    style={styles.otherFeedbackDeleteBtn}
                                                    activeOpacity={0.7}
                                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                >
                                                    <Icon
                                                        name="delete-outline"
                                                        size={20}
                                                        color={colors.error}
                                                    />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                    {item.comment && (
                                        <Text style={styles.otherFeedbackComment}>
                                            {item.comment}
                                        </Text>
                                    )}
                                    {item.user && (
                                        <Text style={styles.otherFeedbackUser}>
                                            {item.user.client?.name || 
                                             item.user.employee?.name || 
                                             item.user.admin?.name || 
                                             item.user.supplier?.companyName ||
                                             'Пользователь'}
                                        </Text>
                                    )}
                                </View>
                            )}
                            scrollEnabled={false}
                            ListEmptyComponent={
                                <Text style={styles.emptyText}>
                                    Пока нет отзывов от других пользователей
                                </Text>
                            }
                        />
                    )}
                </View>
            )}
        </View>
    );
};

const createStyles = (colors) => StyleSheet.create({
    container: {
        paddingHorizontal: normalize(20),
        paddingTop: normalize(16),
        paddingBottom: normalize(24),
        backgroundColor: colors.background,
    },
    sectionTitle: {
        fontSize: normalizeFont(22),
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(20),
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: normalize(20),
    },
    loadingText: {
        fontSize: normalizeFont(16),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginLeft: normalize(12),
    },
    errorContainer: {
        alignItems: 'center',
        padding: normalize(20),
        backgroundColor: colors.surfaceElevated,
        borderRadius: normalize(12),
    },
    errorText: {
        fontSize: normalizeFont(15),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        marginTop: normalize(12),
        marginBottom: normalize(16),
    },
    retryButton: {
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(10),
        backgroundColor: colors.primary,
        borderRadius: normalize(8),
    },
    retryButtonText: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: colors.menuItemActiveText,
        fontFamily: FontFamily.sFProText,
    },
    formContainer: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: normalize(12),
        padding: normalize(16),
    },
    feedbackContainer: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: normalize(12),
        padding: normalize(16),
    },
    feedbackHeader: {
        marginBottom: normalize(12),
    },
    ratingDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: normalize(12),
    },
    starsContainer: {
        flexDirection: 'row',
        marginRight: normalize(8),
        gap: normalize(4),
    },
    ratingText: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: normalize(16),
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: normalize(6),
    },
    actionButtonText: {
        fontSize: normalizeFont(14),
        color: colors.primary,
        fontFamily: FontFamily.sFProText,
    },
    deleteButtonText: {
        color: colors.error,
    },
    commentContainer: {
        marginTop: normalize(12),
        paddingTop: normalize(12),
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    commentText: {
        fontSize: normalizeFont(15),
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
        lineHeight: normalizeFont(22),
    },
    dateText: {
        fontSize: normalizeFont(12),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginTop: normalize(12),
    },
    allFeedbacksContainer: {
        marginTop: normalize(24),
        paddingTop: normalize(24),
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    allFeedbacksTitle: {
        fontSize: normalizeFont(18),
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(16),
    },
    otherFeedbackItem: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: normalize(12),
        padding: normalize(16),
        marginBottom: normalize(12),
    },
    otherFeedbackHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: normalize(8),
    },
    otherFeedbackHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: normalize(8),
    },
    otherFeedbackDeleteBtn: {
        padding: normalize(4),
    },
    otherFeedbackRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: normalize(8),
    },
    otherFeedbackRatingText: {
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
    },
    otherFeedbackDate: {
        fontSize: normalizeFont(12),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    otherFeedbackComment: {
        fontSize: normalizeFont(15),
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
        lineHeight: normalizeFont(22),
        marginBottom: normalize(8),
    },
    otherFeedbackUser: {
        fontSize: normalizeFont(12),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        fontStyle: 'italic',
    },
    emptyText: {
        fontSize: normalizeFont(14),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        padding: normalize(20),
    },
});

