import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal, 
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Alert,
    ActivityIndicator} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import CloseIcon from '@shared/ui/Icon/Profile/CloseIcon';
import { IconCheck } from '@shared/ui/Icon/Common';
import { fetchAllDistricts } from '@entities/district/model/slice';
import { employeeApi } from '@entities/user/api/userApi';
import { loadUserProfile } from '@entities/auth/model/slice';
import { fetchStaffOrders } from '@entities/order';

export const EmployeeDistrictsModal = ({ 
    visible, 
    employee, 
    onClose, 
    onSuccess 
}) => {
    const dispatch = useDispatch();
    const { districts, isLoading: districtsLoading } = useSelector(state => state.district);

    const [selectedDistricts, setSelectedDistricts] = useState([]);
    const [isUpdating, setIsUpdating] = useState(false);

    // Загружаем районы при открытии модального окна
    useEffect(() => {
        if (visible && districts.length === 0) {
            dispatch(fetchAllDistricts());
        }
    }, [visible, districts.length, dispatch]);

    // Устанавливаем выбранные районы при изменении сотрудника
    useEffect(() => {
        if (employee && employee.districts) {
            setSelectedDistricts(employee.districts.map(district => district.id));
        } else {
            setSelectedDistricts([]);
        }
    }, [employee]);

    // Переключение выбора района
    const toggleDistrict = (districtId) => {
        setSelectedDistricts(prev => {
            if (prev.includes(districtId)) {
                return prev.filter(id => id !== districtId);
            } else {
                return [...prev, districtId];
            }
        });
    };

    // Сохранение изменений
    const handleSave = async () => {
        if (!employee) return;

        try {
            setIsUpdating(true);

            await employeeApi.updateEmployeeDistricts(
                employee.id, 
                selectedDistricts
            );

            // ✅ ИСПРАВЛЕНО: Обновляем состояние авторизации с новыми данными
            console.log('🔄 Обновляем профиль пользователя после изменения районов');
            await dispatch(loadUserProfile()).unwrap();

            // ✅ ИСПРАВЛЕНО: Принудительно обновляем заказы с новыми данными районов
            console.log('🔄 Перезагружаем заказы с обновленными районами');
            await dispatch(fetchStaffOrders({ forceRefresh: true })).unwrap();

            // Получим обновленную информацию о сотруднике для показа назначенного склада
            const updatedEmployeeResponse = await employeeApi.getEmployeeById(employee.id);
            const updatedEmployee = updatedEmployeeResponse.data?.employee;
            const newWarehouse = updatedEmployee?.warehouse;
            
            let alertMessage = 'Районы сотрудника успешно обновлены';
            if (newWarehouse) {
                alertMessage += `\n\nАвтоматически назначен склад:\n${newWarehouse.name} (${newWarehouse.district?.name})`;
            } else if (selectedDistricts.length > 0) {
                alertMessage += '\n\nВнимание: В выбранном районе нет доступного склада';
            }

            Alert.alert(
                'Успешно',
                alertMessage,
                [{ text: 'OK', onPress: () => {
                    onSuccess && onSuccess();
                    onClose();
                }}]
            );

        } catch (error) {
            console.error('Ошибка обновления районов:', error);
            Alert.alert(
                'Ошибка',
                error.response?.data?.message || 'Не удалось обновить районы сотрудника'
            );
        } finally {
            setIsUpdating(false);
        }
    };

    // Закрытие модального окна
    const handleClose = () => {
        if (employee && employee.districts) {
            setSelectedDistricts(employee.districts.map(district => district.id));
        }
        onClose();
    };

    // Рендер элемента района
    const renderDistrictItem = ({ item }) => {
        const isSelected = selectedDistricts.includes(item.id);

        return (
            <TouchableOpacity
                style={[styles.districtItem, isSelected && styles.selectedDistrictItem]}
                onPress={() => toggleDistrict(item.id)}
            >
                <View style={styles.districtContent}>
                    <View style={styles.districtInfo}>
                        <Text style={[styles.districtName, isSelected && styles.selectedText]}>
                            {item.name}
                        </Text>
                        {item.description && (
                            <Text style={[styles.districtDescription, isSelected && styles.selectedText]}>
                                {item.description}
                            </Text>
                        )}
                    </View>
                    <View style={[styles.checkbox, isSelected && styles.checkedCheckbox]}>
                        {isSelected && (
                            <IconCheck width={16} height={16} color={Color.colorLightMode} />
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View style={styles.modalOverlay}>
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        {/* Заголовок */}
                        <View style={styles.header}>
                            <Text style={styles.title}>
                                Районы сотрудника
                            </Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={handleClose}
                            >
                                <CloseIcon width={24} height={24} color={Color.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Информация о сотруднике */}
                        {employee && (
                            <View style={styles.employeeInfo}>
                                <Text style={styles.employeeName}>
                                    {employee.name}
                                </Text>
                                <Text style={styles.employeePosition}>
                                    {employee.position || 'Сотрудник'}
                                </Text>
                            </View>
                        )}

                        {/* Счетчик выбранных районов */}
                        <View style={styles.counter}>
                            <Text style={styles.counterText}>
                                Выбрано районов: {selectedDistricts.length}
                            </Text>
                            {selectedDistricts.length > 0 && (
                                <Text style={styles.warehouseInfoText}>
                                    💡 Склад будет автоматически назначен из первого выбранного района
                                </Text>
                            )}
                        </View>

                        {/* Список районов */}
                        <View style={styles.listContainer}>
                            {districtsLoading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color={Color.blue2} />
                                    <Text style={styles.loadingText}>Загрузка районов...</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={districts}
                                    keyExtractor={(item) => item.id.toString()}
                                    renderItem={renderDistrictItem}
                                    showsVerticalScrollIndicator={false}
                                    ListEmptyComponent={() => (
                                        <View style={styles.emptyContainer}>
                                            <Text style={styles.emptyText}>
                                                Районы не найдены
                                            </Text>
                                        </View>
                                    )}
                                />
                            )}
                        </View>

                        {/* Кнопки действий */}
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={handleClose}
                            >
                                <Text style={styles.cancelButtonText}>Отмена</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={[styles.saveButton, isUpdating && styles.disabledButton]}
                                onPress={handleSave}
                                disabled={isUpdating}
                            >
                                {isUpdating ? (
                                    <ActivityIndicator size="small" color={Color.colorLightMode} />
                                ) : (
                                    <Text style={styles.saveButtonText}>Сохранить</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Color.colorLightMode,
        borderTopLeftRadius: Border.radius.large,
        borderTopRightRadius: Border.radius.large,
        maxHeight: '95%',
        minHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
        borderBottomWidth: 1,
        borderBottomColor: Color.border,
    },
    title: {
        fontSize: normalizeFont(FontSize.size_lg),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
    },
    closeButton: {
        padding: normalize(4),
    },
    employeeInfo: {
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(12),
        backgroundColor: Color.colorLightGray,
    },
    employeeName: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
    },
    employeePosition: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginTop: normalize(2),
    },
    counter: {
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(12),
        borderBottomWidth: 1,
        borderBottomColor: Color.border,
    },
    counterText: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.blue2,
        fontWeight: '500',
    },
    warehouseInfoText: {
        fontSize: normalizeFont(FontSize.size_xs),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginTop: normalize(4),
        fontStyle: 'italic',
    },
    listContainer: {
        flex: 1,
        paddingHorizontal: normalize(20),
    },
    districtItem: {
        paddingVertical: normalize(12),
        borderBottomWidth: 1,
        borderBottomColor: Color.border,
        paddingHorizontal: normalize(12)
    },
    selectedDistrictItem: {
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
    },
    districtContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    districtInfo: {
        flex: 1,
        marginRight: normalize(12),
    },
    districtName: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '500',
        color: Color.textPrimary,
    },
    districtDescription: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginTop: normalize(2),
    },
    selectedText: {
        color: Color.blue2,
    },
    checkbox: {
        width: normalize(24),
        height: normalize(24),
        borderRadius: normalize(4),
        borderWidth: 2,
        borderColor: Color.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkedCheckbox: {
        backgroundColor: Color.blue2,
        borderColor: Color.blue2,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: normalize(40),
    },
    loadingText: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginTop: normalize(8),
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: normalize(40),
    },
    emptyText: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
    },
    actions: {
        flexDirection: 'row',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
        borderTopWidth: 1,
        borderTopColor: Color.border,
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
        fontWeight: '500',
        color: Color.textSecondary,
    },
    saveButton: {
        flex: 1,
        paddingVertical: normalize(12),
        borderRadius: Border.radius.medium,
        backgroundColor: Color.blue2,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.colorLightMode,
    },
    disabledButton: {
        opacity: 0.6,
    },
});

export default EmployeeDistrictsModal; 