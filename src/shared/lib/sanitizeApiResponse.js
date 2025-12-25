/**
 * Sanitizes API responses to ensure they're Redux-compatible (serializable)
 * Removes non-serializable parts like headers, request objects, etc.
 * 
 * @param {Object} response - The axios response object
 * @returns {Object} - A sanitized response with only serializable data
 */
export const sanitizeApiResponse = (response) => {
  if (!response) return null;
  
  // If response is already just data (not an axios response object)
  if (!response.data && !response.headers && !response.config) {
    return response;
  }
  
  // Extract only the data from the response
  const data = response.data?.data || response.data;
  
  // Return a clean object with just the essential data
  return {
    data,
    status: response.status,
    statusText: response.statusText,
  };
};

/**
 * Helper to extract just the data portion from an API response
 * 
 * @param {Object} response - The axios response object
 * @returns {any} - Just the data portion of the response
 */
export const extractDataFromResponse = (response) => {
  if (!response) return null;
  
  // Handle already extracted data
  if (!response.data && !response.headers && !response.config) {
    return response;
  }
  
  // Return just the data portion
  return response.data?.data || response.data;
}; 