import { useState, useCallback } from 'react';

/**
 * Хук для управления всеми модальными окнами чата
 */
export const useChatModals = () => {
  // Image Viewer
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  
  // Menu Modal
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  
  // Delete Message Modal
  const [deleteMessageModalVisible, setDeleteMessageModalVisible] = useState(false);
  const [messagesToDelete, setMessagesToDelete] = useState([]);
  
  // Forward Modal
  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  
  // Image Viewer handlers
  const handleImagePress = useCallback((imageUri) => {
    setSelectedImageUri(imageUri);
    setImageViewerVisible(true);
  }, []);
  
  const handleImageViewerClose = useCallback(() => {
    setImageViewerVisible(false);
    setSelectedImageUri(null);
  }, []);
  
  // Menu handlers
  const handleMenuPress = useCallback(() => {
    setMenuModalVisible(true);
  }, []);
  
  const closeMenuModal = useCallback(() => {
    setMenuModalVisible(false);
  }, []);
  
  // Delete Message handlers
  const openDeleteMessageModal = useCallback((messages) => {
    setMessagesToDelete(messages);
    setDeleteMessageModalVisible(true);
  }, []);
  
  const closeDeleteMessageModal = useCallback(() => {
    setDeleteMessageModalVisible(false);
    setMessagesToDelete([]);
  }, []);
  
  // Forward handlers
  const openForwardModal = useCallback((message = null) => {
    setMessageToForward(message);
    setForwardModalVisible(true);
  }, []);
  
  const closeForwardModal = useCallback(() => {
    setForwardModalVisible(false);
    setMessageToForward(null);
  }, []);
  
  return {
    // Image Viewer
    imageViewerVisible,
    selectedImageUri,
    handleImagePress,
    handleImageViewerClose,
    
    // Menu
    menuModalVisible,
    handleMenuPress,
    closeMenuModal,
    
    // Delete Message
    deleteMessageModalVisible,
    messagesToDelete,
    openDeleteMessageModal,
    closeDeleteMessageModal,
    
    // Forward
    forwardModalVisible,
    messageToForward,
    openForwardModal,
    closeForwardModal,
  };
};
