export { AssistantChatScreen } from './ui/AssistantChatScreen';
export { AssistantProfileScreen } from './ui/AssistantProfileScreen';
export { AssistantAvatar } from './ui/AssistantAvatar';
export { AssistantSection } from './ui/AssistantSection';
export { AssistantChatHeader } from './ui/AssistantChatHeader';
export { useAiAssistant } from './hooks/useAiAssistant';
export {
    ASSISTANT_CHAT_TITLE,
    ASSISTANT_SUBTITLE,
    ASSISTANT_DESCRIPTION,
    ASSISTANT_CAPABILITIES,
    ASSISTANT_ESCALATION_HINT,
} from './constants';
export { isAssistantRoom, isAssistantUser, ASSISTANT_BOT_EMAIL } from './lib/isAssistantRoom';
export { navigateToAssistantChat } from './lib/assistantNavigation';
