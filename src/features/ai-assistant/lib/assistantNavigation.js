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

const findNavigatorWithRoute = (navigation, routeName) => {
    let nav = navigation;
    while (nav) {
        const routeNames = nav.getState?.()?.routeNames;
        if (Array.isArray(routeNames) && routeNames.includes(routeName)) {
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

    const chatStackState = buildAssistantChatNavigatorState(params);

    const chatStackNav = findNavigatorWithRoute(navigation, 'AssistantChat');
    if (chatStackNav) {
        chatStackNav.navigate('AssistantChat', params);
        return;
    }

    const tabNav = findNavigatorWithRoute(navigation, 'ChatList');
    if (tabNav) {
        tabNav.dispatch(
            CommonActions.navigate({
                name: 'ChatList',
                params: { state: chatStackState },
            })
        );
        return;
    }

    const appNav = findNavigatorWithRoute(navigation, 'Main') || navigation;
    appNav.dispatch(
        CommonActions.navigate({
            name: 'Main',
            params: {
                screen: 'ChatList',
                params: { state: chatStackState },
            },
        })
    );
};
