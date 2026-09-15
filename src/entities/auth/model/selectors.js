import { createSelector } from '@reduxjs/toolkit';

export const selectAuthState = (state) => state.auth;

/** Сессия валидна только при наличии пользователя и access-токена в store. */
export const selectIsAuthenticated = (state) => Boolean(
    state?.auth?.user?.id && state?.auth?.tokens?.accessToken
);

export const selectUser = (state) => state?.auth?.user || null;
export const selectCurrentAuthUser = (state) => state?.auth?.user || null;
export const selectEmail = (state) => state?.auth?.email || '';
export const selectPassword = (state) => state?.auth?.password || '';
export const selectName = (state) => state?.auth?.name || '';
export const selectPhone = (state) => state?.auth?.phone || '';
export const selectAddress = (state) => state?.auth?.address || '';
export const selectGender = (state) => state?.auth?.gender || '';
export const selectDistrictId = (state) => state?.auth?.districtId || null;
export const selectCustomDistrict = (state) => state?.auth?.customDistrict || '';
export const selectTokens = (state) => state?.auth?.tokens || null;
export const selectAuthError = (state) => state?.auth?.error || null;
export const selectIsLoading = (state) => state?.auth?.isLoading || false;
export const selectTempToken = (state) => state?.auth?.tempToken || null;
export const selectRequiresTwoFactor = (state) => state?.auth?.requiresTwoFactor || false;
export const selectCurrentUserRole = (state) => state?.auth?.user?.role || null;

// Единый телефонный поток
export const selectChallengeToken = (state) => state?.auth?.challengeToken || null;
export const selectChallengeResendAfter = (state) => state?.auth?.challengeResendAfter || 0;
export const selectNeedsProfile = (state) => state?.auth?.needsProfile || false;

// Группируем селекторы авторизации для удобства импорта
export const authSelectors = {
    selectIsAuthenticated,
    selectCurrentAuthUser,
    selectEmail,
    selectPassword,
    selectName,
    selectPhone,
    selectAddress,
    selectGender,
    selectDistrictId,
    selectCustomDistrict,
    selectTokens,
    selectAuthError,
    selectIsLoading,
    selectTempToken,
    selectRequiresTwoFactor,
    selectCurrentUserRole,
    selectChallengeToken,
    selectChallengeResendAfter,
    selectNeedsProfile,
};