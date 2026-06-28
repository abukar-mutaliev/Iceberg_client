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
