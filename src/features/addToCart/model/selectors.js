export const selectCartItems = state => state.cart?.items || [];
export const selectCartTotalQuantity = state => state.cart?.totalQuantity || 0;
export const selectCartTotalAmount = state => state.cart?.totalAmount || 0;
