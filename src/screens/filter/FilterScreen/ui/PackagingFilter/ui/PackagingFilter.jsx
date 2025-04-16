import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    SafeAreaView,
    TextInput,
    FlatList,
    Dimensions,
    PixelRatio
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { FontFamily } from '@/app/styles/GlobalStyles';

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

// Предварительно заданные типы упаковок для мороженого
const PREDEFINED_PACKAGING = [
    { id: 1, name: 'Стаканчик' },
    { id: 2, name: 'Рожок' },
    { id: 3, name: 'Эскимо' },
    { id: 4, name: 'Брикет' },
    { id: 5, name: 'Торт' },
    { id: 6, name: 'Ведерко' },
    { id: 7, name: 'Набор' }
];

export const PackagingFilter = ({ packaging = [], onChange }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedPackaging, setSelectedPackaging] = useState(packaging);

    // Обработчик выбора упаковки
    const handleSelectPackaging = (pack) => {
        let newSelected;

        if (selectedPackaging.some(p => p.id === pack.id)) {
            // Если упаковка уже выбрана, удаляем ее
            newSelected = selectedPackaging.filter(p => p.id !== pack.id);
        } else {
            // Если упаковка не выбрана, добавляем ее
            newSelected = [...selectedPackaging, pack];
        }

        setSelectedPackaging(newSelected);
    };

    // Обработчик применения выбранных упаковок
    const handleApplyPackaging = () => {
        onChange(selectedPackaging);
        setModalVisible(false);
    };

    // Обработчик сброса всех упаковок
    const handleClearPackaging = () => {
        setSelectedPackaging([]);
    };

    // Фильтрация упаковок по поисковому запросу
    const filteredPackaging = searchText.trim()
        ? PREDEFINED_PACKAGING.filter(pack =>
            pack.name.toLowerCase().includes(searchText.toLowerCase())
        )
        : PREDEFINED_PACKAGING;

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.selector}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
            >
                <Text style={styles.selectorText}>Упаковка</Text>
                <ChevronRight color="#000000" size={normalize(24)} />
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={false}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            onPress={() => setModalVisible(false)}
                            style={styles.closeButton}
                        >
                            <Text style={styles.closeButtonText}>Закрыть</Text>
                        </TouchableOpacity>

                        <Text style={styles.modalTitle}>Выберите упаковку</Text>

                        <TouchableOpacity
                            onPress={handleClearPackaging}
                            style={styles.clearAllButton}
                        >
                            <Text style={styles.clearAllButtonText}>Отмена</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchContainer}>
                        <TextInput
                            style={styles.searchInput}
                            value={searchText}
                            onChangeText={setSearchText}
                            placeholder="Поиск упаковки"
                            placeholderTextColor="#999999"
                            autoCapitalize="none"
                        />
                        {searchText ? (
                            <TouchableOpacity
                                style={styles.clearButton}
                                onPress={() => setSearchText('')}
                            >
                                <Text style={styles.clearButtonText}>Отмена</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    <FlatList
                        data={filteredPackaging}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.packagingItem}
                                onPress={() => handleSelectPackaging(item)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.packagingName}>{item.name}</Text>
                                <View style={styles.checkbox}>
                                    {selectedPackaging.some(p => p.id === item.id) && (
                                        <View style={styles.checkboxSelected} />
                                    )}
                                </View>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={() => (
                            <Text style={styles.emptyMessage}>Упаковки не найдены</Text>
                        )}
                    />

                    <TouchableOpacity
                        style={styles.modalApplyButton}
                        onPress={handleApplyPackaging}
                    >
                        <Text style={styles.modalApplyButtonText}>ПРИМЕНИТЬ</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
    },
    selector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: normalize(16),
    },
    selectorText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(17),
        color: '#000000',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'white',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(10),
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
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
        fontSize: normalizeFont(17),
        fontWeight: '600',
        color: '#000000',
    },
    clearAllButton: {
        padding: normalize(5),
    },
    clearAllButtonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: '#999999',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(10),
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    searchInput: {
        flex: 1,
        height: normalize(40),
        backgroundColor: '#F5F5F5',
        borderRadius: normalize(10),
        paddingHorizontal: normalize(15),
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
    },
    clearButton: {
        marginLeft: normalize(10),
    },
    clearButtonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: '#999999',
    },
    packagingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: normalize(12),
        paddingHorizontal: normalize(16),
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    packagingName: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: '#000000',
    },
    checkbox: {
        width: normalize(20),
        height: normalize(20),
        borderWidth: 1,
        borderColor: '#CCCCCC',
        borderRadius: normalize(4),
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        width: normalize(12),
        height: normalize(12),
        backgroundColor: '#6a3cf7',
        borderRadius: normalize(2),
    },
    emptyMessage: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        color: '#999999',
        textAlign: 'center',
        marginTop: normalize(20),
    },
    modalApplyButton: {
        backgroundColor: '#6a3cf7',
        borderRadius: normalize(25),
        paddingVertical: normalize(14),
        marginHorizontal: normalize(16),
        marginBottom: normalize(20),
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalApplyButtonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: normalizeFont(16),
        fontWeight: '700',
        color: 'white',
    }
});

export default PackagingFilter;