/**
 * Универсальная функция для навигации к ProductDetail
 * Использует глобальную навигацию к основному стеку
 */
export const navigateToProductDetail = (navigation, params) => {
    try {
        navigation.navigate('Main', {
            screen: 'MainTab',
            params: {
                screen: 'ProductDetail',
                params
            }
        });
    } catch (error) {
        console.error('NavigationUtils: Ошибка навигации к ProductDetail:', error);
        // Fallback - прямая навигация
        try {
            navigation.navigate('ProductDetail', params);
        } catch (fallbackError) {
            console.error('NavigationUtils: Критическая ошибка навигации:', fallbackError);
        }
    }
};

/**
 * Проверяет, находимся ли мы в основном стеке
 */
export const isInMainStack = (navigation) => {
    try {
        const state = navigation.getState();
        const currentRoute = state.routes[state.index];
        return currentRoute?.name === 'Main';
    } catch (error) {
        console.warn('NavigationUtils: Ошибка проверки стека:', error);
        return false;
    }
};

/**
 * Умная навигация к ProductDetail - автоматически определяет нужный способ
 */
export const smartNavigateToProductDetail = (navigation, params) => {
    if (isInMainStack(navigation)) {
        // Если уже в основном стеке, используем прямую навигацию
        navigation.navigate('ProductDetail', params);
    } else {
        // Иначе используем глобальную навигацию
        navigateToProductDetail(navigation, params);
    }
}; 