/**
 * Утилиты для работы с датами и временем
 */

/**
 * Форматирует время последнего посещения для отображения в чате
 */
export const formatLastSeen = (lastSeenAt, isOnline) => {
  if (isOnline) {
    return 'онлайн';
  }
  
  if (!lastSeenAt) {
    return 'был в сети давно';
  }
  
  const now = new Date();
  const lastSeen = new Date(lastSeenAt);
  const diffMs = now - lastSeen;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) {
    return 'только что';
  }
  
  if (diffMinutes < 60) {
    return `${diffMinutes} мин. назад`;
  }
  
  if (diffHours < 24) {
    return `${diffHours} ч. назад`;
  }
  
  if (diffDays === 1) {
    return 'вчера';
  }
  
  if (diffDays < 7) {
    return `${diffDays} дн. назад`;
  }
  
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} нед. назад`;
  }
  
  const months = Math.floor(diffDays / 30);
  if (months < 12) {
    return `${months} мес. назад`;
  }
  
  return 'давно не заходил';
};

/**
 * Определяет, онлайн ли пользователь (активность в последние 5 минут)
 */
export const isUserOnline = (lastSeenAt) => {
  if (!lastSeenAt) {
    return false;
  }
  
  const now = new Date();
  const lastSeen = new Date(lastSeenAt);
  const diffMs = now - lastSeen;
  const isOnline = diffMs < 5 * 60 * 1000; // 5 минут
  
  return isOnline;
};