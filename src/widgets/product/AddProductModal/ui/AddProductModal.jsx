import React, {useEffect, useState} from "react";
import {useDispatch, useSelector} from "react-redux";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Dimensions,
} from "react-native";
import {Color, FontFamily} from "@app/styles/GlobalStyles";
import {MultipleImageUpload} from "@entities/product/ui/MultipleImageUpload";
import {CategoryPicker} from "@shared/ui/Pickers/CategoryPicker/ui/CategoryPicker";
import {SupplierPicker} from "@shared/ui/Pickers/SupplierPicker";
import {WarehousePicker} from "@shared/ui/Pickers/WarehousePicker";
import {selectIsAuthenticated, selectUser} from "@entities/auth/model/selectors";
import {createProductChunked, clearProductsCache} from '@entities/product';
import {fetchProfile} from "@entities/profile";
import NetInfo from "@react-native-community/netinfo";
import {getBaseUrl} from "@shared/api/api";
import {ReusableModal} from "@shared/ui/Modal/ui/ReusableModal";

const {height: SCREEN_HEIGHT} = Dimensions.get("window");

export const AddProductModal = ({visible, onClose, onSuccess}) => {
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    // const {user, isAuthenticated} = useAuth();
    const isAuthenticated = useSelector(selectIsAuthenticated);

    const isSupplier = user?.role === 'SUPPLIER';
    const isAdminOrEmployee = user?.role === 'ADMIN' || user?.role === 'EMPLOYEE';
    const [textAreaHeight, setTextAreaHeight] = useState(30);
    const [nameInputHeight, setNameInputHeight] = useState(30);

    // Состояния для отслеживания загрузки
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [currentStage, setCurrentStage] = useState('');
    const [uploadedImages, setUploadedImages] = useState(0);

    // Состояния для формы
    const [formData, setFormData] = useState({
        name: "",
        categories: [], // изменено с category на categories для множественного выбора
        weight: "",
        price: "", // цена за штуку
        itemsPerBox: "1", // количество штук в коробке
        boxPrice: "", // цена за коробку (может рассчитываться автоматически)
        discount: "",
        stockQuantity: "", // количество коробок на складе
        description: "",
        images: [],
        supplierId: "",
        warehouses: [], // Добавляем поле для складов
    });

    // Состояние для ошибок валидации
    const [errors, setErrors] = useState({
        name: "",
        categories: "", // изменено с category на categories
        weight: "",
        price: "",
        itemsPerBox: "",
        boxPrice: "",
        discount: "",
        stockQuantity: "",
        description: "",
        images: "",
        supplierId: "",
        warehouses: "", // Добавляем поле для ошибок складов
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

    // Сброс формы при открытии модального окна
    useEffect(() => {
        if (visible) {
            const resetData = {
                name: "",
                categories: [], // изменено с category на categories
                weight: "",
                price: "",
                itemsPerBox: "1",
                boxPrice: "",
                discount: "",
                stockQuantity: "",
                description: "",
                images: [],
                supplierId: isSupplier && user?.supplier?.id ? user.supplier.id.toString() : "",
                warehouses: [], // Сбрасываем выбранные склады
            };

            setFormData(resetData);
            setErrors({
                name: "",
                categories: "", // изменено с category на categories
                weight: "",
                price: "",
                itemsPerBox: "",
                boxPrice: "",
                discount: "",
                stockQuantity: "",
                description: "",
                images: "",
                supplierId: "",
                warehouses: "", // Сбрасываем ошибки складов
            });

            // Сбрасываем состояние загрузки
            setUploadProgress(0);
            setIsUploading(false);
            setCurrentStage('');
            setUploadedImages(0);
        }
    }, [visible, isSupplier, user]);

    // Обработка изменения полей формы
    const handleChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));

        if (errors[field]) {
            setErrors((prev) => ({
                ...prev,
                [field]: "",
            }));
        }
    };

    // Обработка изменения категорий
    const handleCategoriesChange = (categoryIds) => {
        setFormData((prev) => ({
            ...prev,
            categories: Array.isArray(categoryIds) ? categoryIds : [categoryIds],
        }));
        setErrors((prev) => ({...prev, categories: ""}));
    };

    // Обработка изменения поставщика
    const handleSupplierChange = (supplierId) => {
        setFormData((prev) => ({
            ...prev,
            supplierId: supplierId,
        }));
        setErrors((prev) => ({...prev, supplierId: ""}));
    };

    // Обработка изменения фото
    const handlePhotosChange = (newPhotos) => {
        setFormData((prev) => ({
            ...prev,
            images: newPhotos,
        }));

        if (newPhotos && newPhotos.length > 0) {
            setErrors((prev) => ({...prev, images: ""}));
        }
    };

    // Обработка изменения складов
    const handleWarehousesChange = (warehouseIds) => {
        setFormData((prev) => ({
            ...prev,
            warehouses: warehouseIds,
        }));
        setErrors((prev) => ({...prev, warehouses: ""}));
    };

    // Валидация формы
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

        // Проверка ID поставщика для админов и сотрудников
        if (isAdminOrEmployee && (!formData.supplierId || formData.supplierId.trim() === '')) {
            newErrors.supplierId = "Выберите поставщика";
            isValid = false;
        }

        if (!formData.price) {
            newErrors.price = "Введите цену за штуку";
            isValid = false;
        } else if (typeof formData.price === "string") {
            if (!formData.price.trim()) {
                newErrors.price = "Введите цену за штуку";
                isValid = false;
            } else if (isNaN(parseFloat(formData.price.replace(/[^0-9,.]/g, "")))) {
                newErrors.price = "Цена за штуку должна быть числом";
                isValid = false;
            }
        } else if (typeof formData.price !== "number") {
            newErrors.price = "Некорректный формат цены за штуку";
            isValid = false;
        }

        // Проверка количества штук в коробке
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

        // Проверка цены за коробку (опционально - может рассчитываться автоматически)
        if (formData.boxPrice && formData.boxPrice.trim()) {
            if (isNaN(parseFloat(formData.boxPrice.replace(/[^0-9,.]/g, "")))) {
                newErrors.boxPrice = "Цена за коробку должна быть числом";
                isValid = false;
            }
        }

        if (formData.weight) {
            if (typeof formData.weight === "string") {
                if (formData.weight.trim() && isNaN(parseFloat(formData.weight.replace(/[^0-9,.]/g, "")))) {
                    newErrors.weight = "Вес должен быть числом";
                    isValid = false;
                }
            } else if (typeof formData.weight !== "number" && formData.weight !== null) {
                newErrors.weight = "Некорректный формат веса";
                isValid = false;
            }
        }

        if (formData.discount) {
            if (typeof formData.discount === "string") {
                if (formData.discount.trim() && isNaN(parseFloat(formData.discount.replace(/[^0-9,.]/g, "")))) {
                    newErrors.discount = "Скидка должна быть числом";
                    isValid = false;
                }
            } else if (typeof formData.discount !== "number" && formData.discount !== null) {
                newErrors.discount = "Некорректный формат скидки";
                isValid = false;
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

        // Валидация выбора складов (для поставщиков и админов)
        if ((isSupplier || isAdminOrEmployee) && (!formData.warehouses || formData.warehouses.length === 0)) {
            // Показываем предупреждение, но не блокируем отправку - товар будет добавлен на все склады
            newErrors.warehouses = "Не выбраны склады. Товар будет добавлен на все доступные склады";
            // isValid остается true - это предупреждение, а не ошибка
        }

        setErrors(newErrors);
        return isValid;
    };

    // Обработчик отправки формы с поэтапной загрузкой
    const handleSubmit = async () => {
        if (!validateForm() || isSubmitting) {
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
            const netInfo = await NetInfo.fetch();

            if (!netInfo.isConnected) {
                Alert.alert(
                    "Нет подключения",
                    "Проверьте подключение к интернету и попробуйте снова.",
                    [{text: "OK", style: "cancel"}]
                );
                setIsSubmitting(false);
                setIsUploading(false);
                return;
            }

            // Подготавливаем данные для отправки
            const productData = {
                name: formData.name,
                categories: formData.categories, // отправляем массив категорий
                price: formData.price, // цена за штуку
                itemsPerBox: formData.itemsPerBox || 1, // количество штук в коробке
                boxPrice: formData.boxPrice || null, // цена за коробку (может быть null для автоматического расчета)
                stockQuantity: formData.stockQuantity, // количество коробок на складе
                weight: formData.weight || null,
                discount: formData.discount || null,
                description: formData.description || '',
                supplierId: formData.supplierId,
                warehouses: formData.warehouses.length > 0 ? formData.warehouses : "all", // Добавляем склады
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

            console.log('Отправка данных продукта:', {
                имяПоля: formData.name,
                категории: formData.categories, // изменено на множественное число
                цена: formData.price,
                количествоНаСкладе: formData.stockQuantity,
                поставщикID: formData.supplierId,
                склады: formData.warehouses,
                количествоФото: formData.images.length
            });

            // Используем redux thunk для поэтапной загрузки
            const result = await dispatch(createProductChunked({
                formData: productData,
                images: formData.images,
                onProgress: (progress, stage, uploadedCount) => {
                    setUploadProgress(progress);
                    setCurrentStage(stage);
                    if (uploadedCount !== undefined) {
                        setUploadedImages(uploadedCount);
                    }
                }
            })).unwrap();

            // Успешное создание продукта
            // Сбрасываем кэш продуктов
            dispatch(clearProductsCache());

            // В зависимости от роли пользователя обновляем соответствующие данные
            if (isSupplier) {
                // Если пользователь - поставщик, обновляем его профиль
                dispatch(fetchProfile());
            }

            Alert.alert("Успешно", "Товар успешно добавлен");
            if (onSuccess && typeof onSuccess === "function") {
                onSuccess(result);
            }
            onClose();
        } catch (error) {
            console.error('Ошибка при отправке формы:', error);

            // Анализируем тип ошибки
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

    // Компонент для отображения прогресса загрузки
    const renderUploadProgress = () => {
        if (!isUploading) return null;

        return (
            <View style={styles.progressContainer}>
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
                </View>
                <Text style={styles.progressText}>
                    {currentStage} {uploadedImages > 0 ? `(${uploadedImages}/${formData.images.length} фото)` : ''}
                </Text>
                <Text style={styles.progressPercentage}>{Math.round(uploadProgress)}%</Text>
            </View>
        );
    };

    // Содержимое формы
    const renderContent = () => (
        <View style={styles.formContainer}>
            <View style={styles.formHeader}>
                <View style={styles.leftColumn}>
                    <MultipleImageUpload
                        photos={formData.images}
                        setPhotos={handlePhotosChange}
                        error={errors.images}
                        maxImages={5}
                    />
                </View>
                <View style={styles.rightColumn}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Название товара *</Text>
                        <TextInput
                            style={[
                                styles.input,
                                errors.name ? styles.inputError : null,
                                {height: Math.max(30, nameInputHeight)}
                            ]}
                            value={formData.name}
                            onChangeText={(text) => handleChange("name", text)}
                            placeholder="Введите название"
                            multiline
                            onContentSizeChange={(event) => {
                                setNameInputHeight(event.nativeEvent.contentSize.height);
                            }}
                        />
                        <View style={[styles.inputUnderline, errors.name ? styles.underlineError : null]}/>
                        {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
                    </View>

                    <CategoryPicker
                        selectedCategories={formData.categories}
                        onSelectCategories={handleCategoriesChange}
                        error={errors.categories}
                        allowMultiple={true}
                    />

                    {/* Показываем выбор поставщика только для админов и сотрудников */}
                    {isAdminOrEmployee && (
                        <SupplierPicker
                            selectedSupplier={formData.supplierId}
                            onSelectSupplier={handleSupplierChange}
                            error={errors.supplierId}
                        />
                    )}

                    {/* Выбор складов */}
                    <WarehousePicker
                        selectedWarehouses={formData.warehouses}
                        onSelectWarehouses={handleWarehousesChange}
                        error={errors.warehouses}
                        isWarning={errors.warehouses && errors.warehouses.includes("будет добавлен на все")}
                        allowMultiple={true}
                        allowSelectAll={true}
                    />

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Введите вес *</Text>
                        <TextInput
                            style={[styles.input, errors.weight ? styles.inputError : null]}
                            value={formData.weight}
                            onChangeText={(text) => handleChange("weight", text)}
                            placeholder="Вес (г)"
                            keyboardType="numeric"
                        />
                        <View style={[styles.inputUnderline, errors.weight ? styles.underlineError : null]}/>
                        {errors.weight ? <Text style={styles.errorText}>{errors.weight}</Text> : null}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Штук в коробке *</Text>
                        <TextInput
                            style={[styles.input, errors.itemsPerBox ? styles.inputError : null]}
                            value={formData.itemsPerBox}
                            onChangeText={(text) => handleChange("itemsPerBox", text)}
                            placeholder="Количество штук в коробке"
                            keyboardType="numeric"
                        />
                        <View style={[styles.inputUnderline, errors.itemsPerBox ? styles.underlineError : null]}/>
                        {errors.itemsPerBox ? <Text style={styles.errorText}>{errors.itemsPerBox}</Text> : null}
                    </View>
                </View>
            </View>
            <View style={styles.inputsRow}>
                <View style={styles.inputContainerHalf}>
                    <Text style={styles.label}>Цена за штуку *</Text>
                    <TextInput
                        style={[styles.input, errors.price ? styles.inputError : null]}
                        value={formData.price}
                        onChangeText={(text) => handleChange("price", text)}
                        placeholder="Цена за 1 шт (₽)"
                        keyboardType="numeric"
                    />
                    <View style={[styles.inputUnderline, errors.price ? styles.underlineError : null]}/>
                    {errors.price ? <Text style={styles.errorText}>{errors.price}</Text> : null}
                </View>
                <View style={styles.inputContainerHalf}>
                    <Text style={styles.label}>Цена за коробку</Text>
                    <TextInput
                        style={[styles.input, errors.boxPrice ? styles.inputError : null]}
                        value={formData.boxPrice}
                        onChangeText={(text) => handleChange("boxPrice", text)}
                        placeholder="Автоматически"
                        keyboardType="numeric"
                    />
                    <View style={[styles.inputUnderline, errors.boxPrice ? styles.underlineError : null]}/>
                    {errors.boxPrice ? <Text style={styles.errorText}>{errors.boxPrice}</Text> : null}
                </View>
            </View>
            <View style={styles.inputsRow}>
                <View style={styles.inputContainerHalf}>
                    <Text style={styles.label}>Введите скидку</Text>
                    <TextInput
                        style={[styles.input, errors.discount ? styles.inputError : null]}
                        value={formData.discount}
                        onChangeText={(text) => handleChange("discount", text)}
                        placeholder="Скидка (%)"
                        keyboardType="numeric"
                    />
                    <View style={[styles.inputUnderline, errors.discount ? styles.underlineError : null]}/>
                    {errors.discount ? <Text style={styles.errorText}>{errors.discount}</Text> : null}
                </View>
                <View style={styles.inputContainerHalf}>
                    <Text style={styles.label}>Коробки на складе *</Text>
                    <TextInput
                        style={[styles.input, errors.stockQuantity ? styles.inputError : null]}
                        value={formData.stockQuantity}
                        onChangeText={(text) => handleChange("stockQuantity", text)}
                        placeholder="Количество коробок"
                        keyboardType="numeric"
                    />
                    <View style={[styles.inputUnderline, errors.stockQuantity ? styles.underlineError : null]}/>
                    {errors.stockQuantity ? <Text style={styles.errorText}>{errors.stockQuantity}</Text> : null}
                </View>
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Описание товара</Text>
                <TextInput
                    style={[
                        styles.input,
                        errors.description ? styles.inputError : null,
                        {height: Math.max(35, textAreaHeight)}
                    ]}
                    value={formData.description}
                    onChangeText={(text) => handleChange("description", text)}
                    placeholder="Введите описание"
                    multiline
                    onContentSizeChange={(event) => {
                        setTextAreaHeight(event.nativeEvent.contentSize.height);
                    }}
                />
                <View style={[styles.inputUnderline, errors.description ? styles.underlineError : null]}/>
                {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : null}
            </View>

            {/* Отображаем прогресс загрузки */}
            {renderUploadProgress()}

            <TouchableOpacity
                style={[styles.submitButton, isSubmitting ? styles.disabledButton : null]}
                onPress={handleSubmit}
                activeOpacity={0.7}
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF"/>
                ) : (
                    <Text style={styles.submitButtonText}>Добавить товар</Text>
                )}
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.testButton]}
                onPress={async () => {
                    try {
                        const testUrl = getBaseUrl();
                        const response = await fetch(`${testUrl}/api/health`);
                        Alert.alert(
                            "Проверка сервера",
                            `URL: ${testUrl}\nСтатус: ${response.status}\nДоступен: ${response.ok ? 'Да' : 'Нет'}`
                        );
                    } catch (e) {
                        Alert.alert("Ошибка соединения", e.message);
                    }
                }}
            >
                <Text style={styles.testButtonText}>Проверить сервер</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <ReusableModal
            visible={visible}
            onClose={onClose}
            title="Добавление нового товара"
            height={90}
        >
            {renderContent()}
        </ReusableModal>
    );
};

