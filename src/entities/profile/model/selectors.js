export const selectProfile = (state) => state.profile.data;
export const selectProfileLoading = (state) => state.profile.isLoading;
export const selectProfileError = (state) => state.profile.error;
export const selectAvatarUploading = (state) => state.profile.isAvatarUploading;
export const selectAvatarUploadProgress = (state) => state.profile.avatarUploadProgress;
export const selectAvatarError = (state) => state.profile.avatarError;

export const selectIsProfileDeleting = (state) => {
    return state.profile.isLoading && state.profile.data === null;
};