// import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
// import { View, TextInput, TouchableOpacity, Text, StyleSheet, Platform, Modal, Keyboard } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
// import { useDispatch, useSelector } from 'react-redux';
// import { Border, Padding, Color } from '@app/styles/GlobalStyles';
// import { sendText, sendImages, sendVoice, sendPoll, addOptimisticMessage } from '@entities/chat/model/slice';
// import { AttachmentPreview } from './AttachmentPreview';
// import { VoiceRecorder } from './VoiceRecorder';
// import { PollCreationModal } from './PollCreationModal';
// import { ReplyPreview } from './ReplyPreview';
// import { FullEmojiPicker } from './FullEmojiPicker';
// import { AttachIcon } from '@shared/ui/Icon/AttachIcon';
// import { CameraIcon } from '@shared/ui/Icon/CameraIcon';
// import { Ionicons } from '@expo/vector-icons';
// import ChatApi from '@entities/chat/api/chatApi';
// import { useChatSocketActions } from '@entities/chat/hooks/useChatSocketActions';
// import { playSendSound } from '@entities/chat/lib/sendSound';

// export const Composer = ({
//   roomId,
//   onTyping,
//   replyTo,
//   onCancelReply,
//   disabled = false,
//   participantsById,
//   participants,
//   autoFocus = false
// }) => {
//   const dispatch = useDispatch();
//   const currentUserId = useSelector(state => state.auth?.user?.id);
//   const currentUser = useSelector(state => state.auth?.user);
//   const { emitTyping } = useChatSocketActions();
//   const [text, setText] = useState('');
//   const [files, setFiles] = useState([]);
//   const [captions, setCaptions] = useState({});
//   const [isRecording, setIsRecording] = useState(false);
//   const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
//   const [showPollModal, setShowPollModal] = useState(false);
//   const [showEmojiPicker, setShowEmojiPicker] = useState(false); // По умолчанию скрываем эмодзи-пикер
//   const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
//   const [pendingAction, setPendingAction] = useState(null); // 'gallery' | 'camera' | 'poll' | null
//   const isSendingRef = useRef(false);
//   const typingTimeoutRef = useRef(null);
//   const textInputRef = useRef(null);
//   const isSwitchingToKeyboardRef = useRef(false);
//   const isSwitchingToEmojiRef = useRef(false);

//   const canSend = useMemo(() => !disabled && (text.trim().length > 0 || files.length > 0), [disabled, text, files.length]);
//   const showVoiceButton = useMemo(() => !disabled && text.trim().length === 0 && files.length === 0, [disabled, text, files.length]);

//   // Очищаем таймер при размонтировании
//   useEffect(() => {
//     return () => {
//       if (typingTimeoutRef.current) {
//         clearTimeout(typingTimeoutRef.current);
//       }
//     };
//   }, []);

//   // Отслеживание состояния клавиатуры
//   useEffect(() => {
//     const keyboardWillShow = Keyboard.addListener(
//       Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
//       () => {
//         setIsKeyboardVisible(true);
//         // Если переключаемся на клавиатуру намеренно - не скрываем эмодзи-пикер сразу
//         if (!isSwitchingToKeyboardRef.current) {
//           setShowEmojiPicker(false);
//         }
//       }
//     );

//     const keyboardWillHide = Keyboard.addListener(
//       Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
//       () => {
//         setIsKeyboardVisible(false);
//         // Показываем эмодзи-пикер только если это намеренное переключение на эмодзи
//         if (isSwitchingToEmojiRef.current) {
//           setShowEmojiPicker(true);
//           isSwitchingToEmojiRef.current = false;
//         }
//         // Если клавиатура закрылась по другой причине - НЕ показываем эмодзи-пикер автоматически
//       }
//     );

//     return () => {
//       keyboardWillShow.remove();
//       keyboardWillHide.remove();
//     };
//   }, []);

