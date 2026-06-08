import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import IconWarehouse from '@shared/ui/Icon/Warehouse/IconWarehouse';
import { MapPinIcon } from '@shared/ui/Icon/DistrictManagement/MapPinIcon';
import IconEdit from '@shared/ui/Icon/Profile/IconEdit';
import IconDelete from '@shared/ui/Icon/Profile/IconDelete';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const WarehouseListItem = ({ warehouse, onEdit, onDelete, onViewStatistics }) => {
    const navigation = useNavigation();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const primaryColor = isDark ? colors.primary : Color.blue2;
    const iconSecondaryColor = isDark ? colors.textSecondary : Color.textSecondary;
    const handleDelete = () => {
        Alert.alert(
            'Подтверждение удаления',
            `Вы действительно хотите удалить склад "${warehouse.name}"?`,
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: () => onDelete(warehouse.id)
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <IconWarehouse width={24} height={24} color={primaryColor} />
                    </View>
                    <View style={styles.info}>
                        <Text style={styles.name}>{warehouse.name}</Text>
                        <View style={styles.addressContainer}>
                            <MapPinIcon size={14} color={iconSecondaryColor} />
                            <Text style={styles.address}>{warehouse.address}</Text>
                        </View>
                        {warehouse.district && (
                            <Text style={styles.district}>
                                Район: {warehouse.district.name}
                            </Text>
                        )}
                    </View>
                </View>

                <View style={styles.stats}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Статус:</Text>
                        <Text style={[
                            styles.statValue,
                            { color: warehouse.isActive ? Color.green : Color.red }
                        ]}>
                            {warehouse.isActive ? 'Активен' : 'Неактивен'}
                        </Text>
                    </View>
                    {warehouse._count && (
                        <>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Сотрудники:</Text>
                                <Text style={styles.statValue}>{warehouse._count.employees || 0}</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Заказы:</Text>
                                <Text style={styles.statValue}>{warehouse._count.orders || 0}</Text>
                            </View>
                        </>
                    )}
                </View>
            </View>

            <View style={styles.actions}>
                {onViewStatistics && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.statsButton]}
                        onPress={() => {
                            if (onViewStatistics) {
                                onViewStatistics(warehouse);
                            } else {
                                navigation.navigate('WarehouseStatistics', {
                                    warehouseId: warehouse.id,
                                    warehouseName: warehouse.name
                                });
                            }
                        }}
                    >
                        <Text style={styles.statsButtonText}>📊</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => onEdit(warehouse)}
                >
                    <IconEdit width={16} height={16} color={primaryColor} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={handleDelete}
                >
                    <IconDelete width={16} height={16} color={Color.red} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: isDark ? colors.cardBackground : Color.colorLightMode,
        borderRadius: Border.radius.medium,
        marginBottom: normalize(12),
        padding: normalize(16),
        ...(isDark ? {} : Shadow.light),
        borderWidth: 1,
        borderColor: isDark ? colors.divider : Color.border,
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        marginBottom: normalize(12),
    },
    iconContainer: {
        width: normalize(40),
        height: normalize(40),
        borderRadius: normalize(20),
        backgroundColor: isDark ? colors.backgroundSecondary : Color.colorLightGray,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: normalize(12),
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: isDark ? (colors.textPrimary || colors.text || Color.colorLightMode) : Color.textPrimary,
        marginBottom: normalize(4),
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: normalize(4),
    },
    address: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: isDark ? colors.textSecondary : Color.textSecondary,
        marginLeft: normalize(4),
        flex: 1,
    },
    district: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: isDark ? colors.primary : Color.blue2,
        fontWeight: '500',
    },
    stats: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: normalize(12),
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statLabel: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: isDark ? colors.textSecondary : Color.textSecondary,
        marginRight: normalize(4),
    },
    statValue: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: isDark ? colors.text : Color.textPrimary,
    },
    actions: {
        flexDirection: 'column',
        justifyContent: 'center',
        gap: normalize(8),
    },
    actionButton: {
        width: normalize(32),
        height: normalize(32),
        borderRadius: normalize(16),
        backgroundColor: isDark ? colors.backgroundSecondary : Color.colorLightGray,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButton: {
        backgroundColor: '#FFE6E6',
    },
    statsButton: {
        backgroundColor: '#E3F2FD',
    },
    statsButtonText: {
        fontSize: normalizeFont(FontSize.size_md),
    },
});

export default WarehouseListItem;
