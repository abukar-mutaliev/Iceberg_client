import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomTabBar, TabBarProvider, useTabBar } from '@widgets/navigation';
import { featureFlags } from '@shared/config/featureFlags';

const Tab = createBottomTabNavigator();

const MainTabNavigatorContent = ({
    MainStackScreen,
    SearchStackScreen,
    CartStackScreen,
    ChatStackScreen,
    ProfileStackScreen,
    CatalogScreen,
}) => {
    const { isTabBarVisible } = useTabBar();
    const insets = useSafeAreaInsets();
    const tabBarHeight = 80 + insets.bottom;

    const tabBarStyle = React.useMemo(() => {
        const baseStyle = {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#ffffff',
            zIndex: 100,
            elevation: 8,
        };

        const style = isTabBarVisible ? {
            ...baseStyle,
            shadowOpacity: 0.1,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: -2 },
            height: tabBarHeight,
        } : {
            ...baseStyle,
            height: 0,
            opacity: 0,
            overflow: 'hidden',
        };
        return style;
    }, [isTabBarVisible, tabBarHeight]);

    return (
        <Tab.Navigator
            id="MainTabs"
            screenOptions={() => {
                const isIOS = Platform.OS === 'ios';
                return {
                    headerShown: false,
                    tabBarStyle: tabBarStyle,
                    lazy: true,
                    unmountOnBlur: isIOS,
                    freezeOnBlur: !isIOS,
                    animationEnabled: false,
                };
            }}
            sceneContainerStyle={isTabBarVisible ? { paddingBottom: tabBarHeight } : undefined}
            detachInactiveScreens={Platform.OS === 'ios'}
            tabBar={props => <CustomTabBar {...props} />}
            backBehavior="none"
        >
            <Tab.Screen name="MainTab" component={MainStackScreen} options={{ lazy: false }} />
            <Tab.Screen name="Search" component={SearchStackScreen} />
            <Tab.Screen name="Cart" component={CartStackScreen} />
            {featureFlags.chat && <Tab.Screen name="ChatList" component={ChatStackScreen} options={Platform.OS === 'ios' ? undefined : { unmountOnBlur: false }} />}
            <Tab.Screen name="ProfileTab" component={ProfileStackScreen} />
            <Tab.Screen name="Catalog" component={CatalogScreen} options={{ tabBarVisible: false }} />
        </Tab.Navigator>
    );
};

export const MainTabNavigator = (props) => (
    <TabBarProvider>
        <MainTabNavigatorContent {...props} />
    </TabBarProvider>
);
