import { CommonActions } from '@react-navigation/native';

/**
 * Состояние ChatStack с ChatMain под AssistantChat — чтобы goBack и swipe-back работали.
 */
export const buildAssistantChatNavigatorState = (params = {}) => ({
    index: 1,
    routes: [
        { name: 'ChatMain' },
        { name: 'AssistantChat', params },
    ],
});

export const buildAssistantChatTabParams = (params = {}) => ({
    state: buildAssistantChatNavigatorState(params),
});

const getRouteNames = (nav) => {
    const routeNames = nav?.getState?.()?.routeNames;
    return Array.isArray(routeNames) ? routeNames : [];
};

const findNavigatorWithRoute = (navigation, routeName) => {
    let nav = navigation;
    while (nav) {
        if (getRouteNames(nav).includes(routeName)) {
            return nav;
        }
        nav = nav.getParent?.();
    }
    return null;
};

/** Табовый ChatStack: ChatMain + AssistantChat + GroupInfo … */
const findChatTabStackNavigator = (navigation) => {
    let nav = navigation;
    while (nav) {
        const routeNames = getRouteNames(nav);
        if (routeNames.includes('AssistantChat') && routeNames.includes('ChatMain')) {
            return nav;
        }
        nav = nav.getParent?.();
    }
    return null;
};

/** Корневой AppStack: ChatRoom, GroupInfo, Main … */
const findAppStackNavigator = (navigation) => {
    let nav = navigation;
    while (nav) {
        const routeNames = getRouteNames(nav);
        if (routeNames.includes('Main') && routeNames.includes('ChatRoom')) {
            return nav;
        }
        nav = nav.getParent?.();
    }
    return null;
};

/**
 * Открывает экран ИИ-помощника из любого места приложения (ProductDetail, репост, HelpCenter).
 */
export const navigateToAssistantChat = (navigation, params = {}) => {
    if (!navigation?.dispatch && !navigation?.navigate) return;

    const chatTabStackNav = findChatTabStackNavigator(navigation);
    if (chatTabStackNav) {
        chatTabStackNav.navigate('AssistantChat', params);
        return;
    }

    const appStackNav = findAppStackNavigator(navigation);
    if (appStackNav && getRouteNames(appStackNav).includes('AssistantChat')) {
        appStackNav.navigate('AssistantChat', params);
        return;
    }

    const mainTabNav = findNavigatorWithRoute(navigation, 'Main');
    if (mainTabNav) {
        mainTabNav.dispatch(
            CommonActions.navigate({
                name: 'Main',
                params: {
                    screen: 'ChatList',
                    params: buildAssistantChatTabParams(params),
                },
            })
        );
        return;
    }

    navigation.dispatch?.(
        CommonActions.navigate({
            name: 'Main',
            params: {
                screen: 'ChatList',
                params: buildAssistantChatTabParams(params),
            },
        })
    );
};
