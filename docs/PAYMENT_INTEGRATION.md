# Интеграция платежей в мобильное приложение

## Обзор

Данная документация описывает интеграцию платежной системы ЮKassa в мобильное приложение IcebergApp. Интеграция обеспечивает безопасную обработку платежей с поддержкой всех российских карт.

## Архитектура

### Компоненты

1. **PaymentAPI** - API клиент для работы с сервером
2. **PaymentSlice** - Redux slice для управления состоянием платежей
3. **PaymentScreen** - Экран оплаты заказа
4. **PaymentSuccessScreen** - Экран успешной оплаты
5. **PaymentErrorScreen** - Экран ошибки оплаты

## API Интеграция

### Создание платежа

```javascript
// entities/payment/api/paymentApi.js
export const createPayment = async (orderId, returnUrl) => {
  const response = await api.post(`/payments/orders/${orderId}/create`, {
    returnUrl
  });
  return response.data;
};
```

### Проверка статуса платежа

```javascript
export const checkPaymentStatus = async (paymentId) => {
  const response = await api.get(`/payments/status/${paymentId}`);
  return response.data;
};
```

## Redux State Management

### Payment Slice

```javascript
// entities/payment/model/paymentSlice.js
const paymentSlice = createSlice({
  name: 'payment',
  initialState: {
    currentPayment: null,
    paymentStatus: 'idle',
    error: null
  },
  reducers: {
    setCurrentPayment: (state, action) => {
      state.currentPayment = action.payload;
    },
    setPaymentStatus: (state, action) => {
      state.paymentStatus = action.payload;
    },
    setPaymentError: (state, action) => {
      state.error = action.payload;
    },
    clearPayment: (state) => {
      state.currentPayment = null;
      state.paymentStatus = 'idle';
      state.error = null;
    }
  }
});
```

## UI Компоненты

### PaymentScreen

```javascript
// screens/payment/PaymentScreen.jsx
const PaymentScreen = ({ route, navigation }) => {
  const { orderId, amount } = route.params;
  const dispatch = useDispatch();
  const { currentPayment, paymentStatus } = useSelector(state => state.payment);

  const handleCreatePayment = async () => {
    try {
      const returnUrl = `${BASE_URL}/payment/success`;
      const payment = await createPayment(orderId, returnUrl);
      
      dispatch(setCurrentPayment(payment));
      
      // Открываем браузер для оплаты
      Linking.openURL(payment.confirmationUrl);
    } catch (error) {
      dispatch(setPaymentError(error.message));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Оплата заказа</Text>
      <Text style={styles.amount}>Сумма: {amount} ₽</Text>
      
      <TouchableOpacity 
        style={styles.payButton}
        onPress={handleCreatePayment}
        disabled={paymentStatus === 'loading'}
      >
        <Text style={styles.payButtonText}>
          {paymentStatus === 'loading' ? 'Создание платежа...' : 'Оплатить'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
```

### PaymentSuccessScreen

```javascript
// screens/payment/PaymentSuccessScreen.jsx
const PaymentSuccessScreen = ({ navigation }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Очищаем состояние платежа
    dispatch(clearPayment());
    
    // Показываем уведомление
    Alert.alert(
      'Оплата успешна!',
      'Ваш заказ подтвержден и будет доставлен в ближайшее время.',
      [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Orders')
        }
      ]
    );
  }, []);

  return (
    <View style={styles.container}>
      <Icon name="check-circle" size={64} color="#4CAF50" />
      <Text style={styles.title}>Оплата прошла успешно!</Text>
      <Text style={styles.subtitle}>
        Ваш заказ подтвержден и будет доставлен в ближайшее время.
      </Text>
    </View>
  );
};
```

## Навигация

### Добавление экранов в навигатор

```javascript
// app/providers/navigation/MainStack.jsx
const MainStack = () => {
  return (
    <Stack.Navigator>
      {/* Существующие экраны */}
      <Stack.Screen 
        name="Payment" 
        component={PaymentScreen}
        options={{ title: 'Оплата' }}
      />
      <Stack.Screen 
        name="PaymentSuccess" 
        component={PaymentSuccessScreen}
        options={{ title: 'Успешная оплата' }}
      />
      <Stack.Screen 
        name="PaymentError" 
        component={PaymentErrorScreen}
        options={{ title: 'Ошибка оплаты' }}
      />
    </Stack.Navigator>
  );
};
```

## Интеграция с заказами

### Обновление OrderScreen

```javascript
// screens/orders/OrderScreen.jsx
const OrderScreen = ({ route }) => {
  const { order } = route.params;
  const navigation = useNavigation();

  const handlePayment = () => {
    navigation.navigate('Payment', {
      orderId: order.id,
      amount: order.totalAmount
    });
  };

  return (
    <View style={styles.container}>
      {/* Информация о заказе */}
      
      {order.status === 'PENDING' && (
        <TouchableOpacity 
          style={styles.payButton}
          onPress={handlePayment}
        >
          <Text style={styles.payButtonText}>Оплатить заказ</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
```

## Обработка возвратов

### Deep Linking для возвратов

```javascript
// App.jsx
import { Linking } from 'react-native';

const App = () => {
  useEffect(() => {
    const handleDeepLink = (url) => {
      if (url.includes('/payment/success')) {
        navigation.navigate('PaymentSuccess');
      } else if (url.includes('/payment/error')) {
        navigation.navigate('PaymentError');
      }
    };

    Linking.addEventListener('url', handleDeepLink);
    
    return () => {
      Linking.removeEventListener('url', handleDeepLink);
    };
  }, []);

  return (
    <AppContainer />
  );
};
```

## Безопасность

### Проверка платежей

```javascript
// entities/payment/hooks/usePaymentVerification.js
export const usePaymentVerification = (paymentId) => {
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const status = await checkPaymentStatus(paymentId);
        setIsVerified(status.paid);
      } catch (error) {
        console.error('Ошибка проверки платежа:', error);
        setIsVerified(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (paymentId) {
      verifyPayment();
    }
  }, [paymentId]);

  return { isVerified, isLoading };
};
```

## Стили

### PaymentScreen Styles

```javascript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20
  },
  amount: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666'
  },
  payButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
```

## Тестирование

### Тестовые сценарии

1. **Успешная оплата**
   - Создание платежа
   - Переход в браузер
   - Возврат в приложение
   - Проверка статуса

2. **Ошибка оплаты**
   - Недостаточно средств
   - Отмена платежа
   - Обработка ошибок

3. **Сетевые ошибки**
   - Нет интернета
   - Таймаут запросов
   - Повторные попытки

## Мониторинг

### Аналитика платежей

```javascript
// services/analytics.js
export const trackPaymentEvent = (event, data) => {
  analytics.track('payment_event', {
    event,
    orderId: data.orderId,
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    timestamp: new Date().toISOString()
  });
};
```

## Заключение

Интеграция платежей обеспечивает:

- ✅ Безопасную обработку платежей
- ✅ Поддержку всех российских карт
- ✅ Удобный пользовательский интерфейс
- ✅ Обработку ошибок и возвратов
- ✅ Аналитику и мониторинг

Система готова к использованию после настройки серверной части и тестирования. 