//   // Автоматический фокус на поле ввода при монтировании (для быстрого ответа из уведомления)
//   useEffect(() => {
//     if (autoFocus && textInputRef.current) {
//       // Небольшая задержка для гарантии, что экран полностью смонтирован
//       const timer = setTimeout(() => {
//         textInputRef.current?.focus();
//       }, 300);
//       return () => clearTimeout(timer);
//     }
//   }, [autoFocus]);

//   const pickImages = async () => {
//     if (disabled) return;
    
//     console.log('📸 pickImages: Начало выбора изображений');
    
//     try {
//       // Проверяем текущий статус разрешений
//       const { status: currentStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
//       console.log('📸 Текущий статус разрешений:', currentStatus);
      
//       // Если разрешения не предоставлены, запрашиваем их
//       if (currentStatus !== 'granted') {
//         console.log('📸 Запрашиваем разрешение на доступ к галерее');
//         const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
//         console.log('📸 Результат запроса разрешения:', permissionResult.status);
        
//         if (permissionResult.status !== 'granted') {
//           console.log('❌ Разрешение на доступ к галерее не предоставлено');
//           return;
//         }
//       }

//       console.log('📸 Открываем галерею...');
//       const result = await ImagePicker.launchImageLibraryAsync({
//         mediaTypes: 'images',
//         allowsMultipleSelection: true,
//         selectionLimit: 10,
//         quality: 0.9,
//       });

//       console.log('📸 Результат выбора:', { canceled: result.canceled, assetsCount: result.assets?.length });

//       if (!result.canceled && result.assets && result.assets.length > 0) {
//         const selected = result.assets.map((asset) => ({
//           uri: asset.uri,
//           name: asset.fileName || `photo_${Date.now()}.jpg`,
//           type: asset.type || 'image/jpeg',
//         }));
//         console.log('✅ Выбрано изображений:', selected.length);
//         setFiles((prev) => [...prev, ...selected]);
//       } else {
//         console.log('ℹ️ Выбор изображений отменен');
//       }
//     } catch (e) {
//       console.error('❌ Ошибка при выборе изображений:', e);
//       console.error('❌ Stack trace:', e.stack);
//     }
//   };

//   const takePhoto = async () => {
//     if (disabled) return;
    
//     console.log('📷 takePhoto: Начало съемки фото');
    
//     try {
//       // Проверяем текущий статус разрешений
//       const { status: currentStatus } = await ImagePicker.getCameraPermissionsAsync();
//       console.log('📷 Текущий статус разрешений камеры:', currentStatus);
      
//       // Если разрешения не предоставлены, запрашиваем их
//       if (currentStatus !== 'granted') {
//         console.log('📷 Запрашиваем разрешение на доступ к камере');
//         const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
//         console.log('📷 Результат запроса разрешения:', permissionResult.status);
        
//         if (permissionResult.status !== 'granted') {
//           console.log('❌ Разрешение на доступ к камере не предоставлено');
//           return;
//         }
//       }

//       console.log('📷 Открываем камеру...');
//       const result = await ImagePicker.launchCameraAsync({
//         mediaTypes: 'images',
//         quality: 0.9,
//       });

//       console.log('📷 Результат съемки:', { canceled: result.canceled, assetsCount: result.assets?.length });

//       if (!result.canceled && result.assets && result.assets.length > 0) {
//         const selected = result.assets.map((asset) => ({
//           uri: asset.uri,
//           name: asset.fileName || `photo_${Date.now()}.jpg`,
//           type: asset.type || 'image/jpeg',
//         }));
//         console.log('✅ Снято фото:', selected.length);
//         setFiles((prev) => [...prev, ...selected]);
//       } else {
//         console.log('ℹ️ Съемка фото отменена');
//       }
//     } catch (e) {
//       console.error('❌ Ошибка при съемке фото:', e);
//       console.error('❌ Stack trace:', e.stack);
//     }
//   };

//   const handleChangeText = (val) => {
//     if (disabled) return;

//     const wasEmpty = text.trim().length === 0;
//     const isEmpty = val.trim().length === 0;

//     setText(val);

