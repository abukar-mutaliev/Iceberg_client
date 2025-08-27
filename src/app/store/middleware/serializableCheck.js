import { createSerializableStateInvariantMiddleware } from '@reduxjs/toolkit';

/**
 * Custom serializable check middleware that ignores certain paths
 * where non-serializable values might be stored temporarily
 */
const serializableCheckMiddleware = createSerializableStateInvariantMiddleware({
  // Ignore these action types
  ignoredActions: [
    // Common pattern for fulfilled actions
    /\/(fulfilled|rejected|pending)$/,
  ],
  
  // Ignore these field paths in the state
  ignoredPaths: [
    // Common state paths that might contain non-serializable data temporarily
    'entities.api.queries',
    'api.queries',
    'auth.tokens',
  ],
  
  // Custom function to determine if a value is serializable
  isSerializable: (value) => {
    // Handle Headers, FormData, and other non-serializable browser APIs
    if (
      value instanceof Headers ||
      value instanceof Request ||
      value instanceof Response ||
      value instanceof FormData ||
      value instanceof ArrayBuffer ||
      value instanceof Blob ||
      (typeof value === 'object' && value !== null && value.constructor && value.constructor.name === 'XMLHttpRequest')
    ) {
      return false;
    }
    
    // The default check from Redux Toolkit
    return typeof value === 'undefined' ||
      value === null ||
      typeof value === 'boolean' ||
      typeof value === 'number' ||
      typeof value === 'string' ||
      Array.isArray(value) ||
      (typeof value === 'object' && value !== null && value.constructor === Object);
  },
});

export default serializableCheckMiddleware; 