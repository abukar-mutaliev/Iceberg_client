import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    ScrollView,
    Dimensions,
    StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { DatePickerWheel } from '@shared/ui/Pickers/DatePickerWheel';

const { width, height } = Dimensions.get('window');

// Константы статусов заказов
const ORDER_STATUSES = {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    IN_DELIVERY: 'IN_DELIVERY',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
    RETURNED: 'RETURNED'
};

const ORDER_STATUS_LABELS = {
    'PENDING': 'Ожидает обработки',
    'CONFIRMED': 'Подтвержден',
    'IN_DELIVERY': 'В доставке',
    'DELIVERED': 'Доставлен',
    'CANCELLED': 'Отменен',
    'RETURNED': 'Возвращен'
};

const ORDER_STATUS_COLORS = {
    PENDING: '#FFA726',
    CONFIRMED: '#42A5F5', 
    IN_DELIVERY: '#5C6BC0',
    DELIVERED: '#66BB6A',
    CANCELLED: '#EF5350',
    RETURNED: '#78909C'
};

const ORDER_STATUS_ICONS = {
    PENDING: 'schedule',
    CONFIRMED: 'check-circle',
    IN_DELIVERY: 'local-shipping',
    DELIVERED: 'done-all',
    CANCELLED: 'cancel',
    RETURNED: 'undo'
};

/**
 * Компонент фильтров для заказов
 * @param {Object} props
 * @param {string} props.type - Тип фильтров ('my' | 'staff')
 * @param {Object} props.filters - Текущие фильтры
 * @param {Function} props.onFiltersChange - Обработчик изменения фильтров
 * @param {Function} props.onFiltersExpandedChange - Обработчик изменения состояния расширения
 * @param {Object} props.style - Дополнительные стили
 */
