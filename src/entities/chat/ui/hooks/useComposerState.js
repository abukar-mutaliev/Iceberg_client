import { useState, useMemo, useRef } from 'react';

/**
 * Хук для управления состоянием Composer
 * Все состояние в одном месте для легкого контроля
 */
export const useComposerState = (disabled) => {
  // ============ TEXT STATE ============
  const [text, setText] = useState('');
  
  // ============ FILES STATE ============
  const [files, setFiles] = useState([]);
  const [captions, setCaptions] = useState({});
  
  // ============ MODALS STATE ============
  const [isRecording, setIsRecording] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // ============ KEYBOARD STATE ============
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  // ============ PENDING ACTION ============
  const [pendingAction, setPendingAction] = useState(null);
  
  // ============ REFS ============
  const isSendingRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  const textInputRef = useRef(null);
  const isSwitchingToKeyboardRef = useRef(false);
  const isSwitchingToEmojiRef = useRef(false);
  
  // ============ COMPUTED VALUES ============
  
  const canSend = useMemo(() => 
    !disabled && (text.trim().length > 0 || files.length > 0),
    [disabled, text, files.length]
  );
  
  const showVoiceButton = useMemo(() => 
    !disabled && text.trim().length === 0 && files.length === 0,
    [disabled, text, files.length]
  );
  
  // ============ HANDLERS ============
  
  const onChangeCaption = (key, value) => {
    setCaptions(prev => ({ ...prev, [key]: value }));
  };
  
  const onRemoveFile = (key) => {
    setFiles(prev => prev.filter(f => (f.uri || f.name) !== key));
  };
  
  const clearForm = () => {
    setText('');
    setFiles([]);
    setCaptions({});
  };
  
  return {
    // Text
    text,
    setText,
    
    // Files
    files,
    setFiles,
    captions,
    setCaptions,
    onChangeCaption,
    onRemoveFile,
    
    // Modals
    isRecording,
    setIsRecording,
    showAttachmentMenu,
    setShowAttachmentMenu,
    showPollModal,
    setShowPollModal,
    showEmojiPicker,
    setShowEmojiPicker,
    
    // Keyboard
    isKeyboardVisible,
    setIsKeyboardVisible,
    
    // Pending action
    pendingAction,
    setPendingAction,
    
    // Refs
    isSendingRef,
    typingTimeoutRef,
    textInputRef,
    isSwitchingToKeyboardRef,
    isSwitchingToEmojiRef,
    
    // Computed
    canSend,
    showVoiceButton,
    
    // Actions
    clearForm,
  };
};