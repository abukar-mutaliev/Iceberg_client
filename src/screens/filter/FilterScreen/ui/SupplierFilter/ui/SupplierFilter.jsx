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
import { FontFamily } from '@/app/styles/GlobalStyles';
import { Checkbox } from '@/shared/ui/Checkbox';
import { ScrollableBackgroundGradient } from '@/shared/ui/BackgroundGradient';

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

export const SupplierFilter = ({ suppliers = [], onChange, products = [] }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [availableSuppliers, setAvailableSuppliers] = useState([]);
    const [selectedSuppliers, setSelectedSuppliers] = useState(suppliers);
    const [contentHeight, setContentHeight] = useState(0);

    useEffect(() => {
        if (products && products.length > 0) {
            const uniqueSuppliers = [];

            products.forEach(product => {
                if (product.supplier && product.supplier.id && product.supplier.companyName) {
                    const exists = uniqueSuppliers.find(s => s.id === product.supplier.id);
                    if (!exists) {
                        uniqueSuppliers.push({
                            id: product.supplier.id,
                            name: product.supplier.companyName,
                            contactPerson: product.supplier.contactPerson || ''
                        });
                    }
                }
            });

            setAvailableSuppliers(uniqueSuppliers.sort((a, b) => a.name.localeCompare(b.name)));
        }
    }, [products]);

    const handleSelectSupplier = (supplier) => {
        let newSelectedSuppliers;

        if (selectedSuppliers.some(s => s.id === supplier.id)) {
            newSelectedSuppliers = selectedSuppliers.filter(s => s.id !== supplier.id);
        } else {
            newSelectedSuppliers = [...selectedSuppliers, supplier];
        }

        setSelectedSuppliers(newSelectedSuppliers);
    };

    const handleApplySuppliers = () => {
        onChange(selectedSuppliers);
        setModalVisible(false);
    };

    const filteredSuppliers = searchText.trim()
        ? availableSuppliers.filter(supplier =>
            supplier.name.toLowerCase().includes(searchText.toLowerCase()) ||
            (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(searchText.toLowerCase()))
        )
        : availableSuppliers;

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
                <Text style={styles.selectorText}>Продавец</Text>
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

                            <Text style={styles.modalTitle}>Продавцы</Text>

                            <TouchableOpacity
                                onPress={() => setSelectedSuppliers([])}
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
                                    placeholder="Поиск продавцов"
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
                                data={filteredSuppliers}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.supplierItem}
                                        onPress={() => handleSelectSupplier(item)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.supplierInfo}>
                                            <Text style={styles.supplierName}>{item.name}</Text>
                                            {item.contactPerson ? (
                                                <Text style={styles.supplierContact}>{item.contactPerson}</Text>
                                            ) : null}
                                        </View>
                                        <Checkbox
                                            selected={selectedSuppliers.some(s => s.id === item.id)}
                                        />
                                    </TouchableOpacity>
                                )}
                                onContentSizeChange={onContentSizeChange}
                                ListEmptyComponent={() => (
                                    <Text style={styles.emptyMessage}>Продавцы не найдены</Text>
                                )}
                            />
                            <TouchableOpacity
                                style={styles.modalApplyButton}
                                onPress={handleApplySuppliers}
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
    supplierItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: normalize(15),
        paddingHorizontal: normalize(16),
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5EA',
    },
    supplierInfo: {
        flex: 1,
    },
    supplierName: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: '#000000',
    },
    supplierContact: {
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

export default SupplierFilter;