import { useDispatch, useSelector } from 'react-redux';
import {
    selectSuppliersList,
    selectSuppliersTotal,
    selectSuppliersPage,
    selectSuppliersPages,
    selectCurrentSupplierId,
    selectSupplierDetails,
    selectCurrentSupplier,
    selectCurrentSupplierProducts,
    selectSuppliersLoading,
    selectSuppliersError,
    selectIsUserSupplier,
    selectCurrentUserSupplierId
} from '../selectors';

import {
    fetchSuppliersList,
    fetchSupplierById,
    fetchSupplierProducts,
    fetchSupplierWithProducts,
    fetchSupplierRating,
    setCurrentSupplierId,
    clearSupplierError,
    setSupplierRating,
    clearRatings,
    clearSupplierCache
} from '../slice';
import {useCallback} from "react";

export const useSuppliers = () => {
    const dispatch = useDispatch();

    const suppliersList = useSelector(selectSuppliersList) || [];
    const total = useSelector(selectSuppliersTotal) || 0;
    const page = useSelector(selectSuppliersPage) || 1;
    const pages = useSelector(selectSuppliersPages) || 1;
    const currentSupplierId = useSelector(selectCurrentSupplierId);
    const supplierDetails = useSelector(selectSupplierDetails);
    const currentSupplier = useSelector(selectCurrentSupplier);
    const isLoading = useSelector(selectSuppliersLoading) || false;
    const error = useSelector(selectSuppliersError);
    const isUserSupplier = useSelector(selectIsUserSupplier) || false;
    const currentUserSupplierId = useSelector(selectCurrentUserSupplierId);
    const currentSupplierProducts = useSelector(selectCurrentSupplierProducts) || [];

    const getSuppliers = useCallback((params) =>
        dispatch(fetchSuppliersList(params)), [dispatch]);

    const getSupplierById = useCallback((supplierId) =>
        dispatch(fetchSupplierById(supplierId)), [dispatch]);

    const getSupplierProducts = useCallback((supplierId) =>
        dispatch(fetchSupplierProducts(supplierId)), [dispatch]);

    const getSupplierWithProducts = useCallback((supplierId) => {
        dispatch(setCurrentSupplierId(supplierId));
        return dispatch(fetchSupplierWithProducts(supplierId));
    }, [dispatch]);

    const getSupplierRating = useCallback((supplierId) =>
        dispatch(fetchSupplierRating(supplierId)), [dispatch]);

    const selectSupplier = (supplierId) => dispatch(setCurrentSupplierId(supplierId));
    const clearError = () => dispatch(clearSupplierError());
    const clearCache = (supplierId) => dispatch(clearSupplierCache({ supplierId }));

    const updateRating = (supplierId, rating, totalFeedbacks) =>
        dispatch(setSupplierRating({ supplierId, rating, totalFeedbacks }));

    const clearAllRatings = () => dispatch(clearRatings());


    const getSupplierDetailsById = (supplierId) => {
        if (!supplierId) return null;

        const supplier = suppliersList.find(s =>
            s.id && s.id.toString() === supplierId.toString()
        );

        if (!supplier) {
            dispatch(fetchSupplierById(supplierId));
        }

        return supplier || null;
    };

    return {
        suppliersList,
        total,
        page,
        pages,
        currentSupplierId,
        supplierDetails,
        currentSupplier,
        isLoading,
        error,
        isUserSupplier,
        currentUserSupplierId,
        currentSupplierProducts,

        getSuppliers,
        getSupplierById,
        getSupplierProducts,
        getSupplierWithProducts,
        getSupplierRating,
        selectSupplier,
        clearError,
        clearCache,
        updateRating,
        clearAllRatings,

        getSupplierDetailsById
    };
};