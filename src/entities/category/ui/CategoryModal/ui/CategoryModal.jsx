import React from 'react';
import { View, Text, Modal, TouchableOpacity, TouchableWithoutFeedback, StyleSheet, FlatList } from 'react-native';
import { useSelector } from 'react-redux';
import { XCircle } from 'lucide-react-native';
import { Color } from '@/app/styles/GlobalStyles';
import {
    selectCategories,
    selectCategoriesLoading,
    selectCategoriesError
} from '@/entities/category';
import { Loader } from '@/shared/ui/Loader';
import { CategoryItem } from "@entities/category/ui/CategoryItem";

export const CategoryModal = ({ isVisible, onClose, onSelectCategory }) => {
    const categories = useSelector(selectCategories);
    const isLoading = useSelector(selectCategoriesLoading);
    const error = useSelector(selectCategoriesError);

    const handleCategoryPress = (category) => {
        onSelectCategory(category);
        onClose();
    };

    const handleBackdropPress = () => {
        onClose();
    };

    const renderCategoryItem = ({ item }) => {
        return (
            <CategoryItem
                category={item}
                onPress={() => handleCategoryPress(item)}
            />
        );
    };

    return (
        <Modal
            visible={isVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={handleBackdropPress}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Категории</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                    <XCircle color={Color.blue2} size={24} />
                                </TouchableOpacity>
                            </View>

                            {isLoading ? (
                                <Loader />
                            ) : error ? (
                                <Text style={styles.errorText}>{error}</Text>
                            ) : (
                                <FlatList
                                    data={categories}
                                    renderItem={renderCategoryItem}
                                    keyExtractor={(item) => item.id.toString()}
                                    style={styles.categoryList}
                                />
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        maxHeight: '70%',
        backgroundColor: Color.colorLightMode,
        borderRadius: 12,
        padding: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Color.blue2,
    },
    closeButton: {
        padding: 4,
    },
    categoryList: {
        width: '100%',
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        padding: 16,
    }
});