import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    LayoutAnimation,
    UIManager,
    Platform
} from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { faqData } from '../model/faqData';
import { useAuth } from '@entities/auth/hooks/useAuth';

// Включаем LayoutAnimation для Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Конфигурация анимации
const layoutAnimationConfig = {
    duration: 300,
    create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
    },
    update: {
        type: LayoutAnimation.Types.easeInEaseOut,
    },
    delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
    },
};

/**
 * Компонент отдельного вопроса-ответа
 */
const FAQItem = React.memo(({ item, isExpanded, onToggle }) => {
    const handlePress = useCallback(() => {
        LayoutAnimation.configureNext(layoutAnimationConfig);
        onToggle(item.id);
    }, [item.id, onToggle]);

    return (
        <View style={styles.faqItemContainer}>
            <TouchableOpacity
                style={styles.faqItemHeader}
                onPress={handlePress}
                activeOpacity={0.7}
            >
                <Text style={styles.faqQuestion}>{item.question}</Text>
                <Icon
                    name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={24}
                    color={Color.blue2}
                />
            </TouchableOpacity>
            {isExpanded && (
                <View style={styles.faqAnswerContainer}>
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                </View>
            )}
        </View>
    );
});

FAQItem.displayName = 'FAQItem';

/**
 * Компонент категории FAQ
 */
const FAQCategory = React.memo(({ category, expandedQuestions, onToggleQuestion }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleCategoryToggle = useCallback(() => {
        LayoutAnimation.configureNext(layoutAnimationConfig);
        setIsExpanded(prev => !prev);
    }, []);

    const handleQuestionToggle = useCallback((questionId) => {
        onToggleQuestion(questionId);
    }, [onToggleQuestion]);

    return (
        <View style={styles.categoryContainer}>
            <TouchableOpacity
                style={styles.categoryHeader}
                onPress={handleCategoryToggle}
                activeOpacity={0.7}
            >
                <View style={styles.categoryHeaderLeft}>
                    <Icon
                        name={category.icon || 'help-outline'}
                        size={24}
                        color={Color.blue2}
                        style={styles.categoryIcon}
                    />
                    <Text style={styles.categoryTitle}>{category.title}</Text>
                </View>
                <Icon
                    name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={28}
                    color={Color.blue2}
                />
            </TouchableOpacity>
            {isExpanded && (
                <View style={styles.questionsContainer}>
                    {category.questions.map((question) => (
                        <FAQItem
                            key={question.id}
                            item={question}
                            isExpanded={expandedQuestions.has(question.id)}
                            onToggle={handleQuestionToggle}
                        />
                    ))}
                </View>
            )}
        </View>
    );
});

FAQCategory.displayName = 'FAQCategory';

/**
 * Основной компонент FAQ секции
 */
export const FAQSection = () => {
    const { currentUser } = useAuth();
    const [expandedQuestions, setExpandedQuestions] = useState(new Set());

    const handleToggleQuestion = useCallback((questionId) => {
        setExpandedQuestions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(questionId)) {
                newSet.delete(questionId);
            } else {
                newSet.add(questionId);
            }
            return newSet;
        });
    }, []);

    // Фильтруем FAQ по роли пользователя и объединяем все вопросы в одну категорию
    const filteredFaqData = useMemo(() => {
        const userRole = currentUser?.role;
        
        // Получаем все вопросы из единственной категории
        const allCategory = faqData[0];
        if (!allCategory) {
            return [];
        }

        // Фильтруем вопросы по роли
        const filteredQuestions = allCategory.questions.filter(question => {
            // Если roles === null, вопрос доступен для всех
            if (question.roles === null) {
                return true;
            }
            // Если пользователь не авторизован, показываем только вопросы для всех
            if (!userRole) {
                return false;
            }
            // Проверяем, есть ли роль пользователя в списке разрешенных ролей
            return question.roles.includes(userRole);
        });

        // Возвращаем одну категорию со всеми отфильтрованными вопросами
        return [{
            ...allCategory,
            questions: filteredQuestions
        }];
    }, [currentUser?.role]);

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Часто задаваемые вопросы</Text>
            {filteredFaqData.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Нет доступных вопросов для вашей роли</Text>
                </View>
            ) : (
                <View style={styles.categoriesContainer}>
                    {filteredFaqData.map((category) => (
                        <FAQCategory
                            key={category.id}
                            category={category}
                            expandedQuestions={expandedQuestions}
                            onToggleQuestion={handleToggleQuestion}
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: normalize(20),
        paddingTop: normalize(16),
        paddingBottom: normalize(24),
        backgroundColor: '#fff',
    },
    sectionTitle: {
        fontSize: normalizeFont(22),
        fontWeight: '600',
        color: Color.colorGray_100,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(20),
    },
    categoriesContainer: {
        gap: normalize(12),
    },
    emptyContainer: {
        padding: normalize(20),
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: normalizeFont(16),
        color: Color.grey7D7D7D,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
    },
    categoryContainer: {
        backgroundColor: '#fff',
        borderRadius: normalize(12),
        borderWidth: 1,
        borderColor: Color.colorGainsboro,
        overflow: 'hidden',
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: normalize(16),
        backgroundColor: '#fff',
    },
    categoryHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    categoryIcon: {
        marginRight: normalize(12),
    },
    categoryTitle: {
        fontSize: normalizeFont(18),
        fontWeight: '600',
        color: Color.colorGray_100,
        fontFamily: FontFamily.sFProText,
        flex: 1,
    },
    questionsContainer: {
        paddingHorizontal: normalize(16),
        paddingBottom: normalize(12),
        borderTopWidth: 1,
        borderTopColor: Color.colorGainsboro,
    },
    faqItemContainer: {
        marginTop: normalize(12),
        backgroundColor: Color.colorLavender,
        borderRadius: normalize(8),
        overflow: 'hidden',
    },
    faqItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: normalize(14),
    },
    faqQuestion: {
        fontSize: normalizeFont(16),
        fontWeight: '500',
        color: Color.colorGray_100,
        fontFamily: FontFamily.sFProText,
        flex: 1,
        marginRight: normalize(12),
        lineHeight: normalizeFont(22),
    },
    faqAnswerContainer: {
        paddingHorizontal: normalize(14),
        paddingBottom: normalize(14),
        paddingTop: normalize(8),
    },
    faqAnswer: {
        fontSize: normalizeFont(15),
        color: Color.grey7D7D7D,
        fontFamily: FontFamily.sFProText,
        lineHeight: normalizeFont(22),
    },
});