//     // Управляем индикатором печати
//     if (!isEmpty && wasEmpty) {
//       // Начал печатать - отправляем событие
//       onTyping?.(true);
//       if (roomId) {
//         emitTyping(roomId, true, 'text');
//       }
//     } else if (isEmpty && !wasEmpty) {
//       // Закончил печатать - отправляем событие окончания
//       onTyping?.(false);
//       if (roomId) {
//         emitTyping(roomId, false, 'text');
//       }
//     } else if (!isEmpty) {
//       // Продолжает печатать - сбрасываем таймер
//       if (typingTimeoutRef.current) {
//         clearTimeout(typingTimeoutRef.current);
//       }

//       // Устанавливаем таймер для отправки события окончания печати
//       typingTimeoutRef.current = setTimeout(() => {
//         onTyping?.(false);
//         if (roomId) {
//           emitTyping(roomId, false, 'text');
//         }
//       }, 2000); // 2 секунды бездействия
//     }
//   };

//   const handleBlur = () => {
//     // Очищаем таймер печати
//     if (typingTimeoutRef.current) {
//       clearTimeout(typingTimeoutRef.current);
//       typingTimeoutRef.current = null;
//     }

//     onTyping?.(false);
//     // Отправляем событие окончания печати через WebSocket
//     if (roomId && text.trim().length > 0) {
//       emitTyping(roomId, false, 'text');
//     }
//   };

//   const onChangeCaption = (key, value) => setCaptions((prev) => ({ ...prev, [key]: value }));
//   const onRemove = (key) => setFiles((prev) => prev.filter((f) => (f.uri || f.name) !== key));

//   const doSend = async () => {
//     if (disabled || !canSend || isSendingRef.current) return;
//     isSendingRef.current = true;
    
//     // Генерируем временный ID для отслеживания оптимистичного сообщения
//     const temporaryId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
//     // Сохраняем текущие значения
//     const currentText = text.trim();
//     const currentFiles = [...files];
//     const currentCaptions = { ...captions };
    
//     // Очищаем форму немедленно для лучшего UX
//     if (currentText.length > 0) {
//       setText('');
//     }
//     if (currentFiles.length > 0) {
//       setFiles([]);
//       setCaptions({});
//     }
//     // Очищаем таймер печати
//     if (typingTimeoutRef.current) {
//       clearTimeout(typingTimeoutRef.current);
//       typingTimeoutRef.current = null;
//     }

//     onTyping?.(false);
//     // Отправляем событие окончания печати через WebSocket
//     if (roomId) {
//       emitTyping(roomId, false, 'text');
//     }

//     try {
//       if (currentFiles.length > 0) {
//         // Создаем временный ID для оптимистичного сообщения
//         const temporaryId = `temp_image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//         const replyToIdToSend = replyTo?.id || null;
//         const replyToData = replyTo || null;
        
//         // Отменяем ответ СРАЗУ для лучшего UX
//         onCancelReply?.();
        
//         // Подготавливаем attachments для оптимистичного сообщения
//         const optimisticAttachments = currentFiles.map((f, idx) => ({
//           type: 'IMAGE',
//           path: f.uri,
//           mimeType: f.type || 'image/jpeg',
//           size: f.size,
//           caption: currentCaptions[f.uri || f.name] || ''
//         }));
        
//         // Создаем оптимистичное сообщение для изображений
//         const optimisticMessage = {
//           id: temporaryId,
//           temporaryId,
//           roomId,
//           type: 'IMAGE',
//           content: '', // Подписи будут в attachments
//           senderId: currentUserId,
//           sender: {
//             id: currentUserId,
//             name: currentUser?.name || currentUser?.firstName || 'Вы',
//             avatar: currentUser?.avatar,
//             role: currentUser?.role,
//           },
//           attachments: optimisticAttachments,
//           replyToId: replyToIdToSend,
//           replyTo: replyToData,
//           status: 'SENDING',
//           createdAt: new Date().toISOString(),
//           isOptimistic: true,
//         };