export const OrdersFilters = React.memo(({
                           type = 'my',
                           filters = {},
                           onFiltersChange,
                           onFiltersExpandedChange,
                           style
                       }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [localFilters, setLocalFilters] = useState(filters);
    const advancedScrollRef = useRef(null);
    const searchInputRef = useRef(null);
    const searchValueRef = useRef(filters.search || '');

    // Состояние для календарей
    const [showDateFromPicker, setShowDateFromPicker] = useState(false);
    const [showDateToPicker, setShowDateToPicker] = useState(false);

    // Синхронизация с внешними фильтрами
    useEffect(() => {
        setLocalFilters(filters);
        searchValueRef.current = filters.search || '';
    }, [filters]);

    // Количество активных фильтров
    const activeFiltersCount = useMemo(() => {
        return Object.keys(localFilters).filter(key => {
            const value = localFilters[key];
            return value !== null && value !== undefined && value !== '' && value !== false;
        }).length;
    }, [localFilters]);

    // Обработчик изменения фильтра
    const handleFilterChange = useCallback((key, value) => {
        setLocalFilters(prevFilters => {
            const newFilters = { ...prevFilters, [key]: value };
            onFiltersChange?.(newFilters);
            return newFilters;
        });
    }, [onFiltersChange]);

    // Обработчик очистки фильтров
    const handleClearFilters = useCallback(() => {
        const clearedFilters = {};
        setLocalFilters(clearedFilters);
        onFiltersChange?.(clearedFilters);
    }, [onFiltersChange]);

    // Обработчик выбора статуса
    const handleStatusSelect = useCallback((status) => {
        handleFilterChange('status', status);
        setShowStatusModal(false);
    }, [handleFilterChange]);

    // Обработчик очистки поиска
    const handleClearSearch = useCallback(() => {
        searchValueRef.current = '';
        handleFilterChange('search', '');
    }, [handleFilterChange]);

    // Обработчик изменения поиска
    const handleSearchChange = useCallback((text) => {
        searchValueRef.current = text;
        handleFilterChange('search', text);
    }, [handleFilterChange]);

    // Обработчик переключения расширенных фильтров
    const handleToggleExpanded = useCallback(() => {
        const newExpanded = !isExpanded;
        setIsExpanded(newExpanded);
        onFiltersExpandedChange?.(newExpanded);
    }, [isExpanded, onFiltersExpandedChange]);

    // Обработчик открытия модала статусов
    const handleOpenStatusModal = useCallback(() => {
        setShowStatusModal(true);
    }, []);

    // Обработчик закрытия модала статусов
    const handleCloseStatusModal = useCallback(() => {
        setShowStatusModal(false);
    }, []);

    // Обработчики для календарей
    const handleDateFromChange = useCallback((date) => {
        // Конвертируем Date в строку формата YYYY-MM-DD
        const dateString = date ? date.toISOString().split('T')[0] : '';
        handleFilterChange('dateFrom', dateString);
        setShowDateFromPicker(false);
    }, [handleFilterChange]);

    const handleDateToChange = useCallback((date) => {
        // Конвертируем Date в строку формата YYYY-MM-DD
        const dateString = date ? date.toISOString().split('T')[0] : '';
        handleFilterChange('dateTo', dateString);
        setShowDateToPicker(false);
    }, [handleFilterChange]);

    // Хелперы для работы с датами
    const parseDateString = (dateString) => {
        return dateString ? new Date(dateString) : null;
    };

    const formatDateForDisplay = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const handleMinAmountChange = useCallback((text) => {
        handleFilterChange('minAmount', text);
    }, [handleFilterChange]);

    const handleMaxAmountChange = useCallback((text) => {
        handleFilterChange('maxAmount', text);
    }, [handleFilterChange]);

    const handleWarehouseIdChange = useCallback((text) => {
        handleFilterChange('warehouseId', text);
    }, [handleFilterChange]);

    const handleDistrictIdChange = useCallback((text) => {
        handleFilterChange('districtId', text);
    }, [handleFilterChange]);

    // Рендер поиска
    const renderSearchInput = useCallback(() => (
        <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
                <Icon name="search" size={20} color="#667eea" style={styles.searchIcon} />
                <TextInput
                    ref={searchInputRef}
                    style={styles.searchInput}
                    placeholder="Поиск по номеру, клиенту, адресу..."
                    placeholderTextColor="#a0aec0"
                    value={searchValueRef.current}
                    onChangeText={handleSearchChange}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                    keyboardShouldPersistTaps="handled"
                />
                {searchValueRef.current && (
                    <TouchableOpacity
                        onPress={handleClearSearch}
                        style={styles.clearSearchButton}
                        activeOpacity={0.7}
                    >
                        <Icon name="clear" size={18} color="#a0aec0" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    ), [handleSearchChange, handleClearSearch]);

    // Рендер быстрых фильтров
    const renderQuickFilters = useCallback(() => {
        const quickFilters = type === 'staff' ? [
            { key: 'priority', label: 'Срочные', icon: 'priority-high', color: '#ff6b6b' },
            { key: 'assignedToMe', label: 'Мои', icon: 'person', color: '#4caf50' },
        ] : [
            { key: 'recent', label: 'Недавние', icon: 'schedule', color: '#667eea' },
        ];

        return (
            <View style={styles.quickFiltersContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.quickFiltersContent}
                    keyboardShouldPersistTaps="always"
                >
                    {quickFilters.map((filter) => (
                        <TouchableOpacity
                            key={filter.key}
                            style={[
                                styles.quickFilterButton,
                                localFilters[filter.key] && [
                                    styles.quickFilterButtonActive,
                                    { backgroundColor: filter.color }
                                ]
                            ]}
                            onPress={() => handleFilterChange(filter.key, !localFilters[filter.key])}
                            activeOpacity={0.8}
                        >
                            <Icon
                                name={filter.icon}
                                size={16}
                                color={localFilters[filter.key] ? '#ffffff' : filter.color}
                            />
                            <Text style={[
                                styles.quickFilterText,
                                localFilters[filter.key] && styles.quickFilterTextActive,
                                !localFilters[filter.key] && { color: filter.color }
                            ]}>
                                {filter.label}
                            </Text>
                        </TouchableOpacity>
                    ))}

                    {/* Статус */}
                    <TouchableOpacity
                        style={[
                            styles.statusFilterButton,
                            localFilters.status && [
                                styles.statusFilterButtonActive,
                                { backgroundColor: ORDER_STATUS_COLORS[localFilters.status] }
                            ]
                        ]}
                        onPress={handleOpenStatusModal}
                        activeOpacity={0.8}
                    >
                        <Icon
                            name={localFilters.status ? ORDER_STATUS_ICONS[localFilters.status] : 'tune'}
                            size={16}
                            color={localFilters.status ? '#ffffff' : '#667eea'}
                        />
                        <Text style={[
                            styles.statusFilterText,
                            localFilters.status && styles.statusFilterTextActive
                        ]}>
                            {localFilters.status ? ORDER_STATUS_LABELS[localFilters.status] : 'Статус'}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }, [type, localFilters, handleFilterChange, handleOpenStatusModal]);

    // Рендер расширенных фильтров
    const renderAdvancedFilters = useCallback(() => {
        if (!isExpanded) return null;

        return (
            <ScrollView
                style={styles.advancedFiltersContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                nestedScrollEnabled={true}
                ref={advancedScrollRef}
            >
                <View style={styles.advancedFiltersContent}>
                    {/* Период */}
                    <View style={styles.filterGroup}>
                        <View style={styles.filterGroupHeader}>
                            <Icon name="date-range" size={20} color="#667eea" />
                            <Text style={styles.filterGroupTitle}>Период</Text>
                        </View>
                        <View style={styles.dateInputsContainer}>
                            <View style={styles.dateInputGroup}>
                                <Text style={styles.dateInputLabel}>От:</Text>
                                <DatePickerWheel
                                    date={parseDateString(localFilters.dateFrom)}
                                    onDateChange={handleDateFromChange}
                                    visible={showDateFromPicker}
                                    onCancel={() => setShowDateFromPicker(false)}
                                    onPress={() => setShowDateFromPicker(true)}
                                />
                            </View>
                            <View style={styles.dateInputGroup}>
                                <Text style={styles.dateInputLabel}>До:</Text>
                                <DatePickerWheel
                                    date={parseDateString(localFilters.dateTo)}
                                    onDateChange={handleDateToChange}
                                    visible={showDateToPicker}
                                    onCancel={() => setShowDateToPicker(false)}
                                    onPress={() => setShowDateToPicker(true)}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Сумма заказа */}
                    <View style={styles.filterGroup}>
                        <View style={styles.filterGroupHeader}>
                            <Icon name="attach-money" size={20} color="#667eea" />
                            <Text style={styles.filterGroupTitle}>Сумма заказа</Text>
                        </View>
                        <View style={styles.amountInputsContainer}>
                            <View style={styles.amountInputGroup}>
                                <Text style={styles.amountInputLabel}>От:</Text>
                                <View style={styles.amountInputContainer}>
                                    <Icon name="attach-money" size={16} color="#a0aec0" />
                                    <TextInput
                                        style={styles.amountInput}
                                        placeholder="0"
                                        placeholderTextColor="#a0aec0"
                                        value={localFilters.minAmount || ''}
                                        onChangeText={handleMinAmountChange}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                            <View style={styles.amountInputGroup}>
                                <Text style={styles.amountInputLabel}>До:</Text>
                                <View style={styles.amountInputContainer}>
                                    <Icon name="attach-money" size={16} color="#a0aec0" />
                                    <TextInput
                                        style={styles.amountInput}
                                        placeholder="∞"
                                        placeholderTextColor="#a0aec0"
                                        value={localFilters.maxAmount || ''}
                                        onChangeText={handleMaxAmountChange}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Дополнительные фильтры для персонала */}
                    {type === 'staff' && (
                        <>
                            <View style={styles.filterGroup}>
                                <View style={styles.filterGroupHeader}>
                                    <Icon name="store" size={20} color="#667eea" />
                                    <Text style={styles.filterGroupTitle}>Склад</Text>
                                </View>
                                <View style={styles.textInputContainer}>
                                    <Icon name="store" size={16} color="#a0aec0" />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="ID склада"
                                        placeholderTextColor="#a0aec0"
                                        value={localFilters.warehouseId || ''}
                                        onChangeText={handleWarehouseIdChange}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <View style={styles.filterGroup}>
                                <View style={styles.filterGroupHeader}>
                                    <Icon name="location-city" size={20} color="#667eea" />
                                    <Text style={styles.filterGroupTitle}>Район</Text>
                                </View>
                                <View style={styles.textInputContainer}>
                                    <Icon name="location-city" size={16} color="#a0aec0" />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="ID района"
                                        placeholderTextColor="#a0aec0"
                                        value={localFilters.districtId || ''}
                                        onChangeText={handleDistrictIdChange}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>
        );
    }, [isExpanded, type, localFilters, showDateFromPicker, showDateToPicker, handleDateFromChange, handleDateToChange, handleMinAmountChange, handleMaxAmountChange, handleWarehouseIdChange, handleDistrictIdChange]);

    // Рендер модального окна выбора статуса
    const renderStatusModal = useCallback(() => (
        <Modal
            visible={showStatusModal}
            transparent
            animationType="slide"
            onRequestClose={handleCloseStatusModal}
            statusBarTranslucent
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <View style={styles.modalTitleContainer}>
                            <Icon name="tune" size={24} color="#667eea" />
                            <Text style={styles.modalTitle}>Выберите статус</Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleCloseStatusModal}
                            style={styles.modalCloseButton}
                            activeOpacity={0.7}
                        >
                            <Icon name="close" size={24} color="#a0aec0" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.statusList}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="always"
                    >
                        <TouchableOpacity
                            style={[
                                styles.statusOption,
                                !localFilters.status && styles.statusOptionSelected
                            ]}
                            onPress={() => handleStatusSelect(null)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.statusOptionContent}>
                                <View style={styles.statusIconContainer}>
                                    <Icon name="all-inclusive" size={20} color="#667eea" />
                                </View>
                                <Text style={[
                                    styles.statusOptionText,
                                    !localFilters.status && styles.statusOptionTextSelected
                                ]}>
                                    Все статусы
                                </Text>
                            </View>
                            {!localFilters.status && (
                                <Icon name="check" size={20} color="#667eea" />
                            )}
                        </TouchableOpacity>

                        {Object.values(ORDER_STATUSES).map((status) => (
                            <TouchableOpacity
                                key={status}
                                style={[
                                    styles.statusOption,
                                    localFilters.status === status && styles.statusOptionSelected
                                ]}
                                onPress={() => handleStatusSelect(status)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.statusOptionContent}>
                                    <View style={[
                                        styles.statusIconContainer,
                                        { backgroundColor: ORDER_STATUS_COLORS[status] + '20' }
                                    ]}>
                                        <Icon 
                                            name={ORDER_STATUS_ICONS[status]} 
                                            size={20} 
                                            color={ORDER_STATUS_COLORS[status]} 
                                        />
                                    </View>
                                    <Text style={[
                                        styles.statusOptionText,
                                        localFilters.status === status && styles.statusOptionTextSelected
                                    ]}>
                                        {ORDER_STATUS_LABELS[status]}
                                    </Text>
                                </View>
                                {localFilters.status === status && (
                                    <Icon name="check" size={20} color="#667eea" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    ), [showStatusModal, handleCloseStatusModal, localFilters, handleStatusSelect]);

    return (
        <View style={[styles.container, style]}>
            {/* Поиск */}
            {renderSearchInput()}

            {/* Быстрые фильтры */}
            {renderQuickFilters()}

            {/* Кнопки управления */}
            <View style={styles.controlsContainer}>
                <TouchableOpacity
                    style={styles.expandButton}
                    onPress={handleToggleExpanded}
                    activeOpacity={0.7}
                >
                    <Icon
                        name={isExpanded ? "expand-less" : "expand-more"}
                        size={20}
                        color="#667eea"
                    />
                    <Text style={styles.expandButtonText}>
                        {isExpanded ? 'Скрыть фильтры' : 'Больше фильтров'}
                    </Text>
                </TouchableOpacity>

                {activeFiltersCount > 0 && (
                    <TouchableOpacity
                        style={styles.clearFiltersButton}
                        onPress={handleClearFilters}
                        activeOpacity={0.7}
                    >
                        <Icon name="clear-all" size={16} color="#EF5350" />
                        <Text style={styles.clearFiltersText}>
                            Очистить ({activeFiltersCount})
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Расширенные фильтры */}
            {renderAdvancedFilters()}

            {/* Модальное окно статусов */}
            {renderStatusModal()}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingBottom: 24,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },

    // Поиск
    searchContainer: {
        marginBottom: 16,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9ff',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 48,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#2d3748',
        paddingVertical: 0,
    },
    clearSearchButton: {
        padding: 4,
        marginLeft: 8,
    },

    // Быстрые фильтры
    quickFiltersContainer: {
        marginBottom: 16,
    },
    quickFiltersContent: {
        paddingRight: 20,
        gap: 8,
    },
    quickFilterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#f8f9ff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 6,
    },
    quickFilterButtonActive: {
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    quickFilterText: {
        fontSize: 14,
        fontWeight: '600',
    },
    quickFilterTextActive: {
        color: '#ffffff',
    },
    statusFilterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#f8f9ff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 6,
        minWidth: 100,
    },
    statusFilterButtonActive: {
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statusFilterText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#667eea',
    },
    statusFilterTextActive: {
        color: '#ffffff',
    },

    // Управление
    controlsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    expandButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    expandButtonText: {
        fontSize: 14,
        color: '#667eea',
        fontWeight: '600',
    },
    clearFiltersButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#ffebee',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ffcdd2',
    },
    clearFiltersText: {
        fontSize: 12,
        color: '#EF5350',
        fontWeight: '600',
    },

    // Расширенные фильтры
    advancedFiltersContainer: {
        backgroundColor: '#f8f9ff',
        borderRadius: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        maxHeight: 300,
    },
    advancedFiltersContent: {
        padding: 20,
        gap: 20,
    },
    filterGroup: {
        gap: 12,
    },
    filterGroupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    filterGroupTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2d3748',
    },

    // Инпуты дат
    dateInputsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    dateInputGroup: {
        flex: 1,
        gap: 6,
    },
    dateInputLabel: {
        fontSize: 12,
        color: '#718096',
        fontWeight: '600',
    },
    dateInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 8,
    },
    dateInput: {
        flex: 1,
        fontSize: 14,
        color: '#2d3748',
        paddingVertical: 0,
    },

    // Инпуты сумм
    amountInputsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    amountInputGroup: {
        flex: 1,
        gap: 6,
    },
    amountInputLabel: {
        fontSize: 12,
        color: '#718096',
        fontWeight: '600',
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 8,
    },
    amountInput: {
        flex: 1,
        fontSize: 14,
        color: '#2d3748',
        paddingVertical: 0,
    },

    // Текстовые инпуты
    textInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 8,
    },
    textInput: {
        flex: 1,
        fontSize: 14,
        color: '#2d3748',
        paddingVertical: 0,
    },

    // Модальное окно
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: height * 0.8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
    },
    modalTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2d3748',
    },
    modalCloseButton: {
        padding: 4,
    },
    statusList: {
        maxHeight: height * 0.6,
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    statusOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginBottom: 8,
        backgroundColor: '#f8f9ff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    statusOptionSelected: {
        backgroundColor: '#e3f2fd',
        borderColor: '#667eea',
    },
    statusOptionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    statusIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
    },
    statusOptionText: {
        fontSize: 16,
        color: '#2d3748',
        fontWeight: '500',
        flex: 1,
    },
    statusOptionTextSelected: {
        color: '#667eea',
        fontWeight: '700',
    },
});
