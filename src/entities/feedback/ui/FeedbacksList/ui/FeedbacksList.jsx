// FeedbacksList.jsx
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Alert
} from 'react-native';
import {useTheme} from '@app/providers/themeProvider/ThemeProvider';
import {FontFamily} from '@app/styles/GlobalStyles';
import {useSelector, useDispatch} from 'react-redux';
import {selectIsAuthenticated, selectUser} from '@entities/auth';
import {deleteFeedback, selectHasUserLeftFeedbackSafe} from '@entities/feedback';
import {FeedbackCard} from '@entities/feedback/ui/FeedbackCard';
import {FeedbackAddModal} from '@features/feedback';
import {useAuth} from "@entities/auth/hooks/useAuth";

export const FeedbacksList = React.memo(({
                                             productId,
                                             feedbacks = [],
                                             isLoading,
                                             error,
                                             isDataLoaded,
                                             showAddForm: initialShowForm = false,
                                             onFormClosed,
                                             style, onRefresh
                                         }) => {
    const {colors} = useTheme();
    const dispatch = useDispatch();
    const { isAuthenticated } = useAuth();
    const currentUser = useSelector(selectUser);

    // Проверяем, является ли пользователь клиентом
    const isClient = currentUser?.role === 'CLIENT';

    const [showAddForm, setShowAddForm] = useState(initialShowForm);
    const [refreshing, setRefreshing] = useState(false);

    const hasLeftFeedback = useSelector(selectHasUserLeftFeedbackSafe(currentUser?.profile?.id));

    useEffect(() => {
        setShowAddForm(initialShowForm);
    }, [initialShowForm]);

    const handleRefresh = useCallback(async () => {
        if (refreshing || isLoading) return;

        setRefreshing(true);
        try {
            if (onRefresh) {
                await onRefresh();
            }
        } finally {
            setRefreshing(false);
        }
    }, [onRefresh, refreshing, isLoading]);

    const isLoadingRef = useRef(false);

    useEffect(() => {
        if (!isDataLoaded && !isLoadingRef.current && productId) {
            isLoadingRef.current = true;
            onRefresh?.().finally(() => {
                isLoadingRef.current = false;
            });
        }
    }, [isDataLoaded, productId, onRefresh]);

    const handleFeedbackAdded = () => {
        setShowAddForm(false);
        if (onFormClosed) {
            onFormClosed();
        }
    };

    const handleDeleteFeedback = (reviewId) => {
        Alert.alert(
            "Подтверждение",
            "Вы уверены, что хотите удалить этот отзыв?",
            [
                {
                    text: "Отмена",
                    style: "cancel",
                },
                {
                    text: "Удалить",
                    onPress: () => dispatch(deleteFeedback({id: reviewId, productId})),
                    style: "destructive",
                },
            ]
        );
    };

    const renderAddReviewButton = () => {
        // Отображаем кнопку только если пользователь аутентифицирован,
        // является клиентом и еще не оставил отзыв
        if (!isAuthenticated || !isClient || hasLeftFeedback) {
            return null;
        }

        return (
            <TouchableOpacity
                style={[styles.addButton, {backgroundColor: colors.primary}]}
                onPress={() => {
                    if (hasLeftFeedback) {
                        Alert.alert(
                            "Уведомление",
                            "Вы уже оставили отзыв к этому продукту.",
                            [{text: "OK"}]
                        );
                    } else {
                        setShowAddForm(true);
                    }
                }}
            >
                <Text style={styles.addButtonText}>
                    Оставить отзыв
                </Text>
            </TouchableOpacity>
        );
    };

    // Обеспечиваем, что feedbacks всегда массив
    const safeFeedbacks = Array.isArray(feedbacks) ? feedbacks : [];

    if (isLoading && !refreshing && !isDataLoaded) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary}/>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={[styles.errorText, {color: colors.error}]}>
                    {error}
                </Text>
                <TouchableOpacity
                    style={[styles.retryButton, {backgroundColor: colors.primary}]}
                    onPress={handleRefresh}
                >
                    <Text style={styles.retryButtonText}>Повторить</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView
            style={[styles.container, style]}
            contentContainerStyle={styles.contentContainer}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={[colors.primary]}
                    tintColor={colors.primary}
                />
            }
        >
            {showAddForm ? (
                <FeedbackAddModal
                    productId={productId}
                    onSuccess={handleFeedbackAdded}
                    onClose={() => {
                        setShowAddForm(false);
                        if (onFormClosed) {
                            onFormClosed();
                        }
                    }}
                />
            ) : (
                <>
                    {renderAddReviewButton()}

                    {safeFeedbacks.length > 0 ? (
                        <View style={styles.feedbacksContainer}>
                            {safeFeedbacks.map((feedback, index) => (
                                <View
                                    key={`${feedback.id || index}-${index}`}
                                    style={index > 0 ? styles.cardContainer : styles.firstCardContainer}
                                >
                                    <FeedbackCard
                                        feedback={feedback}
                                        canDelete={
                                            currentUser?.profile?.id === feedback.clientId ||
                                            currentUser?.role === 'ADMIN'
                                        }
                                        onDelete={() => handleDeleteFeedback(feedback.id)}
                                    />
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.centered}>
                            <Text style={[styles.noFeedbacksText, {color: colors.textSecondary}]}>
                                Отзывов пока нет
                            </Text>
                        </View>
                    )}
                </>
            )}
        </ScrollView>
    );
});


const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: 16,
    },
    feedbacksContainer: {
        width: '100%',
    },
    firstCardContainer: {},
    cardContainer: {
        marginTop: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    noFeedbacksText: {
        fontSize: 16,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        marginVertical: 20,
    },
    addButton: {
        paddingVertical: 12,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 16,
        marginHorizontal: 16,
    },
    addButtonText: {
        color: 'white',
        fontFamily: FontFamily.sFProText,
        fontSize: 16,
        fontWeight: '600',
    },
    errorText: {
        fontSize: 16,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        marginBottom: 16,
    },
    retryButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    retryButtonText: {
        color: 'white',
        fontFamily: FontFamily.sFProText,
        fontSize: 14,
        fontWeight: '500',
    },
});