//         // Добавляем оптимистичное сообщение в стор
//         dispatch(addOptimisticMessage({ roomId, message: optimisticMessage }));

//         const orderedCaptions = currentFiles.map((f) => currentCaptions[f.uri || f.name] || '');
        
//         // Отправляем изображения с temporaryId и replyToId
//         await dispatch(sendImages({ 
//           roomId, 
//           files: currentFiles, 
//           captions: orderedCaptions,
//           temporaryId,
//           replyToId: replyToIdToSend
//         })).unwrap();
        
//         // Воспроизводим звук отправки
//         playSendSound();
//       }
      
//       if (currentText.length > 0) {
//         const replyToIdToSend = replyTo?.id || null;
//         const replyToData = replyTo || null;
        
//         // Отменяем ответ СРАЗУ для лучшего UX
//         onCancelReply?.();
        
//         // Создаем оптимистичное сообщение
//         const optimisticMessage = {
//           id: temporaryId, // Используем temporaryId как ID
//           temporaryId, // Также сохраняем для поиска
//           roomId,
//           type: 'TEXT',
//           content: currentText,
//           senderId: currentUserId,
//           sender: {
//             id: currentUserId,
//             name: currentUser?.name || currentUser?.firstName || 'Вы',
//             avatar: currentUser?.avatar,
//             role: currentUser?.role,
//           },
//           replyToId: replyToIdToSend,
//           replyTo: replyToData,
//           status: 'SENDING',
//           createdAt: new Date().toISOString(),
//           isOptimistic: true,
//         };
        
//         // Добавляем сообщение в UI немедленно
//         if (__DEV__) {
//           console.log('📤 Composer: Adding optimistic message:', {
//             temporaryId,
//             content: currentText,
//             roomId,
//             replyToId: replyToIdToSend
//           });
//         }
//         dispatch(addOptimisticMessage({ roomId, message: optimisticMessage }));
        
//         // Отправляем на сервер с await для синхронизации
//         if (__DEV__) {
//           console.log('📤 Composer: Sending message to server:', { temporaryId, roomId, replyToId: replyToIdToSend });
//         }
//         await dispatch(sendText({ roomId, content: currentText, temporaryId, replyToId: replyToIdToSend })).unwrap();
        
//         // Воспроизводим звук отправки
//         playSendSound();
//       }
//     } catch (error) {
//       console.error('Ошибка отправки сообщения:', error);
//       // В случае ошибки возвращаем текст обратно
//       if (currentText.length > 0) {
//         setText(currentText);
//       }
//       if (currentFiles.length > 0) {
//         setFiles(currentFiles);
//         setCaptions(currentCaptions);
//       }
//     } finally {
//       isSendingRef.current = false;
//     }
//   };

//   const handleStartRecording = () => {
//     if (disabled) return;
//     setIsRecording(true);
//   };

//   const handleCancelRecording = () => {
//     setIsRecording(false);
//   };

//   const handleSendVoice = async (voiceData) => {
//     if (disabled || isSendingRef.current) return;
//     isSendingRef.current = true;

//     try {
//       setIsRecording(false);
      
//       if (__DEV__) {
//         console.log('🎤 Composer: Sending voice message:', {
//           duration: voiceData.duration,
//           size: voiceData.size,
//           uri: voiceData.uri,
//           roomId
//         });
//       }

//       // Создаем временный ID
//       const temporaryId = `temp_voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//       const replyToIdToSend = replyTo?.id || null;
//       const replyToData = replyTo || null;
      
//       // Отменяем ответ СРАЗУ для лучшего UX
//       onCancelReply?.();
      
//       // Создаем оптимистичное голосовое сообщение
//       const optimisticMessage = {
//         id: temporaryId,
//         temporaryId,
//         roomId,
//         type: 'VOICE',
//         content: '',
//         senderId: currentUserId,
//         sender: {
//           id: currentUserId,
//           name: currentUser?.name || currentUser?.firstName || 'Вы',
//           avatar: currentUser?.avatar,
//           role: currentUser?.role,
//         },
//         attachments: [{
//           type: 'VOICE',
//           path: voiceData.uri,
//           mimeType: voiceData.type || 'audio/aac',
//           size: voiceData.size,
//           duration: voiceData.duration,
//           waveform: voiceData.waveform || [], // ✅ Добавляем waveform
//         }],

