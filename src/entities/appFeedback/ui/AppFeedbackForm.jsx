import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    ActivityIndicator,
    Alert
} from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import RatingStarSvg from '@shared/ui/Icon/SupplierScreenIcons/RatingStarSvg';
import CustomButton from '@shared/ui/Button/CustomButton';

/**
 * Компонент формы отзыва о приложении
 */
export const AppFeedbackForm = ({ 
    initialRating = 0, 
    initialComment = '', 
    onSubmit, 
    onCancel,
    submitting = false 
}) => {
    const [rating, setRating] = useState(initialRating);
    const [comment, setComment] = useState(initialComment);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        setRating(initialRating);
        setComment(initialComment);
    }, [initialRating, initialComment]);

    const handleStarPress = (starValue) => {
        setRating(starValue);
        if (errors.rating) {
            setErrors(prev => ({ ...prev, rating: null }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!rating || rating < 1 || rating > 5) {
            newErrors.rating = 'Выберите рейтинг от 1 до 5 звезд';
        }

        if (comment && comment.length > 1000) {
            newErrors.comment = 'Комментарий не должен превышать 1000 символов';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) {
            return;
        }

        onSubmit({
            rating,
            comment: comment.trim() || null,
        });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Оцените приложение</Text>
            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <RatingStarSvg
                        key={star}
                        filled={star <= rating}
                        width={32}
                        height={32}
                        color={Color.blue2}
                        onPress={handleStarPress}
                        starValue={star}
                    />
                ))}
            </View>
            {errors.rating && (
                <Text style={styles.errorText}>{errors.rating}</Text>
            )}

            <Text style={[styles.label, styles.commentLabel]}>
                Комментарий (необязательно)
            </Text>
            <TextInput
                style={[styles.commentInput, errors.comment && styles.commentInputError]}
                value={comment}
                onChangeText={(text) => {
                    setComment(text);
                    if (errors.comment) {
                        setErrors(prev => ({ ...prev, comment: null }));
                    }
                }}
                placeholder="Расскажите, что вам нравится или что можно улучшить..."
                placeholderTextColor={Color.grey7D7D7D}
                multiline
                numberOfLines={5}
                maxLength={1000}
                textAlignVertical="top"
            />
            {errors.comment && (
                <Text style={styles.errorText}>{errors.comment}</Text>
            )}
            {comment.length > 0 && (
                <Text style={styles.charCount}>
                    {comment.length}/1000 символов
                </Text>
            )}

            <View style={styles.buttonsContainer}>
                {onCancel && (
                    <CustomButton
                        title="Отмена"
                        onPress={onCancel}
                        outlined={true}
                        color={Color.grey7D7D7D}
                        style={styles.cancelButton}
                    />
                )}
                <CustomButton
                    title={submitting ? "Отправка..." : "Отправить отзыв"}
                    onPress={handleSubmit}
                    outlined={false}
                    color={Color.blue2}
                    activeColor="#FFFFFF"
                    disabled={submitting}
                    style={styles.submitButton}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: normalize(20),
    },
    label: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: Color.colorGray_100,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(12),
    },
    commentLabel: {
        marginTop: normalize(20),
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: normalize(8),
        gap: normalize(8),
    },
    commentInput: {
        borderWidth: 1,
        borderColor: Color.colorGainsboro,
        borderRadius: normalize(12),
        padding: normalize(12),
        fontSize: normalizeFont(15),
        color: Color.colorGray_100,
        fontFamily: FontFamily.sFProText,
        minHeight: normalize(100),
        backgroundColor: '#fff',
    },
    commentInputError: {
        borderColor: Color.error || Color.red || '#FF3B30',
    },
    errorText: {
        fontSize: normalizeFont(13),
        color: Color.error || Color.red || '#FF3B30',
        fontFamily: FontFamily.sFProText,
        marginTop: normalize(4),
    },
    charCount: {
        fontSize: normalizeFont(12),
        color: Color.grey7D7D7D,
        fontFamily: FontFamily.sFProText,
        marginTop: normalize(4),
        textAlign: 'right',
    },
    buttonsContainer: {
        flexDirection: 'row',
        gap: normalize(12),
        marginTop: normalize(20),
    },
    cancelButton: {
        flex: 1,
    },
    submitButton: {
        flex: 1,
    },
});