const styles = StyleSheet.create({
    formContainer: {
        padding: 16,
    },
    formHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 5,
    },
    leftColumn: {
        width: "40%",
    },
    rightColumn: {
        width: "47%",
    },
    inputGroup: {
        marginBottom: 10,
        position: "relative",
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: Color.dark,
        opacity: 0.4,
        marginBottom: 0,
        fontFamily: FontFamily.sFProText,
    },
    input: {
        fontSize: 13,
        color: Color.dark,
        paddingVertical: 5,
        paddingLeft: 0,
        fontFamily: FontFamily.sFProText,
    },
    inputError: {
        color: "#FF3B30",
    },
    textArea: {
        textAlignVertical: "top",
        paddingTop: 5,
    },
    inputUnderline: {
        height: 1,
        backgroundColor: "#000",
        marginTop: 0,
    },
    underlineError: {
        backgroundColor: "#FF3B30",
        height: 1.5,
    },
    errorText: {
        color: "#FF3B30",
        fontSize: 12,
        marginTop: 5,
        fontFamily: FontFamily.sFProText,
    },
    inputsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 5,
    },
    inputContainerHalf: {
        width: "48%",
        marginBottom: 10,
    },
    submitButton: {
        backgroundColor: "#3B43A2",
        height: 40,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 20,
        marginBottom: 30,
    },
    disabledButton: {
        backgroundColor: "#a0a0a0",
    },
    submitButtonText: {
        color: Color.colorLightMode,
        fontSize: 16,
        fontWeight: "500",
        fontFamily: FontFamily.sFProText,
    },
    testButton: {
        backgroundColor: "#DDDDDD",
        height: 30,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 10,
    },
    testButtonText: {
        color: "#444444",
        fontSize: 12,
        fontFamily: FontFamily.sFProText,
    },
    // Стили для индикатора прогресса
    progressContainer: {
        marginTop: 15,
        marginBottom: 10,
        width: '100%',
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 5,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#3B43A2',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
        fontFamily: FontFamily.sFProText,
    },
    progressPercentage: {
        fontSize: 12,
        color: '#333',
        fontWeight: '500',
        fontFamily: FontFamily.sFProText,
    },
    warningText: {
        color: '#FF9500', // Оранжевый цвет для предупреждений
        fontSize: 12,
        marginTop: 5,
        fontFamily: FontFamily.sFProText,
    },
});