//         replyToId: replyToIdToSend,
//         replyTo: replyToData,
//         status: 'SENDING',
//         createdAt: new Date().toISOString(),
//         isOptimistic: true,
//       };

//       // Добавляем оптимистичное сообщение в стор
//       dispatch(addOptimisticMessage({ roomId, message: optimisticMessage }));

//       // Отправляем голосовое сообщение с temporaryId и replyToId
//       await dispatch(sendVoice({ 
//         roomId, 
//         voice: voiceData,
//         temporaryId,
//         replyToId: replyToIdToSend
//       })).unwrap();
      
//       // Воспроизводим звук отправки
//       playSendSound();
      
//       if (__DEV__) {
//         console.log('✅ Голосовое сообщение успешно отправлено');
//       }
      
//     } catch (error) {
//       console.error('❌ Ошибка отправки голосового сообщения:', error);
//     } finally {
//       isSendingRef.current = false;
//     }
//   };

//   const handleCreatePoll = async (pollData) => {
//     if (disabled || isSendingRef.current) return;
//     isSendingRef.current = true;

//     try {
//       const temporaryId = `temp_poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//       const replyToIdToSend = replyTo?.id || null;
//       const replyToData = replyTo || null;

//       // Отменяем ответ СРАЗУ для лучшего UX
//       onCancelReply?.();

//       // Создаем оптимистичное сообщение с опросом
//       const optimisticMessage = {
//         id: temporaryId,
//         temporaryId,
//         roomId,
//         type: 'POLL',
//         content: pollData.question,
//         senderId: currentUserId,
//         sender: {
//           id: currentUserId,
//           name: currentUser?.name || currentUser?.firstName || 'Вы',
//           avatar: currentUser?.avatar,
//           role: currentUser?.role,
//         },
//         poll: {
//           id: temporaryId,
//           question: pollData.question,
//           allowMultiple: pollData.allowMultiple,
//           options: pollData.options.map((text, index) => ({
//             id: `temp_option_${index}`,
//             text,
//             order: index,
//             votes: [],
//           })),
//         },
//         replyToId: replyToIdToSend,
//         replyTo: replyToData,
//         status: 'SENDING',
//         createdAt: new Date().toISOString(),
//         isOptimistic: true,
//       };

//       dispatch(addOptimisticMessage({ roomId, message: optimisticMessage }));

//       // Отправляем опрос через thunk (как sendText/sendVoice)
//       await dispatch(sendPoll({ 
//         roomId, 
//         pollData,
//         temporaryId,
//         replyToId: replyToIdToSend
//       })).unwrap();
      
//       // Воспроизводим звук отправки
//       playSendSound();
//     } catch (error) {
//       console.error('❌ Ошибка отправки опроса:', error);
//     } finally {
//       isSendingRef.current = false;
//     }
//   };

//   // Обработчик выбора эмодзи для вставки в текст
//   const handleEmojiSelect = useCallback((emoji) => {
//     setText((prevText) => prevText + emoji);
//     // Не закрываем окно после выбора эмодзи - пользователь может выбрать несколько
//   }, []);

//   return (
//     <View style={styles.container}>
//       {files.length > 0 && (
//         <AttachmentPreview files={files} captions={captions} onChangeCaption={onChangeCaption} onRemove={onRemove} />
//       )}
//       <View style={styles.row}>
//         {/* Поле ввода */}
//         <View style={styles.inputContainer}>
//           {/* Превью ответа - прикреплено к полю ввода */}
//           {replyTo && (
//             <View style={styles.replyContainer}>
//               <ReplyPreview
//                 replyTo={replyTo}
//                 onCancel={onCancelReply}
//                 isInMessage={false}
//                 currentUserId={currentUserId}
//                 participantsById={participantsById}
//                 participants={participants}
//               />
//             </View>
//           )}
          
