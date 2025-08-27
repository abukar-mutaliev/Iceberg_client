import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { IconEdit, IconDelete } from '@shared/ui/Icon/ProductManagement';
import { MapPinIcon } from '@shared/ui/Icon/DistrictManagement/MapPinIcon';

export const DistrictListItem = ({ district, onEdit, onDelete }) => {
    const driversCount = district._count?.drivers || 0;
    const clientsCount = district._count?.clients || 0;
    const stopsCount = district._count?.stops || 0;

    const totalCount = useMemo(() => {
        return driversCount + clientsCount + stopsCount;
    }, [driversCount, clientsCount, stopsCount]);

    const getBadgeColor = () => {
        if (totalCount > 20) return Color.green;
        if (totalCount > 5) return Color.blue2;
        return Color.grey7D7D7D;
    };
    console.log("DISCTRICTS:", district);

    return (
        <Animated.View style={styles.container}>
            <View style={styles.leftContent}>
                <View style={styles.iconContainer}>
                    <MapPinIcon
                        style={styles.districtIcon}
                        size={24}
                        color={Color.blue2}
                    />
                </View>
            </View>

            <View style={styles.infoContainer}>
                <View style={styles.headerContainer}>
                    <Text style={styles.name} numberOfLines={1}>{district.name}</Text>

                    <View style={[styles.badgeContainer, { backgroundColor: getBadgeColor() }]}>
                        <Text style={styles.badgeText}>{totalCount}</Text>
                    </View>
                </View>

                {district.description && (
                    <Text style={styles.description} numberOfLines={2}>
                        {district.description}
                    </Text>
                )}

                <View style={styles.statsContainer}>
                    <Text style={styles.statsText}>
                        Водители: {driversCount} | Клиенты: {clientsCount} | Точки: {stopsCount}
                    </Text>
                </View>
            </View>

            <View style={styles.actionsContainer}>
                <TouchableOpacity
                    style={styles.actionButton}
                    activeOpacity={0.7}
                    onPress={onEdit}
                >
                    <IconEdit width={18} height={18} color={Color.blue2} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    activeOpacity={0.7}
                    onPress={onDelete}
                >
                    <IconDelete width={18} height={18} color={Color.colorRed} />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: normalize(12),
        backgroundColor: Color.colorLightMode,
        borderRadius: normalize(20),
        padding: normalize(16),
        marginBottom: normalize(12),
        marginHorizontal: normalize(2),
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    leftContent: {
        marginRight: normalize(12),
    },
    iconContainer: {
        width: normalize(40),
        height: normalize(40),
        borderRadius: normalize(20),
        justifyContent: 'center',
        alignItems: 'center',
    },
    districtIcon: {
        zIndex: 1,
    },
    infoContainer: {
        flex: 1,
        marginRight: normalize(8),
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: normalize(4),
    },
    name: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
        flex: 1,
    },
    badgeContainer: {
        paddingHorizontal: normalize(6),
        paddingVertical: normalize(2),
        borderRadius: normalize(12),
        marginLeft: normalize(8),
        minWidth: normalize(22),
        alignItems: 'center',
    },
    badgeText: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
        color: Color.colorLightMode,
    },
    description: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        lineHeight: normalizeFont(FontSize.size_xs) * 1.4,
        marginBottom: normalize(4),
    },
    statsContainer: {
        marginTop: normalize(2),
    },
    statsText: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        width: normalize(36),
        height: normalize(36),
        borderRadius: normalize(18),
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: normalize(8),
    },
});