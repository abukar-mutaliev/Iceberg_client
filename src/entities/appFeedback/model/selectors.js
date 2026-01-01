import { createSelector } from '@reduxjs/toolkit';

export const selectAppFeedbackState = (state) => state.appFeedback;

export const selectAppFeedback = createSelector(
    [selectAppFeedbackState],
    (appFeedbackState) => appFeedbackState.feedback
);

export const selectAppFeedbackLoading = createSelector(
    [selectAppFeedbackState],
    (appFeedbackState) => appFeedbackState.loading
);

export const selectAppFeedbackSubmitting = createSelector(
    [selectAppFeedbackState],
    (appFeedbackState) => appFeedbackState.submitting
);

export const selectAppFeedbackError = createSelector(
    [selectAppFeedbackState],
    (appFeedbackState) => appFeedbackState.error
);

export const selectHasAppFeedback = createSelector(
    [selectAppFeedback],
    (feedback) => !!feedback
);

export const selectAllAppFeedbacks = createSelector(
    [selectAppFeedbackState],
    (appFeedbackState) => appFeedbackState.allFeedbacks || []
);

export const selectAllAppFeedbacksLoading = createSelector(
    [selectAppFeedbackState],
    (appFeedbackState) => appFeedbackState.loadingAll
);

