export const selectUser = (state) => state.auth.user;
export const selectEmail = (state) => state.auth.email;
export const selectPassword = (state) => state.auth.password;
export const selectName = (state) => state.auth.name;
export const selectPhone = (state) => state.auth.phone;
export const selectAddress = (state) => state.auth.address;
export const selectGender = (state) => state.auth.gender;
export const selectTokens = (state) => state.auth.tokens;

export const selectAuthError = (state) => state.auth.error;
export const selectIsLoading = (state) => state.auth.isLoading;
export const selectTempToken = (state) => state.auth.tempToken;