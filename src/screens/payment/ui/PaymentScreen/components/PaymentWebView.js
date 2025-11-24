// ==========================================
// PaymentScreen/components/PaymentWebView.js
// WebView для оплаты
// ==========================================

import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { Color, FontFamily } from '@app/styles/GlobalStyles';

export const PaymentWebView = ({
    paymentUrl,
    paymentId,
    isLoading,
    onLoadingChange,
    onNavigationChange,
    onPaymentSuccess,
    onCheckStatus
}) => {
    const webViewRef = useRef(null);

    /**
     * Обработка прогресса загрузки WebView
     */
    const handleLoadProgress = ({ nativeEvent }) => {
        console.log('📊 WebView load progress:', nativeEvent.progress);

        // Если прогресс 100%, немедленно скрываем индикатор
        if (nativeEvent.progress === 1) {
            onLoadingChange(false);
        }
        // Если прогресс больше 70%, скрываем индикатор загрузки с небольшой задержкой
        else if (nativeEvent.progress > 0.7 && isLoading) {
            setTimeout(() => {
                onLoadingChange(false);
            }, 500);
        }
    };

    /**
     * Обработка окончания загрузки WebView
     */
    const handleLoadEnd = () => {
        console.log('✅ WebView load end');
        onLoadingChange(false);
    };

    /**
     * Обработка начала загрузки WebView
     */
    const handleLoadStart = () => {
        console.log('🔄 WebView load start');
        onLoadingChange(true);
    };

    /**
     * Обработка ошибок загрузки WebView
     */
    const handleError = (syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.error('❌ WebView error:', nativeEvent);
        onLoadingChange(false);
    };

    /**
     * Обработка HTTP ошибок WebView
     */
    const handleHttpError = (syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.error('❌ WebView HTTP error:', nativeEvent.statusCode, nativeEvent.url);
        onLoadingChange(false);
    };

    /**
     * Обработка краша процесса WebView (iOS)
     */
    const handleContentProcessDidTerminate = () => {
        console.warn('⚠️ WebView content process terminated, reloading...');
        webViewRef.current?.reload();
    };

    /**
     * Обработка навигации в WebView
     */
    const handleNavigationStateChange = (navState) => {
        const { url, loading: navLoading, canGoBack, canGoForward } = navState;

        console.log('🌐 WebView navigation:', url, { canGoBack, canGoForward, navLoading });

        // Обрабатываем deep link для возврата в приложение
        if (url.startsWith('icebergapp://payment-result')) {
            console.log('✅ Payment result deep link detected');
            onNavigationChange(url);
        }
    };

    /**
     * Определение, можно ли загружать URL в WebView
     */
    const handleShouldStartLoadWithRequest = (request) => {
        const { url } = request;

        console.log('🔍 Should start load with request:', url);

        // Разрешаем навигацию только на домены Т-Бизнес
        if (url.includes('tinkoff.ru') || url.includes('tbank.ru') || url.includes('securepay.tinkoff.ru')) {
            console.log('✅ Allowed navigation to:', url);
            return true;
        }

        // Обрабатываем deep links банковских приложений (SBP)
        // Примеры: bank100000000111:// (Сбер), bank100000000004:// (Тинькофф) и т.д.
        const bankSchemes = ['bank', 'sbolpay://', 'tpay://', 'sbp://', 'payapp://', 'sberpay://'];
        if (bankSchemes.some(scheme => url.startsWith(scheme))) {
            console.log('🏦 Opening bank app for SBP payment:', url);

            Linking.openURL(url).catch(err => {
                console.error('❌ Failed to open bank app:', err);
            });

            return false; // Не позволяем WebView загружать этот URL
        }

        // Обрабатываем deep link для возврата в приложение
        if (url.startsWith('icebergapp://payment-result')) {
            console.log('✅ Payment result deep link, handling...');
            onNavigationChange(url);
            return false;
        }

        // Разрешаем навигацию на shop.ru (может быть страницей успеха Т-Банка)
        if (url.includes('shop.ru')) {
            console.log('✅ Allowing navigation to shop.ru:', url);
            return true;
        }

        console.log('❌ Blocked navigation to:', url);
        return false;
    };

    /**
     * JavaScript для инжекта в WebView (выполняется ДО загрузки страницы)
     * Перехватывает попытки открыть новое окно
     */
    const injectedJavaScriptBeforeContentLoaded = `
        (function() {
            console.log('🔧 Injected JavaScript (before content loaded)');

            // Перехватываем window.open и заменяем на навигацию в текущем окне
            window.open = function(url, target, features) {
                console.log('📱 Intercepted window.open:', url);
                window.location.href = url;
                return window;
            };
        })();
        true;
    `;

    /**
     * JavaScript для инжекта в WebView (выполняется ПОСЛЕ загрузки страницы)
     * Удаляет target="_blank" из ссылок и отслеживает успешную оплату
     */
    const injectedJavaScript = `
        (function() {
            console.log('🔧 Injected JavaScript (after content loaded)');

            // Инициализируем флаг успешной оплаты
            window.paymentSuccessDetected = false;

            // Удаляем target="_blank" из всех ссылок
            const links = document.querySelectorAll('a[target="_blank"]');
            links.forEach(link => {
                link.removeAttribute('target');
                console.log('🔗 Removed target="_blank" from link:', link.href);
            });

            // Функция для отправки сообщений в React Native
            function sendMessageToRN(message) {
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                    window.ReactNativeWebView.postMessage(JSON.stringify(message));
                }
            }

            // Функция для автоматического возврата в приложение после успешной оплаты
            function returnToApp() {
                console.log('🔙 Returning to app after successful payment');
                // Имитируем нажатие на кнопку "Вернуться в магазин" или аналогичную
                const returnButtons = document.querySelectorAll('a, button, [role="button"]');
                const returnButton = Array.from(returnButtons).find(btn =>
                    btn.textContent.toLowerCase().includes('вернуться') ||
                    btn.textContent.toLowerCase().includes('магазин') ||
                    btn.textContent.toLowerCase().includes('назад') ||
                    btn.href?.includes('success') ||
                    btn.href?.includes('complete')
                );

                if (returnButton) {
                    console.log('🎯 Found return button, clicking...');
                    returnButton.click();
                } else {
                    // Если кнопки нет, создаем искусственный deep link
                    console.log('🔗 No return button found, creating deep link...');
                    window.location.href = 'icebergapp://payment-result?status=success';
                }
            }

            // Отслеживаем успешную оплату на странице Т-Банка
            function checkForPaymentSuccess() {
                // Проверяем, не была ли оплата уже обнаружена ранее
                if (window.paymentSuccessDetected) {
                    console.log('⚠️ Payment success already detected, skipping check');
                    return false;
                }

                // Расширенный список индикаторов успеха оплаты
                const successIndicators = [
                    'оплачен', 'оплачено', 'оплата прошла', 'платеж выполнен', 'платеж завершен',
                    'успешно', 'success', 'оплата завершена', 'платеж принят', 'заказ оплачен',
                    'оплата подтверждена', 'платеж успешен', 'транзакция завершена',
                    'payment successful', 'payment completed', 'оплата успешна'
                ];

                const pageText = document.body ? document.body.innerText.toLowerCase() : '';
                const pageTitle = document.title ? document.title.toLowerCase() : '';

                // Проверяем наличие индикаторов успеха в тексте страницы и заголовке
                const hasSuccessIndicator = successIndicators.some(indicator =>
                    pageText.includes(indicator) || pageTitle.includes(indicator)
                );

                // Ищем элементы с зеленым цветом или классами успеха
                const successElements = document.querySelectorAll(
                    '.success, .completed, .paid, [class*="success"], [class*="paid"], [class*="complete"]'
                );
                const hasVisualSuccess = Array.from(successElements).some(el => {
                    const style = window.getComputedStyle(el);
                    return (style.color.includes('green') || style.backgroundColor.includes('green')) ||
                           el.className.toLowerCase().includes('success') ||
                           el.className.toLowerCase().includes('paid') ||
                           el.className.toLowerCase().includes('complete') ||
                           el.textContent.toLowerCase().includes('оплачен') ||
                           el.textContent.toLowerCase().includes('успешно');
                });

                // Ищем специфические элементы Т-Банка для успешной оплаты
                const tbankSuccessElements = document.querySelectorAll(
                    '[data-testid*="success"], [data-testid*="paid"], .payment-success, .order-paid'
                );
                const hasTbankSuccess = tbankSuccessElements.length > 0;

                // Проверяем URL страницы - может содержать success или paid
                const urlSuccess = window.location.href.includes('success') ||
                                 window.location.href.includes('paid') ||
                                 window.location.href.includes('complete');

                if (hasSuccessIndicator || hasVisualSuccess || hasTbankSuccess || urlSuccess) {
                    console.log('✅ Payment success detected on T-Bank page', {
                        hasSuccessIndicator,
                        hasVisualSuccess,
                        hasTbankSuccess,
                        urlSuccess,
                        pageTitle,
                        url: window.location.href
                    });

                    // Проверяем, не отправляли ли мы уже сообщение об успешной оплате
                    if (!window.paymentSuccessDetected) {
                        // Устанавливаем флаг, чтобы предотвратить повторные сообщения
                        window.paymentSuccessDetected = true;

                        // Останавливаем все интервалы проверок
                        if (window.paymentCheckInterval) {
                            clearInterval(window.paymentCheckInterval);
                            window.paymentCheckInterval = null;
                            console.log('⏰ Stopped payment monitoring interval');
                        }

                        // Отправляем сообщение о успешной оплате для немедленного закрытия
                        sendMessageToRN({
                            type: 'PAYMENT_SUCCESS_AND_CLOSE',
                            message: 'Обнаружена успешная оплата на странице Т-Банка - закрываем WebView'
                        });

                        // Также отправляем сообщение об остановке мониторинга
                        sendMessageToRN({
                            type: 'STOP_PAYMENT_MONITORING',
                            message: 'Payment monitoring stopped - success detected'
                        });
                    } else {
                        console.log('⚠️ Payment success message already sent, skipping duplicate');
                    }

                    // Также автоматически возвращаемся в приложение через 3 секунды (резервный вариант)
                    setTimeout(returnToApp, 3000);

                    return true;
                }

                return false;
            }

            // Запускаем проверку сразу
            if (checkForPaymentSuccess()) {
                return;
            }

            // Настраиваем MutationObserver для отслеживания изменений на странице
            if (window.MutationObserver) {
                const observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        if (mutation.type === 'childList' || mutation.type === 'characterData') {
                            // Небольшая задержка чтобы дать странице обновиться
                            setTimeout(checkForPaymentSuccess, 500);
                        }
                    });
                });

                // Начинаем наблюдение за изменениями в body
                if (document.body) {
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true,
                        characterData: true
                    });
                }
            }

            // Также проверяем периодически (каждые 1.5 секунды - чаще для оперативности)
            window.paymentCheckInterval = setInterval(function() {
                if (checkForPaymentSuccess()) {
                    clearInterval(window.paymentCheckInterval);
                    window.paymentCheckInterval = null;
                }
            }, 1500);

            // Останавливаем проверки через 10 минут (увеличено для SBP платежей)
            setTimeout(function() {
                if (window.paymentCheckInterval) {
                    clearInterval(window.paymentCheckInterval);
                    window.paymentCheckInterval = null;
                    console.log('⏰ Stopped payment success monitoring');
                }
            }, 600000); // 10 минут

            console.log('👀 Started monitoring for payment success');
        })();
        true;
    `;

    /**
     * Обработчик сообщений от WebView
     */
    const handleWebViewMessage = useCallback(async (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('📨 WebView message received:', data);

            if (data.type === 'PAYMENT_SUCCESS_DETECTED') {
                console.log('🎉 Payment success detected from WebView, checking status...');

                // Небольшая задержка чтобы дать серверу время обновить статус
                setTimeout(async () => {
                    onCheckStatus();
                }, 1000);
            } else if (data.type === 'PAYMENT_SUCCESS_AND_CLOSE') {
                console.log('🎉 Payment success and close detected from WebView');
                onPaymentSuccess();
            } else if (data.type === 'STOP_PAYMENT_MONITORING') {
                console.log('🛑 Stop payment monitoring requested from WebView');
                // Останавливаем мониторинг в React Native (если нужно)
            }
        } catch (error) {
            console.warn('⚠️ Error parsing WebView message:', error);
        }
    }, [onCheckStatus, onPaymentSuccess]);

    if (!paymentUrl) {
        return (
            <View style={styles.webViewLoadingContainer}>
                <ActivityIndicator size="large" color={Color.primary} />
                <Text style={styles.loadingText}>Подготовка формы оплаты...</Text>
            </View>
        );
    }

    return (
        <>
            {isLoading && (
                <View style={styles.webViewLoadingContainer}>
                    <ActivityIndicator size="large" color={Color.primary} />
                    <Text style={styles.loadingText}>Загрузка формы оплаты...</Text>
                </View>
            )}

            <WebView
                ref={webViewRef}
                source={{ uri: paymentUrl }}
                style={styles.webView}
                onNavigationStateChange={handleNavigationStateChange}
                onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
                onLoadProgress={handleLoadProgress}
                onLoadEnd={handleLoadEnd}
                onLoadStart={handleLoadStart}
                onError={handleError}
                onHttpError={handleHttpError}
                onContentProcessDidTerminate={handleContentProcessDidTerminate}
                onMessage={handleWebViewMessage}
                injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
                injectedJavaScript={injectedJavaScript}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                scalesPageToFit={true}
                nestedScrollEnabled={true}
                cacheEnabled={false}
                incognito={false}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                originWhitelist={['*']}
                mixedContentMode="always"
                androidLayerType="hardware"
                androidHardwareAccelerationDisabled={false}
                setSupportMultipleWindows={true}
                geolocationEnabled={false}
                allowFileAccess={false}
                allowUniversalAccessFromFileURLs={false}
                userAgent={Platform.OS === 'ios'
                    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
                    : 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
                }
            />
        </>
    );
};

const styles = StyleSheet.create({
    webViewLoadingContainer: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1000
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        fontFamily: FontFamily.interRegular,
        color: Color.textSecondary
    },
    webView: {
        flex: 1
    }
});


