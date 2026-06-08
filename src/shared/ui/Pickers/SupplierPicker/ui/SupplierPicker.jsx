import React, { useEffect, useState, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Modal,
    FlatList,
    ActivityIndicator,
    TextInput,
    TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Color, FontFamily } from "@app/styles/GlobalStyles";
import { useSuppliers } from '@entities/supplier/hooks/useSuppliers';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const SupplierPicker = ({ selectedSupplier, onSelectSupplier, error }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [filteredSuppliers, setFilteredSuppliers] = useState([]);
    const [selectedSupplierName, setSelectedSupplierName] = useState('');
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);


    const {
        suppliersList,
        isLoading,
        getSuppliers,
        getSupplierDetailsById
    } = useSuppliers();

    useEffect(() => {
        if (!suppliersList || suppliersList.length === 0) {
            getSuppliers({ page: 1, limit: 50 });
        }
    }, []);

    useEffect(() => {
        if (modalVisible && (!suppliersList || suppliersList.length === 0)) {
            getSuppliers({ page: 1, limit: 50 });
        }
    }, [modalVisible, suppliersList]);

    useEffect(() => {
        if (searchText) {
            const filtered = suppliersList.filter(supplier =>
                (supplier.name?.toLowerCase() || '').includes(searchText.toLowerCase()) ||
                (supplier.companyName?.toLowerCase() || '').includes(searchText.toLowerCase()) ||
                ((supplier.supplier?.companyName || '').toLowerCase()).includes(searchText.toLowerCase())
            );
            setFilteredSuppliers(filtered);
        } else {
            setFilteredSuppliers(suppliersList);
        }
    }, [searchText, suppliersList]);

    useEffect(() => {
        if (selectedSupplier && suppliersList && suppliersList.length > 0) {
            const supplierName = getSelectedSupplierName();
            setSelectedSupplierName(supplierName);
        } else if (selectedSupplier) {
            const supplier = getSupplierDetailsById(selectedSupplier);
            if (supplier) {
                const name = supplier.supplier?.companyName ||
                    supplier.companyName ||
                    supplier.name ||
                    `Поставщик ID:${selectedSupplier}`;
                setSelectedSupplierName(name);
            }
        }
    }, [selectedSupplier, suppliersList]);

    const getSelectedSupplierName = () => {
        if (!selectedSupplier || !suppliersList || suppliersList.length === 0) return '';

        const supplier = suppliersList.find(s => {
            if (s.supplier && s.supplier.id) {
                return s.supplier.id.toString() === selectedSupplier.toString();
            }
            if (s.id) {
                return s.id.toString() === selectedSupplier.toString();
            }
            return false;
        });

        if (!supplier) {
            console.log('Поставщик не найден в списке:', selectedSupplier);
            return `Поставщик ID:${selectedSupplier}`;
        }

        return supplier.supplier?.companyName ||
            supplier.companyName ||
            supplier.name ||
            `Поставщик ID:${selectedSupplier}`;
    };

    const handleSelectSupplier = (supplier) => {
        let supplierId = '';

        if (supplier.supplier && supplier.supplier.id) {
            supplierId = supplier.supplier.id.toString();
        } else if (supplier.id) {
            supplierId = supplier.id.toString();
        }

        if (supplierId) {
            onSelectSupplier(supplierId);

            const name = supplier.supplier?.companyName ||
                supplier.companyName ||
                supplier.name ||
                `Поставщик ID:${supplierId}`;

            setSelectedSupplierName(name);
        }

        setModalVisible(false);
    };

    const closeModal = () => {
        setModalVisible(false);
        setSearchText(''); // Сбрасываем поиск при закрытии
    };

    const renderSupplierItem = ({ item }) => (
        <TouchableOpacity
            style={styles.supplierItem}
            onPress={() => handleSelectSupplier(item)}
        >
            <Text style={styles.supplierName}>
                {item.supplier?.companyName || item.companyName || item.name || `Поставщик ID:${item.id}`}
            </Text>
            {(item.supplier?.contactPerson || item.contactPerson) && (
                <Text style={styles.supplierInfo}>
                    {item.supplier?.contactPerson || item.contactPerson}
                </Text>
            )}
            {(item.supplier?.phone || item.phone) && (
                <Text style={styles.supplierInfo}>
                    {item.supplier?.phone || item.phone}
                </Text>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Поставщик *</Text>
            <TouchableOpacity
                style={[
                    styles.pickerContainer,
                    error ? styles.pickerError : null
                ]}
                onPress={() => setModalVisible(true)}
            >
                <Text style={[
                    styles.pickerText,
                    !selectedSupplier ? styles.placeholderText : null
                ]}>
                    {selectedSupplierName || (selectedSupplier ? `Поставщик ID:${selectedSupplier}` : 'Выберите поставщика')}
                </Text>
                <Ionicons name="chevron-down" size={13} color={isDark ? colors.textSecondary : '#666'} />
            </TouchableOpacity>
            <View style={[styles.inputUnderline, error ? styles.underlineError : null]} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={closeModal}
            >
                <View style={styles.modalContainer}>
                    {/* Добавлен TouchableWithoutFeedback для закрытия по нажатию на фон */}
                    <TouchableWithoutFeedback onPress={closeModal}>
                        <View style={styles.modalOverlay} />
                    </TouchableWithoutFeedback>

                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Выберите поставщика</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={closeModal}
                            >
                                <Ionicons name="close" size={24} color={isDark ? colors.textPrimary : '#000'} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color={isDark ? colors.textSecondary : '#666'} style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Поиск поставщика"
                                placeholderTextColor={isDark ? colors.textTertiary : '#999'}
                                value={searchText}
                                onChangeText={setSearchText}
                            />
                            {searchText ? (
                                <TouchableOpacity onPress={() => setSearchText('')}>
                                    <Ionicons name="close-circle" size={20} color={isDark ? colors.textSecondary : '#666'} />
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        {isLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text style={styles.loadingText}>Загрузка поставщиков...</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredSuppliers || []}
                                renderItem={renderSupplierItem}
                                keyExtractor={(item) => (item.id ? item.id.toString() : Math.random().toString())}
                                contentContainerStyle={styles.listContainer}
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyText}>
                                            {searchText ? 'Поставщики не найдены' : 'Нет доступных поставщиков'}
                                        </Text>
                                    </View>
                                }
                            />
                        )}

                        {/* Добавлена кнопка закрытия в нижней части модального окна */}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={closeModal}
                            >
                                <Text style={styles.cancelButtonText}>Закрыть</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        marginBottom: 5,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: isDark ? colors.textSecondary : Color.dark,
        opacity: isDark ? 1 : 0.4,
        marginBottom: 0,
        fontFamily: FontFamily.sFProText,
    },
    pickerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 30,
        paddingVertical: 5,
    },
    pickerText: {
        fontSize: 13,
        color: isDark ? colors.textPrimary : Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    placeholderText: {
        color: isDark ? colors.textTertiary : '#999',
    },
    pickerError: {
        borderColor: colors.error,
    },
    inputUnderline: {
        height: 1,
        backgroundColor: isDark ? colors.border : '#000',
        marginTop: 0,
    },
    underlineError: {
        backgroundColor: colors.error,
        height: 1.5,
    },
    errorText: {
        color: colors.error,
        fontSize: 12,
        marginTop: 5,
        fontFamily: FontFamily.sFProText,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.modalOverlay,
    },
    modalContent: {
        backgroundColor: isDark ? colors.surface : 'white',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        height: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? colors.border : '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
    },
    closeButton: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? colors.surfaceElevated : '#f5f5f5',
        borderRadius: 8,
        margin: 16,
        paddingHorizontal: 10,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 40,
        fontSize: 16,
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingBottom: 80, // Увеличиваем отступ для размещения кнопки закрытия
    },
    supplierItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? colors.border : '#eee',
    },
    supplierName: {
        fontSize: 16,
        fontWeight: '500',
        color: isDark ? colors.textPrimary : Color.dark,
        fontFamily: FontFamily.sFProText,
        marginBottom: 4,
    },
    supplierInfo: {
        fontSize: 14,
        color: isDark ? colors.textSecondary : '#666',
        fontFamily: FontFamily.sFProText,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: isDark ? colors.textSecondary : '#666',
        fontFamily: FontFamily.sFProText,
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: isDark ? colors.textSecondary : '#666',
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
    },
    // Стили для кнопки закрытия в нижней части
    buttonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: isDark ? colors.surface : 'white',
        borderTopWidth: 1,
        borderTopColor: isDark ? colors.border : '#eee',
    },
    cancelButton: {
        backgroundColor: isDark ? colors.primary : '#3B43A2',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
    }
});

export { SupplierPicker };