// src/pages/add-product/AddProductScreen.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker'; // Заменяем react-native-image-picker
import { Picker } from '@react-native-picker/picker';
import { createProduct } from '@entities/product';
import { selectCategories, selectCategoriesLoading, selectCategoriesError, fetchCategories } from '@entities/category';
import { selectUser } from '@entities/auth';

export const AddProductScreen = () => {
    const dispatch = useDispatch();
    const categories = useSelector(selectCategories);
    const categoriesLoading = useSelector(selectCategoriesLoading);
    const categoriesError = useSelector(selectCategoriesError);
    const user = useSelector(selectUser);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        stockQuantity: '',
        categoryId: '',
        supplierId: user?.role === 'SUPPLIER' ? user.id.toString() : '',
    });
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        console.log('Fetching categories...');
        dispatch(fetchCategories()).then((result) => {
            console.log('Fetch categories result:', result);
        }).catch((err) => {
            console.error('Fetch categories error:', err);
        });
    }, [dispatch]);

    useEffect(() => {
        console.log('Categories in state:', categories);
    }, [categories]);

    const pickImage = async () => {
        console.log('pickImage called');
        try {
            // Запрашиваем разрешение (Expo делает это автоматически, но для отладки проверим)
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            console.log('Permission result:', permissionResult);

            if (!permissionResult.granted) {
                Alert.alert('Ошибка', 'Нет разрешения на доступ к галерее');
                return;
            }

            console.log('Launching image library...');
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 1,
                allowsEditing: false, // Можно включить обрезку, если нужно
            });
            console.log('ImagePicker result:', result);

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const image = result.assets[0];
                console.log('Selected image:', image);
                setSelectedImage({
                    uri: image.uri,
                    name: image.fileName || `image-${Date.now()}.jpg`,
                    type: image.type || 'image/jpeg',
                });
            } else if (result.canceled) {
                console.log('User cancelled image selection');
            } else {
                Alert.alert('Ошибка', 'Не удалось получить изображение');
            }
        } catch (err) {
            console.error('ImagePicker error:', err);
            Alert.alert('Ошибка', `Не удалось выбрать изображение: ${err.message || 'Неизвестная ошибка'}`);
        }
    };

    const handleCreateProduct = async () => {
        if (!formData.categoryId) {
            Alert.alert('Ошибка', 'Выберите категорию');
            return;
        }

        const data = new FormData();
        data.append('name', formData.name);
        data.append('description', formData.description);
        data.append('price', formData.price);
        data.append('stockQuantity', formData.stockQuantity);
        data.append('categories', JSON.stringify([parseInt(formData.categoryId, 10)]));

        if (user?.role !== 'SUPPLIER') {
            data.append('supplierId', formData.supplierId);
        }

        if (selectedImage) {
            data.append('images', {
                uri: selectedImage.uri,
                name: selectedImage.name,
                type: selectedImage.type,
            });
        }
        console.log('FormData contents:');
        for (let [key, value] of data.entries()) {
            console.log(`${key}:`, value);
        }
        try {
            await dispatch(createProduct(data)).unwrap();
            Alert.alert('Успех', 'Продукт успешно добавлен');
            setFormData({
                name: '',
                description: '',
                price: '',
                stockQuantity: '',
                categoryId: '',
                supplierId: user?.role === 'SUPPLIER' ? user.id.toString() : '',
            });
            setSelectedImage(null);
        } catch (err) {
            console.error('Create product error:', err);
            Alert.alert('Ошибка', err.message || 'Не удалось добавить продукт');
        }
    };

    if (categoriesLoading) return <Text>Загрузка категорий...</Text>;
    if (categoriesError) return <Text>Ошибка загрузки категорий: {categoriesError}</Text>;

    return (
        <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 20, marginBottom: 10 }}>Создать продукт</Text>
            <TextInput
                placeholder="Название"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                style={{ borderWidth: 1, marginBottom: 10, padding: 5 }}
            />
            <TextInput
                placeholder="Описание"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                style={{ borderWidth: 1, marginBottom: 10, padding: 5 }}
            />
            <TextInput
                placeholder="Цена"
                value={formData.price}
                onChangeText={(text) => setFormData({ ...formData, price: text })}
                keyboardType="numeric"
                style={{ borderWidth: 1, marginBottom: 10, padding: 5 }}
            />
            <TextInput
                placeholder="Количество"
                value={formData.stockQuantity}
                onChangeText={(text) => setFormData({ ...formData, stockQuantity: text })}
                keyboardType="numeric"
                style={{ borderWidth: 1, marginBottom: 10, padding: 5 }}
            />
            <Text style={{ marginBottom: 5 }}>Выберите категорию:</Text>
            <Picker
                selectedValue={formData.categoryId}
                onValueChange={(itemValue) =>
                    setFormData({ ...formData, categoryId: itemValue })
                }
                style={{ borderWidth: 1, marginBottom: 10 }}
            >
                <Picker.Item label="Выберите категорию" value="" />
                {categories.length === 0 ? (
                    <Picker.Item label="Категории не найдены" value="" />
                ) : (
                    categories.map((category) => (
                        <Picker.Item
                            key={category.id}
                            label={category.name}
                            value={category.id.toString()}
                        />
                    ))
                )}
            </Picker>
            {user?.role !== 'SUPPLIER' && (
                <TextInput
                    placeholder="ID поставщика"
                    value={formData.supplierId}
                    onChangeText={(text) => setFormData({ ...formData, supplierId: text })}
                    style={{ borderWidth: 1, marginBottom: 10, padding: 5 }}
                />
            )}
            <Button title="Выбрать изображение" onPress={() => {
                console.log('Button pressed');
                pickImage();
            }} />
            {selectedImage && (
                <Text style={{ marginVertical: 10 }}>
                    Выбрано: {selectedImage.name}
                </Text>
            )}
            <Button title="Создать продукт" onPress={handleCreateProduct} />
        </View>
    );
};