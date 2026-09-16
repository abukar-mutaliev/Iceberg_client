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
        if (nativeEvent.progress === 1) {
            onLoadingChange(false);
        } else if (nativeEvent.progress > 0.7 && isLoading) {
            setTimeout(() => {
                onLoadingChange(false);
            }, 500);
        }
    };

    const handleLoadEnd = () => {
        onLoadingChange(false);
    };

    const handleLoadStart = () => {
        onLoadingChange(true);
    };

    const handleError = (syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.error('❌ WebView error:', nativeEvent?.description || nativeEvent);
        onLoadingChange(false);
    };

    const handleHttpError = (syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.error('❌ WebView HTTP error:', nativeEvent.statusCode);
        onLoadingChange(false);
    };

    const handleContentProcessDidTerminate = () => {
        webViewRef.current?.reload();
    };

    const handleNavigationStateChange = (navState) => {
        const { url } = navState;

        if (url.startsWith('icebergapp://payment-result')) {
            onNavigationChange(url);
        }
    };

    const handleShouldStartLoadWithRequest = (request) => {
        const { url } = request;

        if (url.includes('tinkoff.ru') || url.includes('tbank.ru') || url.includes('securepay.tinkoff.ru')) {
            return true;
        }

        const bankSchemes = ['bank', 'sbolpay://', 'tpay://', 'sbp://', 'payapp://', 'sberpay://'];
        if (bankSchemes.some(scheme => url.startsWith(scheme))) {
            Linking.openURL(url).catch(err => {
                console.error('❌ Failed to open bank app:', err?.message || err);
            });
            return false;
        }

        if (url.startsWith('icebergapp://payment-result')) {
            onNavigationChange(url);
            return false;
        }

        if (url.includes('shop.ru')) {
            return true;
        }

        return false;
    };

    /**
     * JavaScript для инжекта в WebView (выполняется ДО загрузки страницы)
     * Перехватывает попытки открыть новое окно
     */
    const injectedJavaScriptBeforeContentLoaded = `
        (function() {
            window.open = function(url) {
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
            window.paymentSuccessDetected = false;

            const links = document.querySelectorAll('a[target="_blank"]');
            links.forEach(link => {
                link.removeAttribute('target');
            });

            // Функция для отправки сообщений в React Native
            function sendMessageToRN(message) {
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                    window.ReactNativeWebView.postMessage(JSON.stringify(message));
                }
            }

            // Функция для автоматического возврата в приложение после успешной оплаты
            function returnToApp() {
                const returnButtons = document.querySelectorAll('a, button, [role="button"]');
                const returnButton = Array.from(returnButtons).find(btn =>
                    btn.textContent.toLowerCase().includes('вернуться') ||
                    btn.textContent.toLowerCase().includes('магазин') ||
                    btn.textContent.toLowerCase().includes('назад') ||
                    btn.href?.includes('success') ||
                    btn.href?.includes('complete')
                );

                if (returnButton) {
                    returnButton.click();
                } else {
                    window.location.href = 'icebergapp://payment-result?status=success';
                }
            }

            // Отслеживаем успешную оплату на странице Т-Банка
            function checkForPaymentSuccess() {
                // Проверяем, не была ли оплата уже обнаружена ранее
                if (window.paymentSuccessDetected) {
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
                    if (!window.paymentSuccessDetected) {
                        window.paymentSuccessDetected = true;

                        if (window.paymentCheckInterval) {
                            clearInterval(window.paymentCheckInterval);
                            window.paymentCheckInterval = null;
                        }

                        sendMessageToRN({
                            type: 'PAYMENT_SUCCESS_AND_CLOSE',
                            message: 'Обнаружена успешная оплата на странице Т-Банка - закрываем WebView'
                        });

                        sendMessageToRN({
                            type: 'STOP_PAYMENT_MONITORING',
                            message: 'Payment monitoring stopped - success detected'
                        });
                    }

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
                }
            }, 600000);
        })();
        true;
    `;

    /**
     * Обработчик сообщений от WebView
     */
    const handleWebViewMessage = useCallback(async (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            if (data.type === 'PAYMENT_SUCCESS_DETECTED') {
                setTimeout(async () => {
                    onCheckStatus();
                }, 1000);
            } else if (data.type === 'PAYMENT_SUCCESS_AND_CLOSE') {
                onPaymentSuccess();
            }
        } catch (error) {
            // ignore malformed WebView messages
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


