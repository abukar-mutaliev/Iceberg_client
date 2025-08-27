import React, { useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';

export const YandexWebViewMap = ({
                                     latitude = 55.751244,
                                     longitude = 37.618423,
                                     zoom = 15,
                                     markers = [],
                                     onMapPress,
                                     style,
                                     height = 250
                                 }) => {
    const [isLoading, setIsLoading] = useState(true);
    const webViewRef = useRef(null);

    // Генерируем HTML с картой Yandex
    const generateMapHTML = () => {
        const markersJS = markers.map((marker, index) => {
            const lat = marker.coordinate?.latitude || marker.lat;
            const lng = marker.coordinate?.longitude || marker.lon;

            if (!lat || !lng) return '';

            return `
                var marker${index} = new ymaps.Placemark([${lat}, ${lng}], {
                    balloonContent: '${marker.title || 'Маркер'}'
                });
                map.geoObjects.add(marker${index});
            `;
        }).join('\n');

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Yandex Map</title>
            <script src="https://api-maps.yandex.ru/2.1/?apikey=YOUR_API_KEY&lang=ru_RU" type="text/javascript"></script>
            <style>
                body, html { 
                    margin: 0; 
                    padding: 0; 
                    width: 100%; 
                    height: 100%; 
                }
                #map { 
                    width: 100%; 
                    height: 100vh; 
                }
            </style>
        </head>
        <body>
            <div id="map"></div>
            
            <script type="text/javascript">
                ymaps.ready(function() {
                    var map = new ymaps.Map('map', {
                        center: [${latitude}, ${longitude}],
                        zoom: ${zoom},
                        controls: ['zoomControl', 'fullscreenControl']
                    });

                    // Добавляем маркеры
                    ${markersJS}

                    // Обработчик клика по карте
                    map.events.add('click', function(e) {
                        var coords = e.get('coords');
                        
                        // Отправляем координаты в React Native
                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'mapClick',
                                latitude: coords[0],
                                longitude: coords[1]
                            }));
                        }
                    });

                    // Уведомляем о готовности карты
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'mapReady'
                        }));
                    }
                });
            </script>
        </body>
        </html>
        `;
    };

    // Обработчик сообщений от WebView
    const handleWebViewMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            switch (data.type) {
                case 'mapReady':
                    setIsLoading(false);
                    break;
                case 'mapClick':
                    if (onMapPress) {
                        onMapPress({
                            nativeEvent: {
                                coordinate: {
                                    latitude: data.latitude,
                                    longitude: data.longitude
                                }
                            }
                        });
                    }
                    break;
            }
        } catch (error) {
            console.error('Ошибка обработки сообщения от WebView:', error);
        }
    };

    return (
        <View style={[{ height }, style]}>
            <WebView
                ref={webViewRef}
                source={{ html: generateMapHTML() }}
                style={StyleSheet.absoluteFillObject}
                onMessage={handleWebViewMessage}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                scalesPageToFit={true}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                onError={(error) => {
                    console.error('WebView ошибка:', error);
                    setIsLoading(false);
                }}
                onLoad={() => setIsLoading(false)}
            />

            {isLoading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3339B0" />
                    <Text style={styles.loadingText}>Загрузка карты...</Text>
                </View>
            )}
        </View>
    );
};

// Компонент маркера для совместимости
export const YandexMarker = ({ coordinate, title, children }) => {
    // Этот компонент используется только для передачи данных
    return null;
};

const styles = StyleSheet.create({
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: '#666',
    },
});