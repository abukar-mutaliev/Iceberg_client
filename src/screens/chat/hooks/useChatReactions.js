import { useState, useCallback } from 'react';

/**
 * Хук для управления реакциями на сообщения
 */
export const useChatReactions = (handleToggleReaction, toggleMessageSelection) => {
  const [reactionPickerVisible, setReactionPickerVisible] = useState(false);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null);
  const [reactionPickerPosition, setReactionPickerPosition] = useState(null);
  const [fullEmojiPickerVisible, setFullEmojiPickerVisible] = useState(false);
  
  const handleShowReactionPicker = useCallback((messageId, position) => {
    setReactionPickerMessageId(messageId);
    setReactionPickerPosition(position);
    setReactionPickerVisible(true);
  }, []);
  
  const handleCloseReactionPicker = useCallback((clearMessageId = true) => {
    setReactionPickerVisible(false);
    if (clearMessageId) {
      setReactionPickerMessageId(null);
      setReactionPickerPosition(null);
    }
  }, []);
  
  const handleEmojiSelect = useCallback(async (emoji) => {
    if (reactionPickerMessageId) {
      await handleToggleReaction(reactionPickerMessageId, emoji);
      toggleMessageSelection(reactionPickerMessageId); // Снимаем выделение
    }
    handleCloseReactionPicker(true);
  }, [reactionPickerMessageId, handleToggleReaction, toggleMessageSelection, handleCloseReactionPicker]);
  
  const handleShowFullEmojiPicker = useCallback(() => {
    setReactionPickerVisible(false);
    setFullEmojiPickerVisible(true);
  }, []);
  
  const handleCloseFullEmojiPicker = useCallback(() => {
    setFullEmojiPickerVisible(false);
    setReactionPickerMessageId(null);
    setReactionPickerPosition(null);
  }, []);
  
  const handleFullEmojiSelect = useCallback(async (emoji) => {
    if (reactionPickerMessageId) {
      await handleToggleReaction(reactionPickerMessageId, emoji);
      toggleMessageSelection(reactionPickerMessageId);
    }
    setReactionPickerVisible(false);
    setFullEmojiPickerVisible(false);
    setReactionPickerMessageId(null);
    setReactionPickerPosition(null);
  }, [reactionPickerMessageId, handleToggleReaction, toggleMessageSelection]);
  
  return {
    reactionPickerVisible,
    reactionPickerMessageId,
    reactionPickerPosition,
    fullEmojiPickerVisible,
    handleShowReactionPicker,
    handleCloseReactionPicker,
    handleEmojiSelect,
    handleShowFullEmojiPicker,
    handleCloseFullEmojiPicker,
    handleFullEmojiSelect,
  };
};
