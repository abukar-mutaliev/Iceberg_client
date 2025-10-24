import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { OrderAlternativesApi } from '../api/orderAlternativesApi';

/**
 * Хук для работы с альтернативными предложениями заказов
 */
export const useOrderAlternatives = () => {
    const [choices, setChoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [responding, setResponding] = useState(false);

    // Получаем информацию о пользователе
    const isAuthenticated = useSelector(state => !!state.auth?.user?.id);
    const userRole = useSelector(state => state.auth?.user?.role);
    const userId = useSelector(state => state.auth?.user?.id);

    // Проверяем доступ
    const hasAccess = isAuthenticated && userRole === 'CLIENT';

    /**
     * Загрузка активных предложений выбора
     */
    const loadMyChoices = useCallback(async () => {
        if (!hasAccess) {
            setChoices([]);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const result = await OrderAlternativesApi.getMyChoices();
            
            if (result.success) {
                setChoices(result.data || []);
                console.log('📱 useOrderAlternatives: Предложения загружены', {
                    choicesCount: result.data?.length || 0
                });
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            console.error('❌ useOrderAlternatives: Ошибка загрузки предложений', err);
            setError(err.message);
            setChoices([]);
        } finally {
            setLoading(false);
        }
    }, [hasAccess]);

    /**
     * Ответ на предложение выбора
     */
    const respondToChoice = useCallback(async (choiceId, response, selectedAlternativeId = null, responseData = {}) => {
        try {
            setResponding(true);

            const result = await OrderAlternativesApi.respondToChoice(
                choiceId,
                response,
                selectedAlternativeId,
                responseData
            );

            if (result.success) {
                // Обновляем список предложений
                setChoices(prev => prev.filter(choice => choice.id !== choiceId));
                
                console.log('✅ useOrderAlternatives: Ответ успешно отправлен', {
                    choiceId,
                    response,
                    action: result.data?.action
                });

                return {
                    success: true,
                    data: result.data,
                    message: result.message
                };
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            console.error('❌ useOrderAlternatives: Ошибка отправки ответа', err);
            
            return {
                success: false,
                error: err.message
            };
        } finally {
            setResponding(false);
        }
    }, []);

    /**
     * Получение товаров-заменителей
     */
    const getProductSubstitutes = useCallback(async (productId, districtId) => {
        try {
            const result = await OrderAlternativesApi.getProductSubstitutes(productId, districtId);
            
            if (result.success) {
                console.log('✅ useOrderAlternatives: Заменители получены', {
                    productId,
                    substitutesCount: result.data?.substitutes?.length || 0
                });
                
                return {
                    success: true,
                    data: result.data
                };
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            console.error('❌ useOrderAlternatives: Ошибка получения заменителей', err);
            
            return {
                success: false,
                error: err.message,
                data: { substitutes: [] }
            };
        }
    }, []);

    /**
     * Очистка ошибок
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Автоматическая загрузка при изменении доступа
    useEffect(() => {
        if (hasAccess) {
            loadMyChoices();
        }
    }, [hasAccess, loadMyChoices]);

    return {
        // Данные
        choices,
        loading,
        error,
        responding,
        hasAccess,

        // Вычисляемые значения
        hasActiveChoices: choices.length > 0,
        urgentChoices: choices.filter(choice => {
            if (!choice.expiresAt) return false;
            const hoursLeft = (new Date(choice.expiresAt) - new Date()) / (1000 * 60 * 60);
            return hoursLeft <= 2; // Срочные - осталось менее 2 часов
        }),

        // Методы
        loadMyChoices,
        respondToChoice,
        getProductSubstitutes,
        clearError
    };
};

/**
 * Хук для работы с конкретным предложением выбора
 */
export const useOrderChoice = (choiceId) => {
    const [choiceDetails, setChoiceDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Загрузка деталей предложения
     */
    const loadChoiceDetails = useCallback(async () => {
        if (!choiceId) return;

        try {
            setLoading(true);
            setError(null);

            const result = await OrderAlternativesApi.getChoiceDetails(choiceId);
            
            if (result.success) {
                setChoiceDetails(result.data);
                
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            console.error('❌ useOrderChoice: Ошибка загрузки деталей', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [choiceId]);

    // Загрузка при изменении choiceId
    useEffect(() => {
        loadChoiceDetails();
    }, [loadChoiceDetails]);

    return {
        choiceDetails,
        loading,
        error,
        loadChoiceDetails,
        clearError: () => setError(null)
    };
};
