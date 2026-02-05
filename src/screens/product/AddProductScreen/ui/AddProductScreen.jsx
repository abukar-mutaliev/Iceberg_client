import React, {useEffect, useState, useRef, useCallback} from "react";
import {useDispatch, useSelector} from "react-redux";
import {useNavigation, useRoute} from "@react-navigation/native";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Animated} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import {Color, FontFamily} from "@app/styles/GlobalStyles";
import {MultipleImageUpload} from "@entities/product/ui/MultipleImageUpload";
import {CategoryPicker} from "@shared/ui/Pickers/CategoryPicker/ui/CategoryPicker";
import {SupplierPicker} from "@shared/ui/Pickers/SupplierPicker";
import { WarehouseSelectionInline } from "@screens/warehouse/ui/WarehouseSelectionScreen";
import {selectIsAuthenticated, selectUser} from "@entities/auth/model/selectors";
import {createProductChunked, clearProductsCache} from '@entities/product';
import {fetchProfile} from "@entities/profile";
import ProductsService from "@shared/services/ProductsService";

export const AddProductScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    const isAuthenticated = useSelector(selectIsAuthenticated);

    const { onSuccess } = route.params || {};

    const isSupplier = user?.role === 'SUPPLIER';
    const isAdminOrEmployee = user?.role === 'ADMIN' || user?.role === 'EMPLOYEE';
    const [textAreaHeight, setTextAreaHeight] = useState(30);
    const [nameInputHeight, setNameInputHeight] = useState(30);

    // Ref для отслеживания инициализации формы
    const isInitialized = useRef(false);

    // Состояния для отслеживания загрузки
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [currentStage, setCurrentStage] = useState('');
    const [uploadedImages, setUploadedImages] = useState(0);
    const [imageUploadState, setImageUploadState] = useState({});
    const [pendingSubmit, setPendingSubmit] = useState(false);
    const [isPreuploading, setIsPreuploading] = useState(false);
    const uploadQueueRef = useRef([]);
    const activeUploadsRef = useRef(0);
    const maxConcurrentPreuploads = 2;

    // Состояния для формы
    const [formData, setFormData] = useState({
        name: "",
        categories: [],
        weight: "",
        price: "",
        itemsPerBox: "1",
        boxPrice: "",
        discount: "",
        stockQuantity: "",
        description: "",
        images: [],
        supplierId: "",
        warehouseQuantities: [],
    });

    // Состояние для ошибок валидации
    const [errors, setErrors] = useState({
        name: "",
        categories: "",
        weight: "",
        price: "",
        itemsPerBox: "",
        boxPrice: "",
        discount: "",
        stockQuantity: "",
        description: "",
        images: "",
        supplierId: "",
        warehouseQuantities: "",
    });

    // Устанавливаем supplier ID если пользователь поставщик
    useEffect(() => {
        if (isSupplier && user?.supplier?.id) {
            setFormData(prev => ({
                ...prev,
                supplierId: user.supplier.id.toString()
            }));
        }
    }, [isSupplier, user]);

    // Инициализация формы только один раз при первом монтировании
    useEffect(() => {
        // Сброс формы только если еще не инициализирована
        if (!isInitialized.current) {
            const resetData = {
                name: "",
                categories: [],
                weight: "",
                price: "",
                itemsPerBox: "1",
                boxPrice: "",
                discount: "",
                stockQuantity: "",
                description: "",
                images: [],
                supplierId: isSupplier && user?.supplier?.id ? user.supplier.id.toString() : "",
                warehouseQuantities: [],
            };

            setFormData(resetData);
            setErrors({
                name: "",
                categories: "",
                weight: "",
                price: "",
                itemsPerBox: "",
                boxPrice: "",
                discount: "",
                stockQuantity: "",
                description: "",
                images: "",
                supplierId: "",
                warehouseQuantities: "",
            });

            setUploadProgress(0);
            setIsUploading(false);
            setCurrentStage('');
            setUploadedImages(0);
            setImageUploadState({});
            setPendingSubmit(false);
            setIsPreuploading(false);
            uploadQueueRef.current = [];
            activeUploadsRef.current = 0;
            
            isInitialized.current = true;
        }
    }, [isSupplier, user]);

    // Сброс флага инициализации при размонтировании
    useEffect(() => {
        return () => {
            isInitialized.current = false;
        };
    }, []);

    // Автоматически рассчитываем общее количество коробок на основе выбранных складов
    useEffect(() => {
        if (formData.warehouseQuantities && formData.warehouseQuantities.length > 0) {
            const totalBoxes = formData.warehouseQuantities.reduce((sum, item) => sum + item.quantity, 0);
            if (totalBoxes > 0 && (!formData.stockQuantity || formData.stockQuantity !== totalBoxes.toString())) {
                setFormData(prev => ({
                    ...prev,
                    stockQuantity: totalBoxes.toString()
                }));
            }
        }
    }, [formData.warehouseQuantities]);

    // Обработка изменения полей формы
    const handleChange = (field, value) => {
        setFormData((prev) => {
            const newData = {
                ...prev,
                [field]: value,
            };
            
            if (field === 'price' || field === 'itemsPerBox') {
                const priceStr = field === 'price' ? value : prev.price;
                const itemsStr = field === 'itemsPerBox' ? value : prev.itemsPerBox;

                const price = parseFloat(priceStr.toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
                const itemsPerBox = parseInt(itemsStr.toString().replace(/[^0-9]/g, ''));

                if (!isNaN(price) && !isNaN(itemsPerBox) && itemsPerBox > 0 && price > 0) {
                    const calculatedBoxPrice = price * itemsPerBox;
                    newData.boxPrice = calculatedBoxPrice.toFixed(2);
                }
            }
            
            return newData;
        });

        if (errors[field]) {
            setErrors((prev) => ({
                ...prev,
                [field]: "",
            }));
        }
    };

    const handleCategoriesChange = (categoryIds) => {
        setFormData((prev) => ({
            ...prev,
            categories: Array.isArray(categoryIds) ? categoryIds : [categoryIds],
        }));
        setErrors((prev) => ({...prev, categories: ""}));
    };

    const handleSupplierChange = (supplierId) => {
        setFormData((prev) => ({
            ...prev,
            supplierId: supplierId,
        }));
        setErrors((prev) => ({...prev, supplierId: ""}));
    };

    const handlePhotosChange = (newPhotos) => {
        setFormData((prev) => ({
            ...prev,
            images: newPhotos,
        }));

        if (newPhotos && newPhotos.length > 0) {
            setErrors((prev) => ({...prev, images: ""}));
        }
    };

    const handleWarehouseQuantitiesChange = (warehouseQuantities) => {
        setFormData((prev) => ({
            ...prev,
            warehouseQuantities: warehouseQuantities,
        }));
        setErrors((prev) => ({...prev, warehouseQuantities: ""}));
    };

    const getUploadStats = useCallback(() => {
        const entries = Object.values(imageUploadState);
        const total = entries.length;
        const uploaded = entries.filter(item => item.status === 'done').length;
        const uploading = entries.filter(item => item.status === 'uploading' || item.status === 'pending').length;
        const failed = entries.filter(item => item.status === 'error').length;
        return { total, uploaded, uploading, failed };
    }, [imageUploadState]);

    const startNextUpload = useCallback(() => {
        if (activeUploadsRef.current >= maxConcurrentPreuploads) return;
        const nextUri = uploadQueueRef.current.shift();
        if (!nextUri) {
            if (activeUploadsRef.current === 0) {
                setIsPreuploading(false);
            }
            return;
        }

        activeUploadsRef.current += 1;
        setIsPreuploading(true);
        setImageUploadState(prev => ({
            ...prev,
            [nextUri]: {
                ...(prev[nextUri] || {}),
                status: 'uploading',
                error: null
            }
        }));

        ProductsService.preuploadProductImage({ uri: nextUri })
            .then((result) => {
                if (result?.success && result?.data?.data?.imagePath) {
                    setImageUploadState(prev => ({
                        ...prev,
                        [nextUri]: {
                            status: 'done',
                            url: result.data.data.imagePath
                        }
                    }));
                } else {
                    const message = result?.error?.message || 'Ошибка при загрузке изображения';
                    setImageUploadState(prev => ({
                        ...prev,
                        [nextUri]: {
                            status: 'error',
                            error: message
                        }
                    }));
                }
            })
            .catch((error) => {
                setImageUploadState(prev => ({
                    ...prev,
                    [nextUri]: {
                        status: 'error',
                        error: error?.message || 'Ошибка при загрузке изображения'
                    }
                }));
            })
            .finally(() => {
                activeUploadsRef.current -= 1;
                startNextUpload();
                if (activeUploadsRef.current === 0 && uploadQueueRef.current.length === 0) {
                    setIsPreuploading(false);
                }
            });
    }, [maxConcurrentPreuploads]);

    const enqueuePreupload = useCallback((uri) => {
        if (!uri || typeof uri !== 'string') return;
        if (uri.startsWith('http://') || uri.startsWith('https://')) return;

        setImageUploadState(prev => {
            if (prev[uri]?.status === 'uploading' || prev[uri]?.status === 'done') {
                return prev;
            }
            return {
                ...prev,
                [uri]: { status: 'pending' }
            };
        });

        if (!uploadQueueRef.current.includes(uri)) {
            uploadQueueRef.current.push(uri);
        }
        startNextUpload();
    }, [startNextUpload]);

    const retryFailedUploads = useCallback(() => {
        const failedUris = Object.entries(imageUploadState)
            .filter(([, value]) => value?.status === 'error')
            .map(([uri]) => uri);
        failedUris.forEach(uri => enqueuePreupload(uri));
    }, [imageUploadState, enqueuePreupload]);

    useEffect(() => {
        const localImages = (formData.images || []).filter(img =>
            typeof img === 'string' && !img.startsWith('http://') && !img.startsWith('https://')
        );

        const newImages = localImages.filter(uri => !imageUploadState[uri]);
        newImages.forEach(uri => enqueuePreupload(uri));

        const removedUris = Object.keys(imageUploadState).filter(uri => !localImages.includes(uri));
        if (removedUris.length > 0) {
            setImageUploadState(prev => {
                const next = { ...prev };
                removedUris.forEach(uri => {
                    delete next[uri];
                });
                return next;
            });
        }
    }, [formData.images, imageUploadState, enqueuePreupload]);

    useEffect(() => {
        if (!pendingSubmit || isSubmitting) return;
        const { uploading, failed } = getUploadStats();
        if (uploading === 0 && failed === 0) {
            setPendingSubmit(false);
            handleSubmit();
        }
    }, [pendingSubmit, isSubmitting, getUploadStats]);

    // Валидация формы (та же логика что и в модальном окне)
    const validateForm = () => {
        let isValid = true;
        const newErrors = {...errors};

        if (!formData.name || !formData.name.trim()) {
            newErrors.name = "Введите название товара";
            isValid = false;
        }

        if (!formData.categories || formData.categories.length === 0) {
            newErrors.categories = "Выберите хотя бы одну категорию товара";
            isValid = false;
        }

        if (isAdminOrEmployee && (!formData.supplierId || formData.supplierId.trim() === '')) {
            newErrors.supplierId = "Выберите поставщика";
            isValid = false;
        }

        if (!formData.price || !formData.price.toString().trim()) {
            newErrors.price = "Введите цену за штуку";
            isValid = false;
        } else {
            const priceStr = formData.price.toString().replace(/[^0-9.,]/g, '').replace(',', '.');
            const price = parseFloat(priceStr);

            if (isNaN(price) || price <= 0) {
                newErrors.price = "Цена за штуку должна быть положительным числом";
                isValid = false;
            }
        }

        if (!formData.itemsPerBox) {
            newErrors.itemsPerBox = "Введите количество штук в коробке";
            isValid = false;
        } else if (typeof formData.itemsPerBox === "string") {
            if (!formData.itemsPerBox.trim()) {
                newErrors.itemsPerBox = "Введите количество штук в коробке";
                isValid = false;
            } else if (isNaN(parseInt(formData.itemsPerBox)) || parseInt(formData.itemsPerBox) < 1) {
                newErrors.itemsPerBox = "Количество штук в коробке должно быть числом больше 0";
                isValid = false;
            }
        }

        if (formData.boxPrice && formData.boxPrice.toString().trim()) {
            const boxPriceStr = formData.boxPrice.toString().replace(/[^0-9.,]/g, '').replace(',', '.');
            const boxPrice = parseFloat(boxPriceStr);

            if (isNaN(boxPrice) || boxPrice <= 0) {
                newErrors.boxPrice = "Цена за коробку должна быть положительным числом";
                isValid = false;
            } else {
                const priceStr = formData.price.toString().replace(/[^0-9.,]/g, '').replace(',', '.');
                const itemsStr = formData.itemsPerBox.toString().replace(/[^0-9]/g, '');

                const price = parseFloat(priceStr);
                const itemsPerBox = parseInt(itemsStr);

                if (!isNaN(price) && !isNaN(itemsPerBox) && itemsPerBox > 0 && price > 0) {
                    const calculatedBoxPrice = price * itemsPerBox;
                    const minBoxPrice = calculatedBoxPrice * 0.7;

                    if (boxPrice < minBoxPrice) {
                        newErrors.boxPrice = `Цена за коробку не может быть меньше 70% от расчетной (${calculatedBoxPrice.toFixed(2)} ₽). Минимум: ${minBoxPrice.toFixed(2)} ₽`;
                        isValid = false;
                    }
                }
            }
        }

        if (formData.weight) {
            if (typeof formData.weight === "string") {
                if (formData.weight.trim() && isNaN(parseFloat(formData.weight.replace(/[^0-9,.]/g, "")))) {
                    newErrors.weight = "Вес должен быть числом";
                    isValid = false;
                }
            }
        }

        if (formData.discount) {
            if (typeof formData.discount === "string") {
                if (formData.discount.trim() && isNaN(parseFloat(formData.discount.replace(/[^0-9,.]/g, "")))) {
                    newErrors.discount = "Скидка должна быть числом";
                    isValid = false;
                }
            }
        }

        if (!formData.stockQuantity || !formData.stockQuantity.trim()) {
            newErrors.stockQuantity = "Введите количество коробок на складе";
            isValid = false;
        } else if (isNaN(parseInt(formData.stockQuantity)) || parseInt(formData.stockQuantity) < 0) {
            newErrors.stockQuantity = "Количество коробок должно быть числом больше или равно 0";
            isValid = false;
        }

        if (!formData.images || formData.images.length === 0) {
            newErrors.images = "Добавьте хотя бы одну фотографию товара";
            isValid = false;
        }

        if ((isSupplier || isAdminOrEmployee) && (!formData.warehouseQuantities || formData.warehouseQuantities.length === 0)) {
            newErrors.warehouseQuantities = "Выберите склады и укажите количество коробок для каждого склада";
            isValid = false;
        }

        if (formData.warehouseQuantities && formData.warehouseQuantities.length > 0) {
            const totalBoxes = formData.warehouseQuantities.reduce((sum, item) => sum + item.quantity, 0);

            if (totalBoxes === 0) {
                newErrors.warehouseQuantities = "Укажите количество коробок хотя бы для одного склада";
                isValid = false;
            }

            if (formData.stockQuantity && parseInt(formData.stockQuantity) !== totalBoxes) {
                newErrors.stockQuantity = `Общее количество (${formData.stockQuantity}) не совпадает с суммой по складам (${totalBoxes})`;
                isValid = false;
            }
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async () => {
        if (!validateForm() || isSubmitting) {
            return;
        }

        const localImages = (formData.images || []).filter(img =>
            typeof img === 'string' && !img.startsWith('http://') && !img.startsWith('https://')
        );
        const missingUploads = localImages.filter(uri => !imageUploadState[uri]);
        missingUploads.forEach(uri => enqueuePreupload(uri));

        const { uploading, failed } = getUploadStats();
        if (missingUploads.length > 0 || uploading > 0 || failed > 0) {
            if (failed > 0) {
                retryFailedUploads();
            }
            setPendingSubmit(true);
            Alert.alert(
                "Загрузка изображений",
                "Изображения еще загружаются. Товар будет отправлен автоматически после завершения загрузки.",
                [{ text: "OK", style: "cancel" }]
            );
            return;
        }

        if (!user || !isAuthenticated) {
            Alert.alert(
                "Ошибка авторизации",
                "Для добавления товара необходимо авторизоваться. Пожалуйста, войдите в систему.",
                [{text: "OK", style: "cancel"}]
            );
            return;
        }

        setIsSubmitting(true);
        setIsUploading(true);
        setUploadProgress(0);
        setCurrentStage('Проверка соединения...');
        setUploadedImages(0);

        try {
            const productData = {
                name: formData.name,
                categories: formData.categories,
                price: formData.price,
                itemsPerBox: formData.itemsPerBox || 1,
                boxPrice: formData.boxPrice || null,
                stockQuantity: formData.stockQuantity,
                weight: formData.weight || null,
                discount: formData.discount || null,
                description: formData.description || '',
                supplierId: isSupplier ? undefined : formData.supplierId,
                warehouses: formData.warehouseQuantities.length > 0 ? JSON.stringify(formData.warehouseQuantities) : "all",
            };

            if (!formData.images || formData.images.length === 0) {
                Alert.alert(
                    "Ошибка",
                    "Необходимо добавить хотя бы одно изображение товара.",
                    [{text: "OK", style: "cancel"}]
                );
                setIsSubmitting(false);
                setIsUploading(false);
                return;
            }

            const imagesForSubmit = (formData.images || []).map(img => {
                if (typeof img === 'string' && imageUploadState[img]?.status === 'done' && imageUploadState[img]?.url) {
                    return imageUploadState[img].url;
                }
                return img;
            });

            const result = await dispatch(createProductChunked({
                formData: productData,
                images: imagesForSubmit,
                preuploadedImagesMap: imageUploadState,
                onProgress: (progress, stage, uploadedCount) => {
                    setUploadProgress(progress);
                    setCurrentStage(stage);
                    if (uploadedCount !== undefined) {
                        setUploadedImages(uploadedCount);
                    }
                }
            })).unwrap();

            dispatch(clearProductsCache());

            if (isSupplier) {
                dispatch(fetchProfile());
            }

            navigation.goBack();
            
            if (onSuccess && typeof onSuccess === "function") {
                onSuccess(result);
            }
        } catch (error) {
            console.error('Ошибка при отправке формы:', error);

            let errorMessage = error;
            if (typeof error === 'object' && error.message) {
                errorMessage = error.message;
            }

            if (errorMessage.includes('сеть') || errorMessage.includes('соединен')) {
                Alert.alert(
                    "Ошибка соединения",
                    "Не удалось подключиться к серверу. Проверьте ваше интернет-соединение и попробуйте снова.",
                    [
                        {text: "OK", style: "cancel"},
                        {text: "Попробовать снова", onPress: handleSubmit}
                    ]
                );
            } else {
                Alert.alert(
                    "Ошибка",
                    errorMessage || "Произошла ошибка при создании товара",
                    [
                        {text: "OK", style: "cancel"},
                        {text: "Попробовать снова", onPress: handleSubmit}
                    ]
                );
            }
        } finally {
            setIsSubmitting(false);
            setIsUploading(false);
        }
    };

    const renderUploadProgress = () => {
        if (!isUploading) return null;

        return (
            <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                    <Text style={styles.progressTitle}>Загрузка товара</Text>
                    <Text style={styles.progressPercentage}>{Math.round(uploadProgress)}%</Text>
                </View>
                <View style={styles.progressBarContainer}>
                    <Animated.View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
                </View>
                <Text style={styles.progressText}>
                    {currentStage} {uploadedImages > 0 ? `(${uploadedImages}/${formData.images.length} фото)` : ''}
                </Text>
            </View>
        );
    };

    const renderSection = (title, children, zIndex = 1) => (
        <View style={[styles.section, { zIndex }]}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.sectionContent}>
                {children}
            </View>
        </View>
    );

    const renderInputCard = (label, value, onChangeText, placeholder, options = {}) => {
        const {
            keyboardType = 'default',
            multiline = false,
            error = null,
            required = false,
            editable = true
        } = options;

        return (
            <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>
                    {label} {required && <Text style={styles.requiredStar}>*</Text>}
                </Text>
                <TextInput
                    style={[
                        styles.cardInput,
                        multiline && styles.cardInputMultiline,
                        error && styles.cardInputError,
                        !editable && styles.cardInputDisabled
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#999"
                    keyboardType={keyboardType}
                    multiline={multiline}
                    editable={editable}
                />
                {error ? <Text style={styles.cardErrorText}>{error}</Text> : null}
            </View>
        );
    };

    const uploadStats = getUploadStats();

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => navigation.goBack()}
                    disabled={isSubmitting}
                >
                    <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Новый товар</Text>
                    <Text style={styles.headerSubtitle}>Заполните информацию о товаре</Text>
                </View>
                <View style={styles.placeholder} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.formContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                >
                    {/* Фотографии */}
                    {renderSection("📸 Фотографии товара", (
                        <View style={styles.photoSection}>
                            <MultipleImageUpload
                                photos={formData.images}
                                setPhotos={handlePhotosChange}
                                error={errors.images}
                                maxImages={10}
                            />
                            {errors.images && (
                                <Text style={styles.sectionError}>{errors.images}</Text>
                            )}
                            {uploadStats.total > 0 && (
                                <Text style={styles.uploadHint}>
                                    Загружено {uploadStats.uploaded}/{uploadStats.total} фото
                                    {uploadStats.uploading > 0 ? " (идет загрузка...)" : ""}
                                    {uploadStats.failed > 0 ? " (есть ошибки)" : ""}
                                </Text>
                            )}
                        </View>
                    ), 100)}

                    {/* Основная информация */}
                    {renderSection("ℹ️ Основная информация", (
                        <>
                            {renderInputCard(
                                "Название товара",
                                formData.name,
                                (text) => handleChange("name", text),
                                "Введите название товара",
                                { multiline: true, error: errors.name, required: true }
                            )}

                            <View style={styles.pickerCardCategory}>
                                <CategoryPicker
                                    selectedCategories={formData.categories}
                                    onSelectCategories={handleCategoriesChange}
                                    error={errors.categories}
                                    allowMultiple={true}
                                />
                            </View>

                            {isAdminOrEmployee && (
                                <View style={styles.pickerCard}>
                                    <SupplierPicker
                                        selectedSupplier={formData.supplierId}
                                        onSelectSupplier={handleSupplierChange}
                                        error={errors.supplierId}
                                    />
                                </View>
                            )}

                            {renderInputCard(
                                "Описание товара",
                                formData.description,
                                (text) => handleChange("description", text),
                                "Добавьте описание (опционально)",
                                { multiline: true, error: errors.description }
                            )}
                        </>
                    ), 99)}

                    {/* Характеристики */}
                    {renderSection("📏 Характеристики", (
                        <>
                            {renderInputCard(
                                "Вес",
                                formData.weight,
                                (text) => handleChange("weight", text),
                                "Вес в граммах",
                                { keyboardType: "numeric", error: errors.weight, required: true }
                            )}

                            {renderInputCard(
                                "Количество штук в коробке",
                                formData.itemsPerBox,
                                (text) => handleChange("itemsPerBox", text),
                                "Штук в одной коробке",
                                { keyboardType: "numeric", error: errors.itemsPerBox, required: true }
                            )}
                        </>
                    ), 98)}

                    {/* Ценообразование */}
                    {renderSection("💰 Ценообразование", (
                        <>
                            <View style={styles.priceRow}>
                                <View style={styles.priceColumn}>
                                    {renderInputCard(
                                        "Цена за штуку",
                                        formData.price,
                                        (text) => handleChange("price", text),
                                        "₽",
                                        { keyboardType: "numeric", error: errors.price, required: true }
                                    )}
                                </View>
                                <View style={styles.priceColumn}>
                                    {renderInputCard(
                                        "Цена за коробку",
                                        formData.boxPrice,
                                        (text) => handleChange("boxPrice", text),
                                        "Авто",
                                        { keyboardType: "numeric", error: errors.boxPrice, editable: !formData.price || !formData.itemsPerBox }
                                    )}
                                </View>
                            </View>
                            <View style={styles.additionalPriceInfo}>
                                <Text style={styles.additionalPriceNote}>
                                    💡 Цены для складов и фургонов указываются при выборе складов
                                </Text>
                            </View>
                        </>
                    ), 97)}

                    {/* Складские запасы */}
                    {renderSection("📦 Складские запасы", (
                        <>
                            <View style={styles.pickerCard}>
                                <WarehouseSelectionInline
                                    selectedWarehouseQuantities={formData.warehouseQuantities}
                                    onSelectWarehouseQuantities={handleWarehouseQuantitiesChange}
                                    basePrice={formData.boxPrice ? parseFloat(formData.boxPrice) : null}
                                    isAdmin={user?.role === 'ADMIN'}
                                />
                                {errors.warehouseQuantities ? (
                                    <Text style={styles.sectionError}>{errors.warehouseQuantities}</Text>
                                ) : null}
                            </View>

                            {formData.warehouseQuantities.length > 0 && (
                                <View style={styles.stockSummaryCard}>
                                    <View style={styles.stockSummaryRow}>
                                        <Text style={styles.stockSummaryLabel}>Общее количество коробок:</Text>
                                        <Text style={styles.stockSummaryValue}>
                                            {formData.warehouseQuantities.reduce((sum, item) => sum + item.quantity, 0)}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </>
                    ), 96)}

                    {renderUploadProgress()}

                    <TouchableOpacity
                        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        activeOpacity={0.8}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <View style={styles.submitButtonContent}>
                                <ActivityIndicator size="small" color="#FFFFFF" style={styles.submitButtonLoader}/>
                                <Text style={styles.submitButtonText}>Создание товара...</Text>
                            </View>
                        ) : (
                            <Text style={styles.submitButtonText}>✓ Добавить товар</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.bottomSpacer} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E8ECF1',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F7FA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 20,
        color: '#666',
        fontFamily: FontFamily.sFProText,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
        fontFamily: FontFamily.sFProDisplay,
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#8E8E93',
        fontFamily: FontFamily.sFProText,
        marginTop: 2,
    },
    placeholder: {
        width: 40,
    },
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    formContainer: {
        padding: 16,
    },
    
    // Section Styles
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
        fontFamily: FontFamily.sFProDisplay,
        marginBottom: 12,
        paddingLeft: 4,
    },
    sectionContent: {
        gap: 12,
    },
    sectionError: {
        color: '#FF3B30',
        fontSize: 13,
        marginTop: 8,
        paddingLeft: 4,
        fontFamily: FontFamily.sFProText,
    },
    uploadHint: {
        color: '#6B7280',
        fontSize: 12,
        marginTop: 6,
        paddingLeft: 4,
        fontFamily: FontFamily.sFProText,
    },
    
    // Photo Section
    photoSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 8,
        maxHeight: 200,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    
    // Input Card Styles
    inputCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 1,
            },
        }),
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
        fontFamily: FontFamily.sFProText,
    },
    requiredStar: {
        color: '#FF3B30',
    },
    cardInput: {
        fontSize: 16,
        color: '#1A1A1A',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#F5F7FA',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E8ECF1',
        fontFamily: FontFamily.sFProText,
        minHeight: 44,
    },
    cardInputMultiline: {
        minHeight: 80,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    cardInputError: {
        borderColor: '#FF3B30',
        backgroundColor: '#FFF5F5',
    },
    cardInputDisabled: {
        backgroundColor: '#F5F7FA',
        color: '#999',
    },
    cardErrorText: {
        color: '#FF3B30',
        fontSize: 12,
        marginTop: 6,
        paddingLeft: 4,
        fontFamily: FontFamily.sFProText,
    },
    
    // Picker Card
    pickerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 1,
            },
        }),
    },
    
    // Category Picker Card with high zIndex
    pickerCardCategory: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        zIndex: 1000,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    
    // Price Row
    priceRow: {
        flexDirection: 'row',
        gap: 12,
    },
    priceColumn: {
        flex: 1,
    },
    additionalPriceInfo: {
        backgroundColor: '#FFF9E6',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#FFE08A',
        marginTop: 8,
    },
    additionalPriceNote: {
        fontSize: 13,
        color: '#856404',
        fontFamily: FontFamily.sFProText,
        lineHeight: 18,
    },
    
    // Stock Summary
    stockSummaryCard: {
        backgroundColor: '#F0F9FF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#BAE6FD',
    },
    stockSummaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    stockSummaryLabel: {
        fontSize: 14,
        color: '#0369A1',
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
    },
    stockSummaryValue: {
        fontSize: 18,
        color: '#0369A1',
        fontWeight: '700',
        fontFamily: FontFamily.sFProDisplay,
    },
    
    // Progress Container
    progressContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginTop: 24,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#3B43A2',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    progressTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1A1A1A',
        fontFamily: FontFamily.sFProDisplay,
    },
    progressPercentage: {
        fontSize: 18,
        fontWeight: '700',
        color: '#3B43A2',
        fontFamily: FontFamily.sFProDisplay,
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: '#E8ECF1',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 10,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#3B43A2',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 13,
        color: '#666',
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
    },
    
    // Submit Button
    submitButton: {
        backgroundColor: '#3B43A2',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        ...Platform.select({
            ios: {
                shadowColor: '#3B43A2',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    submitButtonDisabled: {
        backgroundColor: '#C7C7CC',
        ...Platform.select({
            ios: {
                shadowOpacity: 0.1,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    submitButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    submitButtonLoader: {
        marginRight: 10,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
        fontFamily: FontFamily.sFProDisplay,
    },
    bottomSpacer: {
        height: 40,
    },
});

export default AddProductScreen;

