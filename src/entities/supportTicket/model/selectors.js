import { createSelector } from '@reduxjs/toolkit';

export const selectSupportTicketState = (state) => state.supportTicket;

export const selectSupportTickets = createSelector(
    [selectSupportTicketState],
    (supportTicketState) => supportTicketState.tickets
);

export const selectCurrentSupportTicket = createSelector(
    [selectSupportTicketState],
    (supportTicketState) => supportTicketState.currentTicket
);

export const selectSupportTicketLoading = createSelector(
    [selectSupportTicketState],
    (supportTicketState) => supportTicketState.loading
);

export const selectSupportTicketSubmitting = createSelector(
    [selectSupportTicketState],
    (supportTicketState) => supportTicketState.submitting
);

export const selectSupportTicketError = createSelector(
    [selectSupportTicketState],
    (supportTicketState) => supportTicketState.error
);

export const selectSupportTicketPagination = createSelector(
    [selectSupportTicketState],
    (supportTicketState) => supportTicketState.pagination
);


