/**
 * Утилиты для тестирования работы корзины
 * Помогают проверить синхронизацию состояния после операций
 */

export const testCartOperation = async (operation, productId, expectedResult) => {
    if (!__DEV__) return;
    
    console.group(`🧪 Testing Cart Operation: ${operation}`);
    console.log('Product ID:', productId);
    console.log('Expected Result:', expectedResult);
    
    const startTime = Date.now();
    
    try {
        const result = await operation();
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log('✅ Operation completed');
        console.log('Duration:', `${duration}ms`);
        console.log('Result:', result);
        
        // Проверяем результат через небольшую задержку
        setTimeout(() => {
            console.log('🔍 State check after operation...');
            // Здесь можно добавить проверки состояния
        }, 100);
        
        return result;
    } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.error('❌ Operation failed');
        console.error('Duration:', `${duration}ms`);
        console.error('Error:', error);
        
        throw error;
    } finally {
        console.groupEnd();
    }
};

export const logCartState = (cartItems, productId, context = '') => {
    if (!__DEV__) return;
    
    console.group(`📊 Cart State ${context}`);
    console.log('Total items:', cartItems.length);
    console.log('Product IDs:', cartItems.map(item => item.productId || item.product?.id));
    
    if (productId) {
        const item = cartItems.find(item => 
            (item.productId === productId) || (item.product?.id === productId)
        );
        console.log(`Target product ${productId}:`, item ? `qty: ${item.quantity}` : 'not found');
    }
    
    console.groupEnd();
}; 