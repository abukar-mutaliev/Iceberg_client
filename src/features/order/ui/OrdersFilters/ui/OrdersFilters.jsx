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
    StatusBar,
    ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { DatePickerWheel } from '@shared/ui/Pickers/DatePickerWheel';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { ORDER_DETAILS_CLIENT_DARK_BACKGROUND } from '@shared/ui/OrderDetailsStyles';
import WarehouseService from '@entities/warehouse/api/warehouseApi';
import { districtApi } from '@entities/district/api/districtApi';

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
                           embeddedInDarkHeader = false,
                           integratedInHeader = false,
                           style
                       }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(
        () => createStyles(colors, isDark, embeddedInDarkHeader, integratedInHeader),
        [colors, isDark, embeddedInDarkHeader, integratedInHeader]
    );
    const accentColor = colors.primary;
    const mutedIconColor = embeddedInDarkHeader ? 'rgba(255, 255, 255, 0.7)' : colors.textTertiary;
    const inputTextColor = embeddedInDarkHeader ? '#FFFFFF' : colors.textPrimary;
    const placeholderColor = embeddedInDarkHeader ? 'rgba(255, 255, 255, 0.55)' : colors.textTertiary;
    const onPrimaryColor = '#FFFFFF';
    const [isExpanded, setIsExpanded] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [localFilters, setLocalFilters] = useState(filters);
    const advancedScrollRef = useRef(null);
    const searchInputRef = useRef(null);
    const searchValueRef = useRef(filters.search || '');

    // Состояние для календарей
    const [showDateFromPicker, setShowDateFromPicker] = useState(false);
    const [showDateToPicker, setShowDateToPicker] = useState(false);
    const [warehouses, setWarehouses] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [optionsLoading, setOptionsLoading] = useState(false);
    const [optionsError, setOptionsError] = useState('');
    const [activePicker, setActivePicker] = useState(null);
    const [pickerQuery, setPickerQuery] = useState('');

    // Синхронизация с внешними фильтрами
    useEffect(() => {
        setLocalFilters(filters);
        searchValueRef.current = filters.search || '';
    }, [filters]);

    useEffect(() => {
        if (type !== 'staff') return undefined;

        let active = true;

        const loadOptions = async () => {
            setOptionsLoading(true);
            setOptionsError('');

            try {
                const [warehouseResult, districtResult] = await Promise.all([
                    WarehouseService.getWarehouses({ limit: 100, page: 1 }),
                    districtApi.getAllDistricts(),
                ]);

                if (!active) return;

                let warehouseList = warehouseResult?.data?.warehouses || [];
                const pages = warehouseResult?.data?.pagination?.pages || 1;

                if (pages > 1) {
                    const rest = await Promise.all(
                        Array.from({ length: pages - 1 }, (_, index) =>
                            WarehouseService.getWarehouses({ limit: 100, page: index + 2 })
                        )
                    );
                    if (!active) return;
                    warehouseList = warehouseList.concat(
                        ...rest.map((page) => page?.data?.warehouses || [])
                    );
                }

                const districtPayload = districtResult?.data;
                const districtList = Array.isArray(districtPayload)
                    ? districtPayload
                    : (districtPayload?.data || []);

                const byName = (left, right) => (left.name || '').localeCompare(right.name || '', 'ru');

                setWarehouses([...warehouseList].sort(byName));
                setDistricts([...districtList].sort(byName));
            } catch {
                if (active) setOptionsError('Не удалось загрузить склады и районы');
            } finally {
                if (active) setOptionsLoading(false);
            }
        };

        loadOptions();

        return () => {
            active = false;
        };
    }, [type]);

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

    const openPicker = useCallback((picker) => {
        setPickerQuery('');
        setActivePicker(picker);
    }, []);

    const closePicker = useCallback(() => {
        setPickerQuery('');
        setActivePicker(null);
    }, []);

    const handleWarehouseSelect = useCallback((id) => {
        handleFilterChange('warehouseId', id ? Number(id) : '');
        closePicker();
    }, [handleFilterChange, closePicker]);

    const handleDistrictSelect = useCallback((id) => {
        handleFilterChange('districtId', id ? Number(id) : '');
        closePicker();
    }, [handleFilterChange, closePicker]);

    const selectedWarehouseName = useMemo(() => {
        const match = warehouses.find((item) => String(item.id) === String(localFilters.warehouseId));
        return match?.name || '';
    }, [warehouses, localFilters.warehouseId]);

    const selectedDistrictName = useMemo(() => {
        const match = districts.find((item) => String(item.id) === String(localFilters.districtId));
        return match?.name || '';
    }, [districts, localFilters.districtId]);

    // Рендер поиска
    const renderSearchInput = useCallback(() => (
        <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
                <Icon name="search" size={20} color={accentColor} style={styles.searchIcon} />
                <TextInput
                    ref={searchInputRef}
                    style={[styles.searchInput, { color: inputTextColor }]}
                    placeholder="Поиск по номеру, клиенту, адресу..."
                    placeholderTextColor={placeholderColor}
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
                        <Icon name="clear" size={18} color={mutedIconColor} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    ), [handleSearchChange, handleClearSearch, styles, accentColor, inputTextColor, placeholderColor, mutedIconColor]);

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
                                color={localFilters[filter.key] ? onPrimaryColor : filter.color}
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
                            color={localFilters.status ? onPrimaryColor : accentColor}
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
    }, [type, localFilters, handleFilterChange, handleOpenStatusModal, styles, accentColor, onPrimaryColor]);

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
                            <Icon name="date-range" size={20} color={accentColor} />
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
                            <Text style={[styles.filterGroupTitle, { fontSize: 20, color: accentColor }]}>₽</Text>
                            <Text style={styles.filterGroupTitle}>Сумма заказа</Text>
                        </View>
                        <View style={styles.amountInputsContainer}>
                            <View style={styles.amountInputGroup}>
                                <Text style={styles.amountInputLabel}>От:</Text>
                                <View style={styles.amountInputContainer}>
                                    <Text style={[styles.amountInput, { fontSize: 16, color: mutedIconColor, marginRight: 8 }]}>₽</Text>
                                    <TextInput
                                        style={[styles.amountInput, { color: inputTextColor }]}
                                        placeholder="0"
                                        placeholderTextColor={placeholderColor}
                                        value={localFilters.minAmount || ''}
                                        onChangeText={handleMinAmountChange}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                            <View style={styles.amountInputGroup}>
                                <Text style={styles.amountInputLabel}>До:</Text>
                                <View style={styles.amountInputContainer}>
                                    <Text style={[styles.amountInput, { fontSize: 16, color: mutedIconColor, marginRight: 8 }]}>₽</Text>
                                    <TextInput
                                        style={[styles.amountInput, { color: inputTextColor }]}
                                        placeholder="∞"
                                        placeholderTextColor={placeholderColor}
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
                                    <Icon name="store" size={20} color={accentColor} />
                                    <Text style={styles.filterGroupTitle}>Склад</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.textInputContainer}
                                    onPress={() => openPicker('warehouse')}
                                    activeOpacity={0.7}
                                >
                                    <Icon name="store" size={16} color={mutedIconColor} />
                                    <Text
                                        style={[
                                            styles.textInput,
                                            { color: selectedWarehouseName ? inputTextColor : placeholderColor }
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {selectedWarehouseName || 'Все склады'}
                                    </Text>
                                    <Icon name="expand-more" size={20} color={mutedIconColor} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.filterGroup}>
                                <View style={styles.filterGroupHeader}>
                                    <Icon name="location-city" size={20} color={accentColor} />
                                    <Text style={styles.filterGroupTitle}>Район</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.textInputContainer}
                                    onPress={() => openPicker('district')}
                                    activeOpacity={0.7}
                                >
                                    <Icon name="location-city" size={16} color={mutedIconColor} />
                                    <Text
                                        style={[
                                            styles.textInput,
                                            { color: selectedDistrictName ? inputTextColor : placeholderColor }
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {selectedDistrictName || 'Все районы'}
                                    </Text>
                                    <Icon name="expand-more" size={20} color={mutedIconColor} />
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>
        );
    }, [isExpanded, type, localFilters, showDateFromPicker, showDateToPicker, handleDateFromChange, handleDateToChange, handleMinAmountChange, handleMaxAmountChange, openPicker, selectedWarehouseName, selectedDistrictName, styles, accentColor, mutedIconColor, inputTextColor, placeholderColor]);

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
                            <Icon name="tune" size={24} color={accentColor} />
                            <Text style={styles.modalTitle}>Выберите статус</Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleCloseStatusModal}
                            style={styles.modalCloseButton}
                            activeOpacity={0.7}
                        >
                            <Icon name="close" size={24} color={mutedIconColor} />
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
                                    <Icon name="all-inclusive" size={20} color={accentColor} />
                                </View>
                                <Text style={[
                                    styles.statusOptionText,
                                    !localFilters.status && styles.statusOptionTextSelected
                                ]}>
                                    Все статусы
                                </Text>
                            </View>
                            {!localFilters.status && (
                                <Icon name="check" size={20} color={accentColor} />
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
                                    <Icon name="check" size={20} color={accentColor} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    ), [showStatusModal, handleCloseStatusModal, localFilters, handleStatusSelect, styles, accentColor, mutedIconColor]);

    const renderOptionPicker = useCallback(() => {
        const isWarehouse = activePicker === 'warehouse';
        const source = isWarehouse ? warehouses : districts;
        const selectedId = isWarehouse ? localFilters.warehouseId : localFilters.districtId;
        const query = pickerQuery.trim().toLowerCase();
        const options = query
            ? source.filter((item) => (item.name || '').toLowerCase().includes(query))
            : source;
        const onSelect = isWarehouse ? handleWarehouseSelect : handleDistrictSelect;

        return (
            <Modal
                visible={Boolean(activePicker)}
                transparent
                animationType="slide"
                onRequestClose={closePicker}
                statusBarTranslucent
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalTitleContainer}>
                                <Icon
                                    name={isWarehouse ? 'store' : 'location-city'}
                                    size={24}
                                    color={accentColor}
                                />
                                <Text style={styles.modalTitle}>
                                    {isWarehouse ? 'Выберите склад' : 'Выберите район'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={closePicker}
                                style={styles.modalCloseButton}
                                activeOpacity={0.7}
                            >
                                <Icon name="close" size={24} color={mutedIconColor} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.pickerSearch}>
                            <Icon name="search" size={18} color={mutedIconColor} />
                            <TextInput
                                style={[styles.textInput, { color: colors.textPrimary }]}
                                placeholder="Поиск по названию"
                                placeholderTextColor={colors.textTertiary}
                                value={pickerQuery}
                                onChangeText={setPickerQuery}
                            />
                        </View>

                        <ScrollView
                            style={styles.statusList}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="always"
                        >
                            {optionsLoading ? (
                                <ActivityIndicator color={accentColor} style={styles.pickerState} />
                            ) : optionsError ? (
                                <Text style={styles.pickerStateText}>{optionsError}</Text>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={[
                                            styles.statusOption,
                                            !selectedId && styles.statusOptionSelected
                                        ]}
                                        onPress={() => onSelect(null)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.statusOptionContent}>
                                            <Text style={[
                                                styles.statusOptionText,
                                                !selectedId && styles.statusOptionTextSelected
                                            ]}>
                                                {isWarehouse ? 'Все склады' : 'Все районы'}
                                            </Text>
                                        </View>
                                        {!selectedId && (
                                            <Icon name="check" size={20} color={accentColor} />
                                        )}
                                    </TouchableOpacity>

                                    {options.map((item) => {
                                        const isSelected = String(item.id) === String(selectedId);
                                        return (
                                            <TouchableOpacity
                                                key={item.id}
                                                style={[
                                                    styles.statusOption,
                                                    isSelected && styles.statusOptionSelected
                                                ]}
                                                onPress={() => onSelect(item.id)}
                                                activeOpacity={0.8}
                                            >
                                                <View style={styles.statusOptionContent}>
                                                    <Text
                                                        style={[
                                                            styles.statusOptionText,
                                                            isSelected && styles.statusOptionTextSelected
                                                        ]}
                                                        numberOfLines={2}
                                                    >
                                                        {item.name}
                                                    </Text>
                                                </View>
                                                {isSelected && (
                                                    <Icon name="check" size={20} color={accentColor} />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}

                                    {options.length === 0 && (
                                        <Text style={styles.pickerStateText}>Ничего не найдено</Text>
                                    )}
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        );
    }, [
        activePicker,
        warehouses,
        districts,
        localFilters.warehouseId,
        localFilters.districtId,
        pickerQuery,
        optionsLoading,
        optionsError,
        handleWarehouseSelect,
        handleDistrictSelect,
        closePicker,
        styles,
        accentColor,
        mutedIconColor,
        colors.textPrimary,
        colors.textTertiary,
    ]);

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
                        color={accentColor}
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
                        <Icon name="clear-all" size={16} color={colors.error} />
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
            {renderOptionPicker()}
        </View>
    );
});

const createStyles = (colors, isDark, embeddedInDarkHeader, integratedInHeader = false) => {
    const embedded = embeddedInDarkHeader && isDark;
    const flushWithHeader = integratedInHeader || embedded;
    const fieldBackground = embedded ? 'rgba(255, 255, 255, 0.12)' : (colors.surfaceSecondary || colors.surface);
    const fieldBorder = embedded ? 'rgba(255, 255, 255, 0.2)' : colors.border;
    const panelBackground = embedded ? 'rgba(255, 255, 255, 0.08)' : (colors.surfaceSecondary || colors.surface);
    const titleColor = embedded ? '#FFFFFF' : colors.textPrimary;
    const secondaryText = embedded ? 'rgba(255, 255, 255, 0.75)' : colors.textSecondary;
    const tertiaryText = embedded ? 'rgba(255, 255, 255, 0.65)' : colors.textTertiary;

    return StyleSheet.create({
    container: {
        backgroundColor: flushWithHeader ? 'transparent' : colors.cardBackground,
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingBottom: 24,
        shadowColor: flushWithHeader ? 'transparent' : colors.primary,
        shadowOffset: { width: 0, height: flushWithHeader ? 0 : 4 },
        shadowOpacity: flushWithHeader ? 0 : 0.1,
        shadowRadius: flushWithHeader ? 0 : 12,
        elevation: flushWithHeader ? 0 : 8,
    },

    // Поиск
    searchContainer: {
        marginBottom: 16,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: fieldBackground,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 48,
        borderWidth: 1,
        borderColor: fieldBorder,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
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
        backgroundColor: embedded ? fieldBackground : '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: fieldBorder,
        gap: 6,
        shadowColor: '#1A2140',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: embedded ? 0 : 0.04,
        shadowRadius: 3,
        elevation: embedded ? 0 : 1,
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
        backgroundColor: embedded ? fieldBackground : '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: fieldBorder,
        gap: 6,
        minWidth: 100,
        shadowColor: '#1A2140',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: embedded ? 0 : 0.04,
        shadowRadius: 3,
        elevation: embedded ? 0 : 1,
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
        color: embedded ? '#FFFFFF' : colors.primary,
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
        backgroundColor: embedded ? 'transparent' : '#FFFFFF',
        borderRadius: 12,
        borderWidth: embedded ? 0 : 1,
        borderColor: embedded ? 'transparent' : colors.border,
        shadowColor: '#1A2140',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: embedded ? 0 : 0.04,
        shadowRadius: 3,
        elevation: embedded ? 0 : 1,
    },
    expandButtonText: {
        fontSize: 14,
        color: embedded ? '#FFFFFF' : colors.primary,
        fontWeight: '600',
    },
    clearFiltersButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: embedded ? 'rgba(239, 83, 80, 0.15)' : (colors.errorSoft || '#ffebee'),
        borderRadius: 12,
        borderWidth: 1,
        borderColor: embedded ? 'rgba(239, 83, 80, 0.35)' : (colors.errorBorder || '#ffcdd2'),
    },
    clearFiltersText: {
        fontSize: 12,
        color: colors.error,
        fontWeight: '600',
    },

    // Расширенные фильтры
    advancedFiltersContainer: {
        backgroundColor: flushWithHeader ? 'transparent' : panelBackground,
        borderRadius: 16,
        marginTop: 12,
        borderWidth: flushWithHeader ? 0 : 1,
        borderColor: fieldBorder,
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
        color: titleColor,
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
        color: secondaryText,
        fontWeight: '600',
    },
    dateInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: embedded ? 'rgba(255, 255, 255, 0.1)' : colors.cardBackground,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: fieldBorder,
        gap: 8,
    },
    dateInput: {
        flex: 1,
        fontSize: 14,
        color: titleColor,
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
        color: secondaryText,
        fontWeight: '600',
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: embedded ? 'rgba(255, 255, 255, 0.1)' : colors.cardBackground,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: fieldBorder,
        gap: 8,
    },
    amountInput: {
        flex: 1,
        fontSize: 14,
        paddingVertical: 0,
    },

    // Текстовые инпуты
    textInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: embedded ? 'rgba(255, 255, 255, 0.1)' : colors.cardBackground,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: fieldBorder,
        gap: 8,
    },
    textInput: {
        flex: 1,
        fontSize: 14,
        paddingVertical: 0,
    },
    pickerSearch: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 24,
        marginBottom: 12,
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        gap: 8,
    },
    pickerState: {
        marginVertical: 24,
    },
    pickerStateText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginVertical: 24,
    },

    // Модальное окно
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay || 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.cardBackground,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: height * 0.8,
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: isDark ? 0.3 : 0.1,
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
        color: colors.textPrimary,
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
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statusOptionSelected: {
        backgroundColor: colors.primarySoft || (colors.primary + '14'),
        borderColor: colors.primary,
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
        backgroundColor: colors.surfaceSecondary || colors.surface,
    },
    statusOptionText: {
        fontSize: 16,
        color: colors.textPrimary,
        fontWeight: '500',
        flex: 1,
    },
    statusOptionTextSelected: {
        color: colors.primary,
        fontWeight: '700',
    },
});
};
