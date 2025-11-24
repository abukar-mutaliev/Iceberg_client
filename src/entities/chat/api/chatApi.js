import { createApiModule } from '@shared/services/ApiClient';

const chatApiModule = createApiModule('/api/chat');

const ChatApi = {
  getRooms: (params = {}) => chatApiModule.get('/rooms', params),

  getRoom: (roomId) => chatApiModule.get(`/rooms/${roomId}`),

  getMessages: (roomId, params = {}) => chatApiModule.get(`/rooms/${roomId}/messages`, params),

  createRoom: (form) => chatApiModule.post('/rooms', form, { headers: { 'Content-Type': 'multipart/form-data' } }),

  getOrCreateProductRoom: (productId) => chatApiModule.post(`/rooms/product/${productId}`),

  updateRoom: (roomId, form) => chatApiModule.patch(`/rooms/${roomId}`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),

  addMembers: (roomId, payload) => chatApiModule.post(`/rooms/${roomId}/members`, payload),
                           removeMembers: (roomId, payload) => chatApiModule.delete(`/rooms/${roomId}/members`, payload),
  removeMember: (roomId, userId) => chatApiModule.delete(`/rooms/${roomId}/members/${userId}`),

  assignAdmin: (roomId, userId) => chatApiModule.post(`/rooms/${roomId}/admins/${userId}`),

  revokeAdmin: (roomId, userId) => chatApiModule.delete(`/rooms/${roomId}/admins/${userId}`),

  sendMessage: (roomId, form) => chatApiModule.post(`/rooms/${roomId}/messages`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),

  deleteMessage: (messageId, payload = {}) => chatApiModule.delete(`/messages/${messageId}`, payload),

  hideMessage: (messageId) => chatApiModule.post(`/messages/${messageId}/hide`),

  markAsRead: (roomId) => chatApiModule.post(`/rooms/${roomId}/read`),

  searchUsers: (query, limit = 2000) => chatApiModule.get('/users/search', { query, limit }),

  searchRooms: (query) => chatApiModule.get('/rooms/search', { query }),

  deleteRoom: (roomId) => chatApiModule.delete(`/rooms/${roomId}`),

  leaveRoom: (roomId, payload = {}) => chatApiModule.post(`/rooms/${roomId}/leave`, payload),

  // Предзагрузка аватара группы
  preloadAvatar: (formData) => chatApiModule.post('/upload/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export default ChatApi;

