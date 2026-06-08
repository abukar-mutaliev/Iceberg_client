import React, { useMemo, useState, useEffect } from 'react';
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
import { FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import { useWarehouses } from '@entities/warehouse/hooks/useWarehouses';
import { driverApi } from '@entities/user/api/userApi';
import IconClose from '@shared/ui/Icon/Profile/CloseIcon';
import IconWarehouse from '@shared/ui/Icon/Warehouse/IconWarehouse';
import { MapPinIcon } from '@shared/ui/Icon/DistrictManagement/MapPinIcon';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const DriverWarehouseModal = ({ visible, driver, onClose, onSuccess }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const { warehouses, loading: isLoading, refreshWarehouses } = useWarehouses({ autoLoad: true });

    // Инициализация при открытии модального окна
    useEffect(() => {
        if (visible && driver) {
            setSelectedWarehouseId(driver.warehouseId || null);
            if (warehouses.length === 0) {
                refreshWarehouses();
            }
        }
    }, [visible, driver]);

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
                        <IconWarehouse width={20} height={20} color={isSelected ? colors.textInverse : colors.primary} />
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
                            <MapPinIcon size={12} color={isSelected ? colors.textInverse : colors.textSecondary} />
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
                        <IconClose width={24} height={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* Список складов */}
                <View style={styles.content}>
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
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
                            <ActivityIndicator size="small" color={colors.textInverse} />
                        ) : (
                            <Text style={styles.saveButtonText}>Сохранить</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: normalizeFont(FontSize.size_lg),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: normalize(4),
    },
    subtitle: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: colors.textSecondary,
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
        color: colors.textSecondary,
        marginTop: normalize(8),
    },
    listContainer: {
        paddingVertical: normalize(16),
    },
    warehouseItem: {
        backgroundColor: colors.cardBackground,
        borderRadius: Border.radius.medium,
        padding: normalize(16),
        marginBottom: normalize(12),
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.25 : Shadow.light.shadowOpacity,
        shadowRadius: isDark ? 6 : Shadow.light.shadowRadius,
        elevation: isDark ? 2 : Shadow.light.elevation,
    },
    selectedWarehouseItem: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    warehouseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    warehouseIcon: {
        width: normalize(40),
        height: normalize(40),
        borderRadius: normalize(20),
        backgroundColor: colors.surfaceSecondary,
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
        color: colors.textPrimary,
        marginBottom: normalize(4),
    },
    warehouseAddress: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: colors.textSecondary,
        marginBottom: normalize(4),
    },
    warehouseDistrict: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    districtName: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: colors.textSecondary,
        marginLeft: normalize(4),
    },
    selectedWarehouseText: {
        color: colors.textInverse,
    },
    selectedIndicator: {
        width: normalize(24),
        height: normalize(24),
        borderRadius: normalize(12),
        backgroundColor: colors.textInverse,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedIndicatorText: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: colors.primary,
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.surface,
        gap: normalize(12),
    },
    cancelButton: {
        flex: 1,
        paddingVertical: normalize(12),
        borderRadius: Border.radius.medium,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    saveButton: {
        flex: 1,
        paddingVertical: normalize(12),
        borderRadius: Border.radius.medium,
        backgroundColor: colors.primary,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: colors.surfaceSecondary,
    },
    saveButtonText: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: colors.textInverse,
    },
});

export default DriverWarehouseModal;







