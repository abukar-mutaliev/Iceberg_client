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
import { FontFamily } from '@app/styles/GlobalStyles';

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

// Предварительно заданные составы для мороженого
const PREDEFINED_COMPOSITIONS = [
    { id: 1, name: 'Молоко' },
    { id: 2, name: 'Сливки' },
    { id: 3, name: 'Сахар' },
    { id: 4, name: 'Шоколад' },
    { id: 5, name: 'Ваниль' },
    { id: 6, name: 'Какао' },
    { id: 7, name: 'Клубника' },
    { id: 8, name: 'Карамель' },
    { id: 9, name: 'Орехи' },
    { id: 10, name: 'Миндаль' },
    { id: 11, name: 'Фисташки' },
    { id: 12, name: 'Малина' },
    { id: 13, name: 'Черника' },
    { id: 14, name: 'Мята' },
    { id: 15, name: 'Кокос' }
];

export const CompositionFilter = ({ compositions = [], onChange }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedCompositions, setSelectedCompositions] = useState(compositions);

    // Обработчик выбора состава
    const handleSelectComposition = (composition) => {
        let newSelected;

        if (selectedCompositions.some(c => c.id === composition.id)) {
            // Если состав уже выбран, удаляем его
            newSelected = selectedCompositions.filter(c => c.id !== composition.id);
        } else {
            // Если состав не выбран, добавляем его
            newSelected = [...selectedCompositions, composition];
        }

        setSelectedCompositions(newSelected);
    };

    // Обработчик применения выбранных составов
    const handleApplyCompositions = () => {
        onChange(selectedCompositions);
        setModalVisible(false);
    };

    // Обработчик сброса всех составов
    const handleClearCompositions = () => {
        setSelectedCompositions([]);
    };

    // Фильтрация составов по поисковому запросу
    const filteredCompositions = searchText.trim()
        ? PREDEFINED_COMPOSITIONS.filter(comp =>
            comp.name.toLowerCase().includes(searchText.toLowerCase())
        )
        : PREDEFINED_COMPOSITIONS;

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.selector}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
            >
                <Text style={styles.selectorText}>Состав</Text>
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

                        <Text style={styles.modalTitle}>Выберите ингредиенты</Text>

                        <TouchableOpacity
                            onPress={handleClearCompositions}
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
                            placeholder="Поиск ингредиентов"
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
                        data={filteredCompositions}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.compositionItem}
                                onPress={() => handleSelectComposition(item)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.compositionName}>{item.name}</Text>
                                <View style={styles.checkbox}>
                                    {selectedCompositions.some(c => c.id === item.id) && (
                                        <View style={styles.checkboxSelected} />
                                    )}
                                </View>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={() => (
                            <Text style={styles.emptyMessage}>Ингредиенты не найдены</Text>
                        )}
                    />

                    <TouchableOpacity
                        style={styles.modalApplyButton}
                        onPress={handleApplyCompositions}
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
    compositionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: normalize(12),
        paddingHorizontal: normalize(16),
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    compositionName: {
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
})