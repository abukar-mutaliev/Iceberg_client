import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
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
import { Color, FontFamily } from "@app/styles/GlobalStyles";
import { MultipleImageUpload } from "@entities/product/ui/MultipleImageUpload";
import { CategoryPicker } from "@widgets/product/EditProductModal/ui/CategoryPicker";
import { SupplierPicker } from "@widgets/product/EditProductModal/ui/SupplierPicker";
import { selectUser } from "@entities/auth/model/selectors";
import { uploadProductWithImages } from '@shared/api/uploadHelpers';
import { ReusableModal } from "@shared/ui/Modal/ReusableModal";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export const AddProductModal = ({ visible, onClose, onSuccess }) => {
    const dispatch = useDispatch();

    // Получаем информацию о пользователе из Redux
    const user = useSelector(selectUser);

    // Определяем роль пользователя
    const isSupplier = user?.role === 'SUPPLIER';
    const isAdminOrEmployee = user?.role === 'ADMIN' || user?.role === 'EMPLOYEE';

    // Начальное состояние формы
    const [formData, setFormData] = useState({
        name: "",
        category: "",
        weight: "",
        price: "",
        discount: "",
        stockQuantity: "",
        description: "",
        images: [],
        supplierId: "",
    });

    const [errors, setErrors] = useState({
        name: "",
        category: "",
        weight: "",
        price: "",
        discount: "",
        stockQuantity: "",
        description: "",
        images: "",
        supplierId: "",
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isSupplier && user?.supplier?.id) {
            setFormData(prev => ({
                ...prev,
                supplierId: user.supplier.id.toString()
            }));
        }
    }, [isSupplier, user]);

    useEffect(() => {
        if (visible) {
            const resetData = {
                name: "",
                category: "",
                weight: "",
                price: "",
                discount: "",
                stockQuantity: "",
                description: "",
                images: [],
                supplierId: isSupplier && user?.supplier?.id ? user.supplier.id.toString() : "",
            };

            setFormData(resetData);

            setErrors({
                name: "",
                category: "",
                weight: "",
                price: "",
                discount: "",
                stockQuantity: "",
                description: "",
                images: "",
                supplierId: "",
            });
        }
    }, [visible, isSupplier, user]);

    // Обработчик изменения данных формы
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

    // Обработчик изменения категории
    const handleCategoryChange = (categoryId) => {
        setFormData((prev) => ({
            ...prev,
            category: categoryId,
        }));
        setErrors((prev) => ({ ...prev, category: "" }));
    };

    // Обработчик изменения поставщика
    const handleSupplierChange = (supplierId) => {
        setFormData((prev) => ({
            ...prev,
            supplierId: supplierId,
        }));
        setErrors((prev) => ({ ...prev, supplierId: "" }));
    };

    // Обработчик изменения фото
    const handlePhotosChange = (newPhotos) => {
        setFormData((prev) => ({
            ...prev,
            images: newPhotos,
        }));

        if (newPhotos && newPhotos.length > 0) {
            setErrors((prev) => ({ ...prev, images: "" }));
        }
    };

    // Валидация формы
    const validateForm = () => {
        let isValid = true;
        const newErrors = { ...errors };

        if (!formData.name || !formData.name.trim()) {
            newErrors.name = "Введите название товара";
            isValid = false;
        }

        if (!formData.category) {
            newErrors.category = "Выберите категорию товара";
            isValid = false;
        }

        // Проверка ID поставщика для админов и сотрудников
        if (isAdminOrEmployee && (!formData.supplierId || formData.supplierId.trim() === '')) {
            newErrors.supplierId = "Выберите поставщика";
            isValid = false;
        }

        if (!formData.price) {
            newErrors.price = "Введите цену товара";
            isValid = false;
        } else if (typeof formData.price === "string") {
            if (!formData.price.trim()) {
                newErrors.price = "Введите цену товара";
                isValid = false;
            } else if (isNaN(parseFloat(formData.price.replace(/[^0-9,.]/g, "")))) {
                newErrors.price = "Цена должна быть числом";
                isValid = false;
            }
        } else if (typeof formData.price !== "number") {
            newErrors.price = "Некорректный формат цены";
            isValid = false;
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
            newErrors.stockQuantity = "Введите сколько осталось на складе";
            isValid = false;
        }

        if (!formData.images || formData.images.length === 0) {
            newErrors.images = "Добавьте хотя бы одну фотографию товара";
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async () => {
        if (!validateForm() || isSubmitting) {
            return;
        }

        setIsSubmitting(true);

        try {
            // Подготавливаем данные для отправки
            const productData = {
                name: formData.name,
                category: formData.category,
                price: formData.price,
                stockQuantity: formData.stockQuantity,
                weight: formData.weight || null,
                discount: formData.discount || null,
                description: formData.description || '',
                supplierId: formData.supplierId,
            };

            // Используем наш хелпер для загрузки
            const result = await uploadProductWithImages({
                formData: productData,
                images: formData.images
            });

            if (result.status === 'success') {
                Alert.alert("Успешно", "Товар успешно добавлен");
                if (onSuccess && typeof onSuccess === "function") {
                    onSuccess(result.data.product);
                }
                onClose();
            } else {
                Alert.alert("Ошибка", result.message || "Произошла ошибка при создании товара");
            }
        } catch (error) {
            console.error('Ошибка при отправке формы:', error);
            Alert.alert("Ошибка", error.message || "Произошла ошибка при сохранении данных");
        } finally {
            setIsSubmitting(false);
        }
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
                            style={[styles.input, errors.name ? styles.inputError : null]}
                            value={formData.name}
                            onChangeText={(text) => handleChange("name", text)}
                            placeholder="Введите название"
                        />
                        <View style={[styles.inputUnderline, errors.name ? styles.underlineError : null]} />
                        {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
                    </View>

                    <CategoryPicker
                        selectedCategory={formData.category}
                        onSelectCategory={handleCategoryChange}
                        error={errors.category}
                    />

                    {/* Показываем выбор поставщика только для админов и сотрудников */}
                    {isAdminOrEmployee && (
                        <SupplierPicker
                            selectedSupplier={formData.supplierId}
                            onSelectSupplier={handleSupplierChange}
                            error={errors.supplierId}
                        />
                    )}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Введите вес</Text>
                        <TextInput
                            style={[styles.input, errors.weight ? styles.inputError : null]}
                            value={formData.weight}
                            onChangeText={(text) => handleChange("weight", text)}
                            placeholder="Вес (г)"
                            keyboardType="numeric"
                        />
                        <View style={[styles.inputUnderline, errors.weight ? styles.underlineError : null]} />
                        {errors.weight ? <Text style={styles.errorText}>{errors.weight}</Text> : null}
                    </View>
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
                    <View style={[styles.inputUnderline, errors.discount ? styles.underlineError : null]} />
                    {errors.discount ? <Text style={styles.errorText}>{errors.discount}</Text> : null}
                </View>
                <View style={styles.inputContainerHalf}>
                    <Text style={styles.label}>Введите цену за 1 шт *</Text>
                    <TextInput
                        style={[styles.input, errors.price ? styles.inputError : null]}
                        value={formData.price}
                        onChangeText={(text) => handleChange("price", text)}
                        placeholder="Цена (р)"
                        keyboardType="numeric"
                    />
                    <View style={[styles.inputUnderline, errors.price ? styles.underlineError : null]} />
                    {errors.price ? <Text style={styles.errorText}>{errors.price}</Text> : null}
                </View>
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Сколько на складе *</Text>
                <TextInput
                    style={[styles.input, errors.stockQuantity ? styles.inputError : null]}
                    value={formData.stockQuantity}
                    onChangeText={(text) => handleChange("stockQuantity", text)}
                    placeholder="Введите сколько на складе товара"
                    keyboardType="numeric"
                />
                <View style={[styles.inputUnderline, errors.stockQuantity ? styles.underlineError : null]} />
                {errors.stockQuantity ? <Text style={styles.errorText}>{errors.stockQuantity}</Text> : null}
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Описание товара</Text>
                <TextInput
                    style={[styles.input, styles.textArea, errors.description ? styles.inputError : null]}
                    value={formData.description}
                    onChangeText={(text) => handleChange("description", text)}
                    placeholder="Введите описание"
                    multiline
                    numberOfLines={3}
                />
                <View style={[styles.inputUnderline, errors.description ? styles.underlineError : null]} />
                {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : null}
            </View>
            <TouchableOpacity
                style={[styles.submitButton, isSubmitting ? styles.disabledButton : null]}
                onPress={handleSubmit}
                activeOpacity={0.7}
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                    <Text style={styles.submitButtonText}>Добавить товар</Text>
                )}
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
        fontSize: 15,
        fontWeight: "600",
        color: Color.dark,
        opacity: 0.4,
        marginBottom: 0,
        fontFamily: FontFamily.sFProText,
    },
    input: {
        height: 30,
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
        height: 30,
        textAlignVertical: "top",
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
});