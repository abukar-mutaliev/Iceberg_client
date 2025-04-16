export const selectCategories = (state) => state.category?.categories || [];
export const selectCurrentCategory = (state) => state.category?.currentCategory || null;
export const selectCategoriesLoading = (state) => state.category?.isLoading || false;
export const selectCategoriesError = (state) => state.category?.error || null;

export const selectProductsByCategory = (state, categoryId) =>
    state.category?.productsByCategory?.[categoryId] || [];
export const selectProductsByCategoryLoading = (state) =>
    state.category?.productsLoading || false;
export const selectProductsByCategoryError = (state) =>
    state.category?.productsError || null;