//           <View style={styles.inputWrapper}>
//             {/* Кнопка эмодзи слева (когда эмодзи-пикер закрыт) */}
//             {!disabled && !showEmojiPicker && (
//               <TouchableOpacity
//                 onPress={() => {
//                   if (!disabled) {
//                     if (isKeyboardVisible) {
//                       // Если клавиатура открыта - переключаемся на эмодзи
//                       isSwitchingToEmojiRef.current = true;
//                       textInputRef.current?.blur();
//                       Keyboard.dismiss();
//                     } else {
//                       // Если клавиатура закрыта - просто показываем эмодзи-пикер
//                       setShowEmojiPicker(true);
//                     }
//                   }
//                 }}
//                 style={styles.emojiBtn}
//                 disabled={disabled}
//               >
//                 <Ionicons
//                   name="happy-outline"
//                   size={24}
//                   color={disabled ? "#CCCCCC" : "#8696A0"}
//                 />
//               </TouchableOpacity>
//             )}
            
//             {/* Кнопка клавиатуры слева (когда открыт эмодзи-пикер) */}
//             {!disabled && showEmojiPicker && !isKeyboardVisible && (
//               <TouchableOpacity
//                 onPress={() => {
//                   if (!disabled) {
//                     // Устанавливаем флаг намеренного переключения на клавиатуру
//                     isSwitchingToKeyboardRef.current = true;
//                     // Скрываем эмодзи-пикер
//                     setShowEmojiPicker(false);
//                     // Фокусируемся на поле ввода - клавиатура откроется автоматически
//                     textInputRef.current?.focus();
//                     // Сбрасываем флаг после небольшой задержки
//                     setTimeout(() => {
//                       isSwitchingToKeyboardRef.current = false;
//                     }, 300);
//                   }
//                 }}
//                 style={styles.emojiBtn}
//                 disabled={disabled}
//               >
//                 <Ionicons
//                   name="create-outline"
//                   size={24}
//                   color={disabled ? "#CCCCCC" : "#00A884"}
//                 />
//               </TouchableOpacity>
//             )}
            
//             <TextInput
//               ref={textInputRef}
//               style={[styles.input, disabled && styles.inputDisabled]}
//               placeholder="Сообщение"
//               value={text}
//               onChangeText={handleChangeText}
//               onBlur={handleBlur}
//               onFocus={() => {
//                 // При фокусе на поле ввода закрываем эмодзи-пикер
//                 // Но только если это не было намеренное переключение через кнопку клавиатуры
//                 if (showEmojiPicker && !isSwitchingToKeyboardRef.current) {
//                   setShowEmojiPicker(false);
//                 }
//               }}
//               multiline
//               placeholderTextColor="#999999"
//               editable={!disabled}
//             />
            
//             {/* Кнопки справа в поле ввода */}
//             {!disabled && (
//               <View style={styles.rightButtons}>
//                 <TouchableOpacity 
//                   onPress={() => {
//                     if (!disabled) setShowAttachmentMenu(true);
//                   }} 
//                   style={styles.attachBtn}
//                   disabled={disabled}
//                 >
//                   <AttachIcon size={20} color={disabled ? "#CCCCCC" : "#8696A0"} />
//                 </TouchableOpacity>
//                 <TouchableOpacity 
//                   onPress={takePhoto} 
//                   style={styles.cameraBtn}
//                   disabled={disabled}
//                 >
//                   <CameraIcon size={20} color={disabled ? "#CCCCCC" : "#8696A0"} />
//                 </TouchableOpacity>
//               </View>
//             )}
//           </View>
//         </View>
        
//         {/* Кнопка отправки или записи голоса */}
//         {showVoiceButton ? (
//           <TouchableOpacity onPress={handleStartRecording} style={styles.voiceBtn}>
//             <Ionicons name="mic" size={24} color="#FFFFFF" />
//           </TouchableOpacity>
//         ) : (
//           <TouchableOpacity onPress={doSend} disabled={!canSend} style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}>
//             <Text style={styles.sendText}>➤</Text>
//           </TouchableOpacity>
//         )}
//       </View>

