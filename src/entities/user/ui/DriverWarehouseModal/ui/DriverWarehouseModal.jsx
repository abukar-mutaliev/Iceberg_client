import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    SafeAreaView
} from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import WarehouseService from '@entities/warehouse/api/warehouseApi';
import { driverApi } from '@entities/user/api/userApi';
import IconClose from '@shared/ui/Icon/Profile/CloseIcon';
import IconWarehouse from '@shared/ui/Icon/Warehouse/IconWarehouse';
import { MapPinIcon } from '@shared/ui/Icon/DistrictManagement/MapPinIcon';

export const DriverWarehouseModal = ({ visible, driver, onClose, onSuccess }) => {
    const [warehouses, setWarehouses] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Инициализация при открытии модального окна
    useEffect(() => {
        if (visible && driver) {
            setSelectedWarehouseId(driver.warehouseId || null);
            loadWarehouses();
        }
    }, [visible, driver]);

    // Загрузка списка складов
    const loadWarehouses = async () => {
        try {
            setIsLoading(true);
            const response = await WarehouseService.getWarehouses({ 
                limit: 100,
                isActive: true 
            });
            
            // Обрабатываем различные форматы ответа API
            let warehouses = [];
            if (response.data?.warehouses) {
                warehouses = response.data.warehouses;
            } else if (response.data?.data?.warehouses) {
                warehouses = response.data.data.warehouses;
            } else if (Array.isArray(response.data?.data)) {
                warehouses = response.data.data;
            } else if (Array.isArray(response.data)) {
                warehouses = response.data;
            }
            
            console.log('Загружены склады для водителя:', warehouses.length);
            setWarehouses(warehouses);
        } catch (error) {
            console.error('Ошибка загрузки складов:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить список складов');
        } finally {
            setIsLoading(false);
        }
    };

    // Обработка выбора склада
    const handleWarehouseSelect = (warehouseId) => {
        setSelectedWarehouseId(warehouseId);
    };

    // Сохранение изменений
    const handleSave = async () => {
        if (!driver || !selectedWarehouseId) return;

        try {
            setIsSaving(true);
            
            // Вызываем API для обновления склада водителя
            await driverApi.updateDriverWarehouse(driver.id, selectedWarehouseId);
            
            Alert.alert(
                'Склад обновлен',
                `Склад водителя ${driver.name} успешно изменен`,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            onSuccess?.();
                            onClose();
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Ошибка обновления склада:', error);
            Alert.alert('Ошибка', 'Не удалось обновить склад водителя');
        } finally {
            setIsSaving(false);
        }
    };

    // Рендер элемента склада
    const renderWarehouseItem = ({ item }) => {
        const isSelected = selectedWarehouseId === item.id;
        
        return (
            <TouchableOpacity
                style={[
                    styles.warehouseItem,
                    isSelected && styles.selectedWarehouseItem
                ]}
                onPress={() => handleWarehouseSelect(item.id)}
            >
                <View style={styles.warehouseHeader}>
                    <View style={styles.warehouseIcon}>
                        <IconWarehouse width={20} height={20} color={isSelected ? Color.colorLightMode : Color.blue2} />
                    </View>
                    <View style={styles.warehouseInfo}>
                        <Text style={[
                            styles.warehouseName,
                            isSelected && styles.selectedWarehouseText
                        ]}>
                            {item.name}
                        </Text>
                        <Text style={[
                            styles.warehouseAddress,
                            isSelected && styles.selectedWarehouseText
                        ]}>
                            {item.address}
                        </Text>
                        <View style={styles.warehouseDistrict}>
                            <MapPinIcon size={12} color={isSelected ? Color.colorLightMode : Color.textSecondary} />
                            <Text style={[
                                styles.districtName,
                                isSelected && styles.selectedWarehouseText
                            ]}>
                                {item.district?.name}
                            </Text>
                        </View>
                    </View>
                    {isSelected && (
                        <View style={styles.selectedIndicator}>
                            <Text style={styles.selectedIndicatorText}>✓</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (!visible || !driver) return null;

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
                        <Text style={styles.title}>Изменить склад</Text>
                        <Text style={styles.subtitle}>
                            Водитель: {driver.name}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                    >
                        <IconClose width={24} height={24} color={Color.textPrimary} />
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
                        style={[
                            styles.saveButton,
                            (!selectedWarehouseId || isSaving) && styles.disabledButton
                        ]}
                        onPress={handleSave}
                        disabled={!selectedWarehouseId || isSaving}
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
        paddingVertical: normalize(16),
    },
    warehouseItem: {
        backgroundColor: Color.colorLightMode,
        borderRadius: Border.radius.medium,
        padding: normalize(16),
        marginBottom: normalize(12),
        borderWidth: 1,
        borderColor: Color.border,
        ...Shadow.light,
    },
    selectedWarehouseItem: {
        backgroundColor: Color.blue2,
        borderColor: Color.blue2,
    },
    warehouseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    warehouseIcon: {
        width: normalize(40),
        height: normalize(40),
        borderRadius: normalize(20),
        backgroundColor: Color.colorLightGray,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: normalize(12),
    },
    warehouseInfo: {
        flex: 1,
    },
    warehouseName: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
        marginBottom: normalize(4),
    },
    warehouseAddress: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginBottom: normalize(4),
    },
    warehouseDistrict: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    districtName: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginLeft: normalize(4),
    },
    selectedWarehouseText: {
        color: Color.colorLightMode,
    },
    selectedIndicator: {
        width: normalize(24),
        height: normalize(24),
        borderRadius: normalize(12),
        backgroundColor: Color.colorLightMode,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedIndicatorText: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.blue2,
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

export default DriverWarehouseModal;







