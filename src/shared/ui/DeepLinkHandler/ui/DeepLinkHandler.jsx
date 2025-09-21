import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { selectStops, fetchAllStops } from '@entities/stop';
import { selectUser } from '@entities/auth';
import { CommonActions } from '@react-navigation/native';

// Компонент для обработки deep links при холодном старте приложения
export const DeepLinkHandler = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const stops = useSelector(selectStops);
    const user = useSelector(selectUser);
    const processedLinks = useRef(new Set());

    useEffect(() => {
        // Обработка deep link при холодном старте приложения
        const handleInitialURL = async () => {
            try {
                const initialUrl = await Linking.getInitialURL();
                if (initialUrl) {
                    console.log('🔗 Initial deep link detected:', initialUrl);
                    await handleDeepLink(initialUrl);
                }
            } catch (error) {
                console.error('❌ Error handling initial URL:', error);
            }
        };

        // Обработка deep links когда приложение уже запущено
        const handleLinkingURL = (event) => {
            console.log('🔗 Deep link received while app running:', event.url);
            handleDeepLink(event.url);
        };

        // Задержка для инициализации навигации
        const timer = setTimeout(() => {
            handleInitialURL();
        }, 1000);

        const subscription = Linking.addEventListener('url', handleLinkingURL);

        return () => {
            clearTimeout(timer);
            subscription?.remove();
        };
    }, []);

    const handleDeepLink = async (url) => {
        if (!url || !navigation) {
            console.log('❌ No URL or navigation available');
            return;
        }

        if (processedLinks.current.has(url)) {
            console.log('🚫 Deep link already processed:', url);
            return;
        }

        processedLinks.current.add(url);

        if (processedLinks.current.size > 5) {
            const linksArray = Array.from(processedLinks.current);
            processedLinks.current.clear();
            linksArray.slice(-3).forEach(link => processedLinks.current.add(link));
        }


        try {
            const stopId = extractStopIdFromUrl(url);

            if (!stopId) {
                return;
            }


            if (!user || user.role !== 'CLIENT') {
                return;
            }

            await dispatch(fetchAllStops()).unwrap();


            setTimeout(() => {

                navigation.dispatch(
                    CommonActions.navigate({
                        name: 'Main',
                        params: {
                            screen: 'MainTab',
                            params: {
                                screen: 'StopDetails',
                                params: {
                                    stopId: parseInt(stopId),
                                    fromDeepLink: true,
                                    originalUrl: url
                                }
                            }
                        }
                    })
                );
            }, 800);

        } catch (error) {

            navigation.dispatch(
                CommonActions.navigate({
                    name: 'Main',
                    params: {
                        screen: 'MainTab',
                        params: {
                            screen: 'Main'
                        }
                    }
                })
            );
        }
    };

    const extractStopIdFromUrl = (url) => {
        try {
            const patterns = [
                /iceberg:\/\/stop\/(\d+)/,
                /\/stop\/(\d+)/,
                /stopId[=:](\d+)/,
                /[?&]stopId=(\d+)/,
                /[?&]stop=(\d+)/,
            ];

            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match && match[1]) {
                    return match[1];
                }
            }

            if (__DEV__ && url.includes('exp://')) {
                try {
                    const urlObj = new URL(url);
                    const redirectUrl = urlObj.searchParams.get('url');
                    
                    if (redirectUrl) {
                        return extractStopIdFromUrl(redirectUrl);
                    }
                } catch (urlError) {
                }
            }

            return null;
        } catch (error) {
            console.error('❌ Error extracting stopId from URL:', error);
            return null;
        }
    };

    return null;
};

export default DeepLinkHandler;