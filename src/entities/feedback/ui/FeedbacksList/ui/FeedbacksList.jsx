import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView, Alert } from 'react-native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { FontFamily } from '@app/styles/GlobalStyles';
import { useSelector, useDispatch } from 'react-redux';
import { selectIsAuthenticated, selectUser } from '@entities/auth';
import { deleteFeedback, selectHasUserLeftFeedback } from '@entities/feedback';
import { FeedbackCard } from '@entities/feedback';
import { FeedbackAddModal } from '@features/feedback';

export const FeedbacksList = React.memo(({
                                  productId,
                                  feedbacks,
                                  isLoading,
                                  error,
                                  isDataLoaded,
                                  showAddForm: initialShowForm = false,
                                  onFormClosed,
                                  style, onRefresh
                              }) => {
    const { colors } = useTheme();
    const dispatch = useDispatch();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const currentUser = useSelector(selectUser);

    const [showAddForm, setShowAddForm] = useState(initialShowForm);
    const [refreshing, setRefreshing] = useState(false);

    const hasLeftFeedback = useSelector(
        currentUser?.profile?.id
            ? state => selectHasUserLeftFeedback(currentUser.profile.id)(state, productId)
            : () => false
    );

    useEffect(() => {
        setShowAddForm(initialShowForm);
    }, [initialShowForm]);

    const handleRefresh = async () => {
        setRefreshing(true);
        if (onRefresh) {
            await onRefresh();
        }
        setRefreshing(false);
    };

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
                    onPress: () => dispatch(deleteFeedback({ id: reviewId, productId })),
                    style: "destructive",
                },
            ]
        );
    };

    const renderAddReviewButton = () => {
        if (hasLeftFeedback) {
            return null;
        }

        return (
            <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                    if (hasLeftFeedback) {
                        Alert.alert(
                            "Уведомление",
                            "Вы уже оставили отзыв к этому продукту.",
                            [{ text: "OK" }]
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

    if (isLoading && !refreshing && !isDataLoaded) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={[styles.errorText, { color: colors.error }]}>
                    {error}
                </Text>
                <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: colors.primary }]}
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

                    {!feedbacks || feedbacks.length === 0 ? (
                        <View style={styles.centered}>
                            <Text style={[styles.noFeedbacksText, { color: colors.textSecondary }]}>
                                Отзывов пока нет
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.feedbacksContainer}>
                            {feedbacks.map((feedback, index) => (
                                <View
                                    key={`${feedback.id}-${index}`}
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
        paddingHorizontal: 10,
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