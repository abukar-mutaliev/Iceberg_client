import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator
} from 'react-native';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import WarehouseService from '@entities/warehouse/api/warehouseApi';
import IconEdit from '@shared/ui/Icon/Profile/IconEdit';

export const WarehousePriceEditor = ({ 
    warehouseId, 
    productId, 
    currentPrice, 
    basePrice,
    onPriceUpdated 
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [priceValue, setPriceValue] = useState(currentPrice?.toString() || '');
    const [saving, setSaving] = useState(false);

    const handleEditPress = () => {
        setIsEditing(true);
        setPriceValue(currentPrice?.toString() || '');
    };

    const handleCancel = () => {
        setIsEditing(false);
        setPriceValue(currentPrice?.toString() || '');
    };

    const handleSave = async () => {
        const price = parseFloat(priceValue.replace(',', '.'));
        
        if (isNaN(price) || price <= 0) {
            Alert.alert('Ошибка', 'Введите корректную цену (больше 0)');
            return;
        }

        if (basePrice && price > basePrice * 1.5) {
            Alert.alert(
                'Предупреждение',
                `Цена склада (${price.toFixed(0)} ₽) значительно превышает базовую цену (${basePrice.toFixed(0)} ₽). Продолжить?`,
                [
                    { text: 'Отмена', onPress: handleCancel },
                    { text: 'Продолжить', onPress: () => savePrice(price) }
                ]
            );
            return;
        }

        savePrice(price);
    };

    const savePrice = async (price) => {
        setSaving(true);
        try {
            await WarehouseService.updateProductPrice(warehouseId, productId, {
                warehousePrice: price
            });

            setIsEditing(false);
            if (onPriceUpdated) {
                onPriceUpdated(price);
            }
        } catch (error) {
            console.error('Ошибка обновления цены:', error);
            Alert.alert(
                'Ошибка',
                error.response?.data?.message || 'Не удалось обновить цену'
            );
        } finally {
            setSaving(false);
        }
    };

    const handleRemovePrice = () => {
        Alert.alert(
            'Удалить цену склада?',
            'После удаления будет использоваться базовая цена товара.',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        setSaving(true);
                        try {
                            await WarehouseService.updateProductPrice(warehouseId, productId, {
                                warehousePrice: null
                            });
                            setIsEditing(false);
                            if (onPriceUpdated) {
                                onPriceUpdated(null);
                            }
                        } catch (error) {
                            console.error('Ошибка удаления цены:', error);
                            Alert.alert('Ошибка', 'Не удалось удалить цену');
                        } finally {
                            setSaving(false);
                        }
                    }
                }
            ]
        );
    };

    if (isEditing) {
        return (
            <View style={styles.editorContainer}>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.priceInput}
                        value={priceValue}
                        onChangeText={setPriceValue}
                        placeholder="Цена за коробку"
                        keyboardType="numeric"
                        editable={!saving}
                    />
                    <Text style={styles.currency}>₽</Text>
                </View>
                {basePrice && (
                    <Text style={styles.hint}>
                        Базовая цена: {basePrice.toFixed(0)} ₽
                    </Text>
                )}
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.cancelButton]}
                        onPress={handleCancel}
                        disabled={saving}
                    >
                        <Text style={styles.cancelButtonText}>Отмена</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.saveButton]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.saveButtonText}>Сохранить</Text>
                        )}
                    </TouchableOpacity>
                </View>
                {currentPrice !== null && currentPrice !== undefined && (
                    <TouchableOpacity
                        style={styles.removeButton}
                        onPress={handleRemovePrice}
                        disabled={saving}
                    >
                        <Text style={styles.removeButtonText}>Удалить цену</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    return (
        <View style={styles.viewContainer}>
            <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Цена для склада:</Text>
                <Text style={styles.priceValue}>
                    {currentPrice ? `${parseFloat(currentPrice).toFixed(0)} ₽` : 'Не установлена'}
                </Text>
            </View>
            {basePrice && (
                <Text style={styles.basePriceHint}>
                    {currentPrice 
                        ? `Базовая: ${basePrice.toFixed(0)} ₽ (скидка: ${((1 - currentPrice / basePrice) * 100).toFixed(1)}%)`
                        : `Базовая цена: ${basePrice.toFixed(0)} ₽`
                    }
                </Text>
            )}
            <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditPress}
            >
                <IconEdit width={16} height={16} color={Color.blue2} />
                <Text style={styles.editButtonText}>Изменить цену</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    viewContainer: {
        padding: 12,
        backgroundColor: '#F9F9F9',
        borderRadius: Border.br_base,
        marginTop: 8,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    priceLabel: {
        fontSize: FontSize.size_sm,
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    priceValue: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.bold,
        fontWeight: '600',
        color: Color.textPrimary,
    },
    basePriceHint: {
        fontSize: FontSize.size_xs,
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginTop: 4,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingVertical: 6,
    },
    editButtonText: {
        fontSize: FontSize.size_sm,
        color: Color.blue2,
        fontFamily: FontFamily.sFProText,
        marginLeft: 6,
    },
    editorContainer: {
        padding: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: Border.br_base,
        marginTop: 8,
        borderWidth: 1,
        borderColor: Color.blue2,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    priceInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: Color.border,
        borderRadius: Border.br_sm,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        color: Color.textPrimary,
    },
    currency: {
        fontSize: FontSize.size_md,
        color: Color.textPrimary,
        fontFamily: FontFamily.sFProText,
        marginLeft: 8,
    },
    hint: {
        fontSize: FontSize.size_xs,
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginBottom: 12,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: Border.br_sm,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#F5F5F5',
    },
    cancelButtonText: {
        fontSize: FontSize.size_md,
        color: Color.textPrimary,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: Color.blue2,
    },
    saveButtonText: {
        fontSize: FontSize.size_md,
        color: '#FFFFFF',
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
    },
    removeButton: {
        marginTop: 8,
        paddingVertical: 8,
        alignItems: 'center',
    },
    removeButtonText: {
        fontSize: FontSize.size_sm,
        color: Color.colorCrimson,
        fontFamily: FontFamily.sFProText,
    },
});