//       {/* Модальное окно записи голоса */}
//       <Modal
//         visible={isRecording}
//         transparent={true}
//         animationType="fade"
//         onRequestClose={handleCancelRecording}
//       >
//         <View style={styles.recordingModalOverlay}>
//           <VoiceRecorder
//             onSend={handleSendVoice}
//             onCancel={handleCancelRecording}
//             roomId={roomId}
//           />
//         </View>
//       </Modal>

//       {/* Меню прикрепления */}
//       <Modal
//         visible={showAttachmentMenu}
//         transparent={true}
//         animationType="fade"
//         onRequestClose={() => setShowAttachmentMenu(false)}
//         onDismiss={() => {
//           // Вызывается когда модальное окно полностью закрылось (только iOS)
//           if (pendingAction === 'gallery') {
//             setPendingAction(null);
//             pickImages();
//           } else if (pendingAction === 'camera') {
//             setPendingAction(null);
//             takePhoto();
//           } else if (pendingAction === 'poll') {
//             setPendingAction(null);
//             setShowPollModal(true);
//           }
//         }}
//       >
//         <TouchableOpacity
//           style={styles.attachmentMenuOverlay}
//           activeOpacity={1}
//           onPress={() => setShowAttachmentMenu(false)}
//         >
//           <View style={styles.attachmentMenu}>
//             <TouchableOpacity
//               style={styles.attachmentMenuItem}
//               onPress={() => {
//                 if (Platform.OS === 'ios') {
//                   // iOS: используем onDismiss callback
//                   setPendingAction('gallery');
//                   setShowAttachmentMenu(false);
//                 } else {
//                   // Android: можем открыть сразу
//                   setShowAttachmentMenu(false);
//                   setTimeout(() => pickImages(), 50);
//                 }
//               }}
//             >
//               <View style={[styles.attachmentMenuIcon, { backgroundColor: '#2196F3' }]}>
//                 <Ionicons name="images" size={24} color="#fff" />
//               </View>
//               <Text style={styles.attachmentMenuText}>Галерея</Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.attachmentMenuItem}
//               onPress={() => {
//                 if (Platform.OS === 'ios') {
//                   // iOS: используем onDismiss callback
//                   setPendingAction('camera');
//                   setShowAttachmentMenu(false);
//                 } else {
//                   // Android: можем открыть сразу
//                   setShowAttachmentMenu(false);
//                   setTimeout(() => takePhoto(), 50);
//                 }
//               }}
//             >
//               <View style={[styles.attachmentMenuIcon, { backgroundColor: '#E91E63' }]}>
//                 <Ionicons name="camera" size={24} color="#fff" />
//               </View>
//               <Text style={styles.attachmentMenuText}>Камера</Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.attachmentMenuItem}
//               onPress={() => {
//                 if (Platform.OS === 'ios') {
//                   // iOS: используем onDismiss callback
//                   setPendingAction('poll');
//                   setShowAttachmentMenu(false);
//                 } else {
//                   // Android: можем открыть сразу
//                   setShowAttachmentMenu(false);
//                   setShowPollModal(true);
//                 }
//               }}
//             >
//               <View style={[styles.attachmentMenuIcon, { backgroundColor: '#FFC107' }]}>
//                 <Ionicons name="bar-chart" size={24} color="#fff" />
//               </View>
//               <Text style={styles.attachmentMenuText}>Опрос</Text>
//             </TouchableOpacity>
//           </View>
//         </TouchableOpacity>
//       </Modal>

//       {/* Модальное окно создания опроса */}
//       <PollCreationModal
//         visible={showPollModal}
//         onClose={() => setShowPollModal(false)}
//         onSubmit={handleCreatePoll}
//       />

