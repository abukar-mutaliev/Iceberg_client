import React, { useState, useEffect } from 'react';
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
import { FontFamily } from '@app/styles/GlobalStyles';
import { Checkbox } from '@shared/ui/Checkbox';
import { ScrollableBackgroundGradient } from '@shared/ui/BackgroundGradient';

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

export const BrandFilter = ({ brands = [], onChange, products = [] }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [availableBrands, setAvailableBrands] = useState([]);
    const [selectedBrands, setSelectedBrands] = useState(brands);
    const [contentHeight, setContentHeight] = useState(0);

    // Получаем доступные бренды (поставщиков) из продуктов
    useEffect(() => {
        if (products && products.length > 0) {
            const uniqueBrands = [];

            products.forEach(product => {
                if (product.supplier && product.supplier.id && product.supplier.companyName) {
                    const exists = uniqueBrands.find(b => b.id === product.supplier.id);
                    if (!exists) {
                        uniqueBrands.push({
                            id: product.supplier.id,
                            name: product.supplier.companyName,
                        });
                    }
                }
            });

            setAvailableBrands(uniqueBrands.sort((a, b) => a.name.localeCompare(b.name)));
        }
    }, [products]);

    // Обработчик выбора бренда
    const handleSelectBrand = (brand) => {
        let newSelectedBrands;

        if (selectedBrands.some(b => b.id === brand.id)) {
            // Если бренд уже выбран, удаляем его
            newSelectedBrands = selectedBrands.filter(b => b.id !== brand.id);
        } else {
            // Если бренд не выбран, добавляем его
            newSelectedBrands = [...selectedBrands, brand];
        }

        setSelectedBrands(newSelectedBrands);
    };

    // Обработчик применения выбранных брендов
    const handleApplyBrands = () => {
        onChange(selectedBrands);
        setModalVisible(false);
    };

    // Фильтрация брендов по поисковому запросу
    const filteredBrands = searchText.trim()
        ? availableBrands.filter(brand =>
            brand.name.toLowerCase().includes(searchText.toLowerCase()) ||
            (brand.contactPerson && brand.contactPerson.toLowerCase().includes(searchText.toLowerCase()))
        )
        : availableBrands;

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
                <Text style={styles.selectorText}>Бренд</Text>
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

                            <Text style={styles.modalTitle}>Бренды</Text>

                            <TouchableOpacity
                                onPress={() => setSelectedBrands([])}
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
                                    placeholder="Поиск брендов"
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
                                data={filteredBrands}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.brandItem}
                                        onPress={() => handleSelectBrand(item)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.brandInfo}>
                                            <Text style={styles.brandName}>{item.name}</Text>
                                            {item.contactPerson ? (
                                                <Text style={styles.brandContact}>{item.contactPerson}</Text>
                                            ) : null}
                                        </View>
                                        <Checkbox
                                            selected={selectedBrands.some(b => b.id === item.id)}
                                        />
                                    </TouchableOpacity>
                                )}
                                onContentSizeChange={onContentSizeChange}
                                ListEmptyComponent={() => (
                                    <Text style={styles.emptyMessage}>Бренды не найдены</Text>
                                )}
                            />
                            <TouchableOpacity
                                style={styles.modalApplyButton}
                                onPress={handleApplyBrands}
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
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
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
    brandItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: normalize(15),
        paddingHorizontal: normalize(16),
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5EA',
    },
    brandInfo: {
        flex: 1,
    },
    brandName: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: '#000000',
    },
    brandContact: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(14),
        color: '#666666',
        marginTop: normalize(4),
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

export default BrandFilter;