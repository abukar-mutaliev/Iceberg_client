import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Dimensions,
    PixelRatio,
    Modal,
    TextInput,
    SafeAreaView,
    Platform
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { FontFamily, Color } from '@app/styles/GlobalStyles';
import { useEffect, useState } from "react";
import { ScrollableBackgroundGradient } from '@shared/ui/BackgroundGradient';
import { Checkbox } from '@shared/ui/Checkbox';

// Адаптивные размеры
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 440;

const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const normalizeFont = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const CategoryFilter = ({ categories = [], onChange, products = [] }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [availableCategories, setAvailableCategories] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState(categories);
    const [contentHeight, setContentHeight] = useState(0);

    useEffect(() => {
        if (products && products.length > 0) {
            const uniqueCategories = [];

            products.forEach(product => {
                if (product.categories && Array.isArray(product.categories)) {
                    product.categories.forEach(category => {
                        if (category && category.id && category.name) {
                            const exists = uniqueCategories.find(c => c.id === category.id);
                            if (!exists) {
                                uniqueCategories.push({
                                    id: category.id,
                                    name: category.name,
                                    description: category.description || ''
                                });
                            }
                        }
                    });
                }
            });

            setAvailableCategories(uniqueCategories.sort((a, b) => a.name.localeCompare(b.name)));
        }
    }, [products]);

    // Обработчик выбора категории
    const handleSelectCategory = (category) => {
        let newSelectedCategories;

        if (selectedCategories.some(cat => cat.id === category.id)) {
            newSelectedCategories = selectedCategories.filter(cat => cat.id !== category.id);
        } else {
            newSelectedCategories = [...selectedCategories, category];
        }

        setSelectedCategories(newSelectedCategories);
    };

    // Обработчик применения выбранных категорий
    const handleApplyCategories = () => {
        onChange(selectedCategories);
        setModalVisible(false);
    };

    // Фильтрация категорий по поисковому запросу
    const filteredCategories = searchText.trim()
        ? availableCategories.filter(cat =>
            cat.name.toLowerCase().includes(searchText.toLowerCase()) ||
            (cat.description && cat.description.toLowerCase().includes(searchText.toLowerCase()))
        )
        : availableCategories;

    const onContentSizeChange = (width, height) => {
        setContentHeight(height);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.selector}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
            >
                <Text style={styles.selectorText}>Категория</Text>
                <ChevronRight color="#000000" size={normalize(24)} />
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={false}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <ScrollableBackgroundGradient
                        contentHeight={contentHeight + 200}
                        showOverlayGradient={false}
                    />

                    <SafeAreaView style={styles.safeArea}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                style={styles.closeButton}
                            >
                                <Text style={styles.closeButtonText}>Закрыть</Text>
                            </TouchableOpacity>

                            <Text style={styles.modalTitle}>Категории</Text>

                            <TouchableOpacity
                                onPress={() => setSelectedCategories([])}
                                style={styles.clearAllButton}
                            >
                                <Text style={styles.clearAllButtonText}>Сбросить</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchOuterContainer}>
                            <View style={styles.searchContainerWrapper}>
                                <TextInput
                                    style={styles.searchInput}
                                    value={searchText}
                                    onChangeText={setSearchText}
                                    placeholder="Шоколадное"
                                    placeholderTextColor="#999999"
                                    autoCapitalize="none"
                                />
                            </View>

                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setSearchText('')}
                            >
                                <Text style={styles.cancelButtonText}>Отмена</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.whiteContainer}>
                            <FlatList
                                data={filteredCategories}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.categoryItem}
                                        onPress={() => handleSelectCategory(item)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.categoryName}>
                                            {item.name}
                                        </Text>
                                        <Checkbox
                                            selected={selectedCategories.some(cat => cat.id === item.id)}
                                        />
                                    </TouchableOpacity>
                                )}
                                onContentSizeChange={onContentSizeChange}
                                ListEmptyComponent={() => (
                                    <Text style={styles.emptyMessage}>Категории не найдены</Text>
                                )}
                            />
                            <TouchableOpacity
                                style={styles.modalApplyButton}
                                onPress={handleApplyCategories}
                            >
                                <Text style={styles.modalApplyButtonText}>ПРИМЕНИТЬ</Text>
                            </TouchableOpacity>
                        </View>

                    </SafeAreaView>

                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: normalize(8),
    },
    selector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: normalize(14),
    },
    selectorText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(17),
        color: '#000000',
    },
    modalContainer: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        width: '100%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: normalize(16),
        paddingTop: Platform.OS === 'ios' ? normalize(15) : normalize(45),
        paddingBottom: normalize(15),
    },
    closeButton: {
        padding: normalize(5),
    },
    closeButtonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: '#000000',
    },
    modalTitle: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(18),
        fontWeight: '500',
        color: '#000000',
    },
    clearAllButton: {
        padding: normalize(5),
    },
    clearAllButtonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: '#86868A',
    },
    searchOuterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: normalize(16),
        marginBottom: normalize(15),
        width: '95%',
        paddingLeft: normalize(30),
    },
    searchContainerWrapper: {
        flex: 1,
        height: normalize(36),
        backgroundColor: 'white',
        borderRadius: normalize(8),
        paddingHorizontal: normalize(10),
        justifyContent: 'center',
    },
    searchInput: {
        flex: 1,
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        height: normalize(36),
        padding: 0,
    },
    cancelButton: {
        marginLeft: normalize(15),
    },
    cancelButtonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: '#3478F6',
    },
    whiteContainer: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: normalize(12),
        marginHorizontal: normalize(16),
        marginBottom: normalize(20),
        overflow: 'hidden',
    },
    categoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: normalize(15),
        paddingHorizontal: normalize(16),
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5EA',
    },
    categoryName: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: '#000000',
    },
    emptyMessage: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: '#86868A',
        textAlign: 'center',
        marginTop: normalize(20),
    },
    modalApplyButton: {
        backgroundColor: '#5500FF',
        borderRadius: normalize(30),
        marginHorizontal: normalize(20),
        marginBottom: normalize(25),
        marginTop: normalize(10),
        height: normalize(59),
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalApplyButtonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(17),
        fontWeight: '500',
        color: 'white',
        textTransform: 'uppercase',
    }
});

export default CategoryFilter;