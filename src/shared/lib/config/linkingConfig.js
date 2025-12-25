
import { LinkingOptions } from '@react-navigation/native';
import {Linking, Platform} from 'react-native';
import { getBaseUrl } from '@shared/api/api';

const getDevelopmentPrefix = () => {
    if (__DEV__) {
        if (Platform.OS === 'android') {
            return 'exp://192.168.1.226:8081';
        }
        return 'exp://localhost:8081';
    }
    return null;
};

export const linkingConfig = {
    prefixes: [
        'iceberg://',
        'http://212.67.11.134:5000',
        ...__DEV__ ? [getDevelopmentPrefix()].filter(Boolean) : [],
    ],
    config: {
        screens: {
            Main: {
                screens: {
                    MainTab: {
                        screens: {
                            Main: 'main',
                            StopDetails: {
                                path: 'stop/:stopId',
                                parse: {
                                    stopId: (stopId) => parseInt(stopId, 10),
                                },
                                stringify: {
                                    stopId: (stopId) => `${stopId}`,
                                },
                            },
                            NotificationsScreen: 'notifications',
                        },
                    },
                    Search: {
                        screens: {
                            SearchMain: 'search',
                            SearchResults: 'search/results',
                        },
                    },
                    Favourites: {
                        screens: {
                            FavouritesMain: 'favourites',
                        },
                    },
                    Cart: {
                        screens: {
                            CartMain: 'cart',
                        },
                    },
                    ProfileTab: {
                        screens: {
                            ProfileMain: 'profile',
                            StopsListScreen: 'stops',
                            StopDetails: {
                                path: 'stop/:stopId',
                                parse: {
                                    stopId: (stopId) => parseInt(stopId, 10),
                                },
                                stringify: {
                                    stopId: (stopId) => `${stopId}`,
                                },
                            },
                        },
                    },
                },
            },
            StopDetails: {
                path: 'stop/:stopId',
                parse: {
                    stopId: (stopId) => parseInt(stopId, 10),
                },
                stringify: {
                    stopId: (stopId) => `${stopId}`,
                },
            },
            StopsListScreen: 'stops',
            NotificationsScreen: 'notifications',
            MapScreen: 'map',
            Auth: 'auth',
            Welcome: 'welcome',
        },
    },
    getInitialURL: async () => {
        const url = await Linking.getInitialURL();

        if (url) {
            console.log('🔗 Initial linking URL:', url);
            return url;
        }

        return null;
    },
    subscribe: (listener) => {
        const onReceiveURL = ({ url }) => {
            console.log('🔗 Received linking URL:', url);
            listener(url);
        };

        const subscription = Linking.addEventListener('url', onReceiveURL);

        return () => {
            subscription?.remove();
        };
    },
};