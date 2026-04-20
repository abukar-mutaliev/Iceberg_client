import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Dimensions,
    PixelRatio,
    Modal,
    TextInput
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight } from 'lucide-react-native';
import { FontFamily } from '@app/styles/GlobalStyles';
import { useEffect, useState, useMemo } from "react";
import { ScrollableBackgroundGradient } from '@shared/ui/BackgroundGradient';
import { Checkbox } from '@shared/ui/Checkbox';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { ThemedStatusBar } from '@shared/ui/ThemedStatusBar/ThemedStatusBar';

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
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

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
                <ChevronRight color={colors.textPrimary} size={normalize(24)} />
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={false}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <ThemedStatusBar />
                    <ScrollableBackgroundGradient
                        contentHeight={contentHeight + 200}
                        showOverlayGradient={false}
                    />

                    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
                        <View style={[styles.modalHeader, { paddingTop: insets.top + normalize(4) }]}>
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
                                    placeholderTextColor={colors.textTertiary}
                                    keyboardAppearance={colors.keyboardAppearance}
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

                        <View
                            style={[
                                styles.whiteContainer,
                                { marginBottom: Math.max(normalize(8), insets.bottom) }
                            ]}
                        >
                            <View style={styles.listContainer}>
                                <FlatList
                                    style={styles.list}
                                    data={filteredCategories}
                                    keyExtractor={(item) => item.id.toString()}
                                    contentContainerStyle={styles.listContent}
                                    scrollIndicatorInsets={{ bottom: normalize(12) }}
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
                            </View>
                            <View style={styles.footer}>
                                <TouchableOpacity
                                    style={styles.modalApplyButton}
                                    onPress={handleApplyCategories}
                                >
                                    <Text style={styles.modalApplyButtonText}>ПРИМЕНИТЬ</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                    </SafeAreaView>

                </View>
            </Modal>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
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
        color: colors.textPrimary,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: isDark ? colors.background : 'transparent',
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
        paddingBottom: normalize(15),
    },
    closeButton: {
        padding: normalize(5),
    },
    closeButtonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: colors.textPrimary,
    },
    modalTitle: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(18),
        fontWeight: '500',
        color: colors.textPrimary,
    },
    clearAllButton: {
        padding: normalize(5),
    },
    clearAllButtonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: colors.textSecondary,
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
        backgroundColor: isDark ? colors.surfaceElevated : 'white',
        borderRadius: normalize(8),
        paddingHorizontal: normalize(10),
        justifyContent: 'center',
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    searchInput: {
        flex: 1,
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        height: normalize(36),
        padding: 0,
        color: colors.textPrimary,
    },
    cancelButton: {
        marginLeft: normalize(15),
    },
    cancelButtonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: colors.primary,
    },
    whiteContainer: {
        flex: 1,
        backgroundColor: colors.cardBackground,
        borderRadius: normalize(12),
        marginHorizontal: normalize(16),
        overflow: 'hidden',
    },
    listContainer: {
        flex: 1,
        minHeight: 0,
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingBottom: normalize(12),
    },
    footer: {
        paddingTop: normalize(10),
        paddingBottom: normalize(8),
        backgroundColor: colors.cardBackground,
    },
    categoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: normalize(15),
        paddingHorizontal: normalize(16),
        borderBottomWidth: 0.5,
        borderBottomColor: colors.divider,
    },
    categoryName: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: colors.textPrimary,
    },
    emptyMessage: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: normalize(20),
    },
    modalApplyButton: {
        backgroundColor: colors.primary,
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
        color: colors.menuItemActiveText,
        textTransform: 'uppercase',
    }
});

export default CategoryFilter;