//       {/* Эмодзи-пикер встроенный ниже поля ввода (всегда в DOM, видимость управляется через visible) */}
//       <FullEmojiPicker
//         visible={showEmojiPicker}
//         onClose={() => {
//           // onClose больше не нужен, так как управление идет через события клавиатуры
//           // Но оставляем для совместимости
//         }}
//         onEmojiSelect={handleEmojiSelect}
//       />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     backgroundColor: 'transparent', 
//     borderTopWidth: 0, 
//     paddingBottom: Platform.OS === 'ios' ? 20 : 6,
//   },
//   replyContainer: {
//     backgroundColor: '#F0F0F0',
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     paddingHorizontal: 8,
//     paddingTop: 8,
//     paddingBottom: 4,
//     borderBottomWidth: 1,
//     borderBottomColor: '#E0E0E0',
//   },
//   row: {
//     flexDirection: 'row',
//     alignItems: 'flex-end',
//     paddingHorizontal: 8,
//     paddingVertical: 8,
//   },
//   inputContainer: {
//     flex: 1,
//     backgroundColor: 'rgba(255, 255, 255, 0.9)', // Полупрозрачный белый фон
//     borderRadius: 25,
//     marginRight: 8,
//     overflow: 'hidden', // Важно для скругленных углов
//     // Тень как в WhatsApp
//     shadowColor: '#000',
//     shadowOffset: {
//       width: 0,
//       height: 1,
//     },
//     shadowOpacity: 0.1,
//     shadowRadius: 2,
//     elevation: 2,
//     borderWidth: 1,
//     borderColor: 'rgba(229, 229, 229, 0.8)', // Полупрозрачная граница
//   },
//   inputWrapper: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 4,
//   },
//   emojiBtn: {
//     width: 32,
//     height: 32,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginLeft: 4,
//   },
//   input: {
//     flex: 1,
//     minHeight: 40,
//     maxHeight: 120,
//     paddingHorizontal: 16,
//     paddingVertical: Platform.OS === 'ios' ? 10 : 8,
//     fontSize: 16,
//     lineHeight: 20,
//     color: '#000000',
//   },
//   inputDisabled: {
//     opacity: 0.5,
//     backgroundColor: '#f5f5f5',
//   },
//   rightButtons: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingRight: 8,
//   },
//   attachBtn: {
//     width: 32,
//     height: 32,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginLeft: 4,
//   },
//   cameraBtn: {
//     width: 32,
//     height: 32,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginLeft: 4,
//   },
//   sendBtn: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: 'rgba(37, 211, 102, 0.95)', // Полупрозрачный WhatsApp зеленый
//     alignItems: 'center',
//     justifyContent: 'center',
//     // Тень как в WhatsApp
//     shadowColor: '#000',
//     shadowOffset: {
//       width: 0,
//       height: 2,
//     },
//     shadowOpacity: 0.2,
//     shadowRadius: 3,
//     elevation: 3,
//   },
//   sendBtnDisabled: {
//     backgroundColor: 'rgba(176, 190, 197, 0.8)', // Полупрозрачный серый для заблокированной кнопки
//   },
//   voiceBtn: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: 'rgba(37, 211, 102, 0.95)',
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: '#000',
//     shadowOffset: {
//       width: 0,
//       height: 2,
//     },
//     shadowOpacity: 0.2,
//     shadowRadius: 3,
//     elevation: 3,
//   },
//   sendText: {
//     color: '#FFFFFF',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   recordingModalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     justifyContent: 'flex-end',
//   },
//   attachmentMenuOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     justifyContent: 'flex-end',
//   },
//   attachmentMenu: {
//     backgroundColor: '#fff',
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     paddingVertical: 20,
//     paddingHorizontal: 16,
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//   },
//   attachmentMenuItem: {
//     alignItems: 'center',
//     flex: 1,
//   },
//   attachmentMenuIcon: {
//     width: 56,
//     height: 56,
//     borderRadius: 28,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginBottom: 8,
//   },
//   attachmentMenuText: {
//     fontSize: 12,
//     color: '#333',
//     marginTop: 4,
//   },
// });

// export default Composer;

