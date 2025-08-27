export { ProductCard } from './ui/ProductCard';
export { ProductTile } from './ui/ProductTile';
export { MultipleImageUpload } from './ui/MultipleImageUpload';
export { ProductWarehouseInfo } from './ui/ProductWarehouseInfo';
export { useProductManagement } from '@entities/product/hooks/useProductManagement';
export { useProductCard } from '@entities/product/hooks/useProductCard';
export { useProductCardWithStock } from '@entities/product/hooks/useProductCardWithStock';
export { useProductBox } from '@entities/product/hooks/useProductBox';
export { useProductDetail } from '@entities/product/hooks/useProductDetail';

export { default as productsReducer } from './model/slice';
export * from './model/slice';
export * from './model/selectors';
export * from './api/productsApi';
