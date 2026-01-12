import { useState, useCallback } from 'react';

/**
 * Хук для управления всеми модальными окнами чата
 */
export const useChatModals = () => {
  // Image Viewer
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [imageList, setImageList] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Menu Modal
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  
  // Delete Message Modal
  const [deleteMessageModalVisible, setDeleteMessageModalVisible] = useState(false);
  const [messagesToDelete, setMessagesToDelete] = useState([]);
  
  // Forward Modal
  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  
  // Image Viewer handlers
  const handleImagePress = useCallback((imageUri, messages = []) => {
    // Собираем все изображения из всех сообщений
    const allImages = [];
    
    if (messages && Array.isArray(messages)) {
      messages.forEach((message) => {
        if (message.type === 'IMAGE' && message.attachments && Array.isArray(message.attachments)) {
          message.attachments.forEach((attachment) => {
            if (attachment.type === 'IMAGE' && attachment.path) {
              allImages.push(attachment.path);
            }
          });
        }
      });
    }
    
    // Если массив пуст, используем переданный imageUri
    if (allImages.length === 0 && imageUri) {
      allImages.push(imageUri);
    }
    
    // Находим индекс текущего изображения
    const index = allImages.findIndex(uri => uri === imageUri);
    const currentIndex = index >= 0 ? index : 0;
    
    setImageList(allImages);
    setCurrentImageIndex(currentIndex);
    setSelectedImageUri(imageUri || allImages[currentIndex] || null);
    setImageViewerVisible(true);
  }, []);
  
  const handleImageViewerClose = useCallback(() => {
    setImageViewerVisible(false);
    setSelectedImageUri(null);
    setImageList([]);
    setCurrentImageIndex(0);
  }, []);
  
  const handleImageIndexChange = useCallback((index) => {
    if (imageList[index]) {
      setCurrentImageIndex(index);
      setSelectedImageUri(imageList[index]);
    }
  }, [imageList]);
  
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
    imageList,
    currentImageIndex,
    handleImagePress,
    handleImageViewerClose,
    handleImageIndexChange,
    
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
