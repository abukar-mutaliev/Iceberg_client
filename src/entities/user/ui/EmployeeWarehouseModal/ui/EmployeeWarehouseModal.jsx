import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import { useWarehouses } from '@entities/warehouse/hooks/useWarehouses';
import { employeeApi } from '@entities/user/api/userApi';
import IconClose from '@shared/ui/Icon/Profile/CloseIcon';
import IconWarehouse from '@shared/ui/Icon/Warehouse/IconWarehouse';
import { MapPinIcon } from '@shared/ui/Icon/DistrictManagement/MapPinIcon';

export const EmployeeWarehouseModal = ({ visible, employee, onClose, onSuccess }) => {
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    const { warehouses, loading: isLoading, refreshWarehouses } = useWarehouses({ autoLoad: true });

    useEffect(() => {
        if (visible && employee) {
            // Инициализация из массива warehouses (новый формат) или warehouseId (старый)
            const initial = employee.warehouses?.map(w => w.id) ||
                (employee.warehouseId ? [employee.warehouseId] : []);
            setSelectedIds(initial);
            if (warehouses.length === 0) {
                refreshWarehouses();
            }
        }
    }, [visible, employee]);

    const toggleWarehouse = useCallback((id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    }, []);

    const handleSelectAll = () => setSelectedIds(warehouses.map(w => w.id));
    const handleClearAll = () => setSelectedIds([]);

    const handleSave = async () => {
        if (!employee) return;

        try {
            setIsSaving(true);
            await employeeApi.updateEmployeeWarehouse(employee.id, selectedIds);
            Alert.alert(
                'Склады обновлены',
                `Назначено складов: ${selectedIds.length}`,
                [{ text: 'OK', onPress: () => { onSuccess?.(); onClose(); } }]
            );
        } catch (error) {
            console.error('Ошибка обновления складов:', error);
            Alert.alert('Ошибка', 'Не удалось обновить склады сотрудника');
        } finally {
            setIsSaving(false);
        }
    };

    const renderWarehouseItem = ({ item }) => {
        const isSelected = selectedIds.includes(item.id);
        return (
            <TouchableOpacity
                style={[styles.warehouseItem, isSelected && styles.selectedWarehouseItem]}
                onPress={() => toggleWarehouse(item.id)}
                activeOpacity={0.7}
            >
                <View style={styles.warehouseHeader}>
                    <View style={[styles.warehouseIcon, isSelected && styles.selectedWarehouseIcon]}>
                        <IconWarehouse width={20} height={20} color={isSelected ? Color.blue2 : Color.textSecondary} />
                    </View>
                    <View style={styles.warehouseInfo}>
                        <Text style={[styles.warehouseName, isSelected && styles.selectedWarehouseText]}>
                            {item.name}
                        </Text>
                        <Text style={[styles.warehouseAddress, isSelected && styles.selectedWarehouseText]}>
                            {item.address}
                        </Text>
                        {item.district?.name && (
                            <View style={styles.warehouseDistrict}>
                                <MapPinIcon size={12} color={isSelected ? Color.blue2 : Color.textSecondary} />
                                <Text style={[styles.districtName, isSelected && styles.selectedDistrictText]}>
                                    {item.district.name}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Text style={styles.checkboxMark}>✓</Text>}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (!visible || !employee) return null;

    const allSelected = warehouses.length > 0 && selectedIds.length === warehouses.length;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                {/* Заголовок */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <Text style={styles.title}>Назначить склады</Text>
                        <Text style={styles.subtitle}>Сотрудник: {employee.name}</Text>
                    </View>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <IconClose width={24} height={24} color={Color.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* Панель выбора всех */}
                <View style={styles.selectionBar}>
                    <Text style={styles.selectionCount}>
                        Выбрано: {selectedIds.length} из {warehouses.length}
                    </Text>
                    <TouchableOpacity
                        onPress={allSelected ? handleClearAll : handleSelectAll}
                        style={styles.selectAllButton}
                    >
                        <Text style={styles.selectAllText}>
                            {allSelected ? 'Снять все' : 'Выбрать все'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Список складов */}
                <View style={styles.content}>
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={Color.blue2} />
                            <Text style={styles.loadingText}>Загрузка складов...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={warehouses}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={renderWarehouseItem}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.listContainer}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>Склады не найдены</Text>
                                </View>
                            }
                        />
                    )}
                </View>

                {/* Кнопки действий */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={onClose}
                        disabled={isSaving}
                    >
                        <Text style={styles.cancelButtonText}>Отмена</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.saveButton, isSaving && styles.disabledButton]}
                        onPress={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color={Color.colorLightMode} />
                        ) : (
                            <Text style={styles.saveButtonText}>Сохранить</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
        borderBottomWidth: 1,
        borderBottomColor: Color.border,
        backgroundColor: Color.colorLightMode,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: normalizeFont(FontSize.size_lg),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
        marginBottom: normalize(4),
    },
    subtitle: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
    },
    closeButton: {
        padding: normalize(8),
    },
    selectionBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(10),
        backgroundColor: Color.colorLightGray,
        borderBottomWidth: 1,
        borderBottomColor: Color.border,
    },
    selectionCount: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
    },
    selectAllButton: {
        paddingVertical: normalize(4),
        paddingHorizontal: normalize(10),
        borderRadius: Border.radius.small,
        backgroundColor: Color.blue2,
    },
    selectAllText: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.colorLightMode,
    },
    content: {
        flex: 1,
        paddingHorizontal: normalize(20),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginTop: normalize(8),
    },
    listContainer: {
        paddingVertical: normalize(12),
    },
    emptyContainer: {
        paddingVertical: normalize(40),
        alignItems: 'center',
    },
    emptyText: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
    },
    warehouseItem: {
        backgroundColor: Color.colorLightMode,
        borderRadius: Border.radius.medium,
        padding: normalize(14),
        marginBottom: normalize(10),
        borderWidth: 1.5,
        borderColor: Color.border,
        ...Shadow.light,
    },
    selectedWarehouseItem: {
        borderColor: Color.blue2,
        backgroundColor: '#EBF3FF',
    },
    warehouseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    warehouseIcon: {
        width: normalize(38),
        height: normalize(38),
        borderRadius: normalize(19),
        backgroundColor: Color.colorLightGray,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: normalize(12),
    },
    selectedWarehouseIcon: {
        backgroundColor: '#D6E8FF',
    },
    warehouseInfo: {
        flex: 1,
    },
    warehouseName: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
        marginBottom: normalize(2),
    },
    selectedWarehouseText: {
        color: Color.blue2,
    },
    warehouseAddress: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginBottom: normalize(2),
    },
    warehouseDistrict: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: normalize(2),
    },
    districtName: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginLeft: normalize(4),
    },
    selectedDistrictText: {
        color: Color.blue2,
    },
    checkbox: {
        width: normalize(22),
        height: normalize(22),
        borderRadius: normalize(6),
        borderWidth: 1.5,
        borderColor: Color.border,
        backgroundColor: Color.colorLightMode,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: normalize(8),
    },
    checkboxSelected: {
        borderColor: Color.blue2,
        backgroundColor: Color.blue2,
    },
    checkboxMark: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '700',
        color: Color.colorLightMode,
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
        borderTopWidth: 1,
        borderTopColor: Color.border,
        backgroundColor: Color.colorLightMode,
        gap: normalize(12),
    },
    cancelButton: {
        flex: 1,
        paddingVertical: normalize(12),
        borderRadius: Border.radius.medium,
        borderWidth: 1,
        borderColor: Color.border,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
    },
    saveButton: {
        flex: 1,
        paddingVertical: normalize(12),
        borderRadius: Border.radius.medium,
        backgroundColor: Color.blue2,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: Color.colorLightGray,
    },
    saveButtonText: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.colorLightMode,
    },
});

export default EmployeeWarehouseModal;
