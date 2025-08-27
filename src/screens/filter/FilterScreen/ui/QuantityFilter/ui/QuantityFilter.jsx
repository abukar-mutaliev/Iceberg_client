import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    SafeAreaView,
    FlatList,
    Dimensions,
    PixelRatio,
    Platform
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { FontFamily } from '@app/styles/GlobalStyles';
import { Checkbox } from '@shared/ui/Checkbox';
import { ScrollableBackgroundGradient } from '@shared/ui/BackgroundGradient';

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

const QUANTITY_OPTIONS = [
    { id: 1, name: '1 шт', value: 1 },
    { id: 2, name: '2 шт', value: 2 },
    { id: 3, name: '3 шт', value: 3 },
    { id: 4, name: '4 шт', value: 4 },
    { id: 5, name: '5 шт', value: 5 },
    { id: 6, name: '6 шт', value: 6 },
    { id: 7, name: '7 шт', value: 7 },
    { id: 8, name: '8 шт', value: 8 },
    { id: 9, name: '9 шт', value: 9 },
    { id: 10, name: '10 шт', value: 10 },
    { id: 11, name: '12 шт', value: 12 },
    { id: 12, name: '24 шт', value: 24 },
    { id: 13, name: '30 шт', value: 30 },
    { id: 14, name: '50 шт', value: 50 },
    { id: 15, name: '100 шт', value: 100 },
];

export const QuantityFilter = ({ quantity = [], onChange }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedQuantities, setSelectedQuantities] = useState(quantity);
    const [contentHeight, setContentHeight] = useState(0);

    const handleSelectQuantity = (item) => {
        let newSelected;

        if (selectedQuantities.some(q => q.id === item.id)) {
            newSelected = selectedQuantities.filter(q => q.id !== item.id);
        } else {
            newSelected = [...selectedQuantities, item];
        }

        setSelectedQuantities(newSelected);
    };

    const handleApplyQuantities = () => {
        onChange(selectedQuantities);
        setModalVisible(false);
    };

    const handleClearQuantities = () => {
        setSelectedQuantities([]);
    };

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
                <Text style={styles.selectorText}>Количество</Text>
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

                            <Text style={styles.modalTitle}>Количество</Text>

                            <TouchableOpacity
                                onPress={handleClearQuantities}
                                style={styles.clearAllButton}
                            >
                                <Text style={styles.clearAllButtonText}>Сбросить</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.whiteContainer}>
                            <FlatList
                                data={QUANTITY_OPTIONS}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.quantityItem}
                                        onPress={() => handleSelectQuantity(item)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.quantityName}>{item.name}</Text>
                                        <Checkbox
                                            selected={selectedQuantities.some(q => q.id === item.id)}
                                        />
                                    </TouchableOpacity>
                                )}
                                onContentSizeChange={onContentSizeChange}
                                ListEmptyComponent={() => (
                                    <Text style={styles.emptyMessage}>Варианты количества не найдены</Text>
                                )}
                            />
                            <TouchableOpacity
                                style={styles.modalApplyButton}
                                onPress={handleApplyQuantities}
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
    whiteContainer: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: normalize(12),
        marginHorizontal: normalize(16),
        marginBottom: normalize(20),
        overflow: 'hidden',
    },
    quantityItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: normalize(15),
        paddingHorizontal: normalize(16),
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5EA',
    },
    quantityName: {
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

export default QuantityFilter;