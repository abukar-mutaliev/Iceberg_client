import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    SafeAreaView,
    ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import CustomButton from '@shared/ui/Button/CustomButton';
import { BackButton } from '@shared/ui/Button/BackButton';
import { IconCheck } from '@shared/ui/Icon/Common';
import { MapPinIcon } from '@shared/ui/Icon/DistrictManagement/MapPinIcon';
import { fetchAllDistricts } from '@entities/district/model/slice';
import { employeeApi } from '@entities/user/api/userApi';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { loadUserProfile } from '@entities/auth/model/slice';
import { fetchStaffOrders } from '@entities/order';

export const DistrictSelectionScreen = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const { currentUser } = useAuth();
    
    const { districts, isLoading: districtsLoading } = useSelector(state => state.district);

    const [selectedDistricts, setSelectedDistricts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [initialDistricts, setInitialDistricts] = useState([]);

    // Загружаем районы и текущие районы сотрудника при монтировании
    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                
                // Загружаем все районы
                if (districts.length === 0) {
                    await dispatch(fetchAllDistricts());
                }

                // Загружаем текущие районы сотрудника
                if (currentUser?.role === 'EMPLOYEE' && currentUser?.employee?.id) {
                    const response = await employeeApi.getEmployeeById(currentUser.employee.id);
                    const employeeDistricts = response.data?.employee?.districts || [];
                    const districtIds = employeeDistricts.map(d => d.id);
                    setSelectedDistricts(districtIds);
                    setInitialDistricts(districtIds);
                }
            } catch (error) {
                console.error('Ошибка загрузки данных:', error);
                Alert.alert('Ошибка', 'Не удалось загрузить данные');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [dispatch, districts.length, currentUser]);

    // Обработчик переключения района
    const toggleDistrict = (districtId) => {
        setSelectedDistricts(prev => {
            if (prev.includes(districtId)) {
                return prev.filter(id => id !== districtId);
            } else {
                return [...prev, districtId];
            }
        });
    };

    // Проверка, есть ли изменения
    const hasChanges = () => {
        if (selectedDistricts.length !== initialDistricts.length) return true;
        return !selectedDistricts.every(id => initialDistricts.includes(id));
    };

    // Обработчик сохранения
    const handleSave = async () => {
        if (!hasChanges()) {
            navigation.goBack();
            return;
        }

        try {
            setIsSaving(true);

            if (!currentUser?.employee?.id) {
                throw new Error('ID сотрудника не найден');
            }

            await employeeApi.updateEmployeeDistricts(currentUser.employee.id, selectedDistricts);

            // ✅ ИСПРАВЛЕНО: Обновляем состояние авторизации с новыми данными
            console.log('🔄 Обновляем профиль пользователя после изменения районов');
            await dispatch(loadUserProfile()).unwrap();

            // ✅ ИСПРАВЛЕНО: Принудительно обновляем заказы с новыми данными районов
            console.log('🔄 Перезагружаем заказы с обновленными районами');
            await dispatch(fetchStaffOrders({ forceRefresh: true })).unwrap();

            // Проверим, изменился ли склад
            const updatedEmployeeResponse = await employeeApi.getEmployeeById(currentUser.employee.id);
            const updatedEmployee = updatedEmployeeResponse.data?.employee;
            const newWarehouse = updatedEmployee?.warehouse;
            
            let alertMessage = 'Районы работы обновлены';
            if (newWarehouse) {
                alertMessage += `\n\nАвтоматически назначен склад:\n${newWarehouse.name} (${newWarehouse.district?.name})`;
            } else if (selectedDistricts.length > 0) {
                alertMessage += '\n\nВнимание: В выбранном районе нет доступного склада';
            }

            Alert.alert(
                'Успешно!',
                alertMessage,
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack()
                    }
                ]
            );

        } catch (error) {
            console.error('Ошибка сохранения районов:', error);
            Alert.alert(
                'Ошибка',
                error.response?.data?.message || error.message || 'Не удалось сохранить изменения'
            );
        } finally {
            setIsSaving(false);
        }
    };

    // Обработчик отмены
    const handleCancel = () => {
        if (hasChanges()) {
            Alert.alert(
                'Несохраненные изменения',
                'У вас есть несохраненные изменения. Вы уверены, что хотите выйти?',
                [
                    {
                        text: 'Отмена',
                        style: 'cancel'
                    },
                    {
                        text: 'Выйти',
                        style: 'destructive',
                        onPress: () => navigation.goBack()
                    }
                ]
            );
        } else {
            navigation.goBack();
        }
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

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <BackButton onPress={handleCancel} />
                    <Text style={styles.headerTitle}>Районы работы</Text>
                    <View style={styles.headerRight} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Color.blue2} />
                    <Text style={styles.loadingText}>Загрузка районов...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <BackButton onPress={handleCancel} />
                <Text style={styles.headerTitle}>Районы работы</Text>
                <View style={styles.headerRight} />
            </View>

            <View style={styles.content}>
                <View style={styles.infoContainer}>
                    <MapPinIcon size={24} color={Color.blue2} />
                    <View style={styles.infoText}>
                        <Text style={styles.infoTitle}>Выберите районы для работы</Text>
                        <Text style={styles.infoDescription}>
                            Выберите районы, в которых вы готовы выполнять заказы
                        </Text>
                    </View>
                </View>

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

                <FlatList
                    data={districts}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderDistrictItem}
                    showsVerticalScrollIndicator={false}
                    style={styles.list}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                                Районы не найдены
                            </Text>
                        </View>
                    )}
                />
            </View>

            <View style={styles.footer}>
                <View style={styles.buttonRow}>
                    <CustomButton
                        title="Отмена"
                        onPress={handleCancel}
                        outlined={true}
                        color={Color.textSecondary}
                        style={styles.cancelButton}
                    />
                    <CustomButton
                        title={isSaving ? "Сохранение..." : "Сохранить"}
                        onPress={handleSave}
                        disabled={isSaving || !hasChanges()}
                        color={Color.blue2}
                        activeColor="#FFFFFF"
                        style={styles.saveButton}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(15),
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5E5',
    },
    headerTitle: {
        fontSize: normalizeFont(18),
        fontWeight: '600',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    headerRight: {
        width: normalize(34),
    },
    content: {
        flex: 1,
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: normalize(20),
        backgroundColor: '#F8F9FA',
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5E5',
    },
    infoText: {
        flex: 1,
        marginLeft: normalize(12),
    },
    infoTitle: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(4),
    },
    infoDescription: {
        fontSize: normalizeFont(14),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        lineHeight: normalize(20),
    },
    counter: {
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(12),
        backgroundColor: '#F0F8FF',
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5E5',
    },
    counterText: {
        fontSize: normalizeFont(14),
        fontWeight: '500',
        color: Color.blue2,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
    },
    warehouseInfoText: {
        fontSize: normalizeFont(12),
        color: '#666666',
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        marginTop: normalize(4),
        fontStyle: 'italic',
    },
    list: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: normalize(40),
    },
    loadingText: {
        fontSize: normalizeFont(14),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginTop: normalize(12),
    },
    emptyContainer: {
        padding: normalize(40),
        alignItems: 'center',
    },
    emptyText: {
        fontSize: normalizeFont(16),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
    },
    footer: {
        padding: normalize(20),
        borderTopWidth: 0.5,
        borderTopColor: '#E5E5E5',
        backgroundColor: '#FFFFFF',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cancelButton: {
        flex: 0.48,
    },
    saveButton: {
        flex: 0.48,
    },
    
    // Стили для районов
    districtItem: {
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(12),
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5E5',
    },
    selectedDistrictItem: {
        backgroundColor: '#F0F8FF',
    },
    districtContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    districtInfo: {
        flex: 1,
        marginRight: normalize(12),
    },
    districtName: {
        fontSize: normalizeFont(16),
        fontWeight: '500',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(2),
    },
    districtDescription: {
        fontSize: normalizeFont(12),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    selectedText: {
        color: Color.blue2,
    },
    checkbox: {
        width: normalize(24),
        height: normalize(24),
        borderRadius: normalize(12),
        borderWidth: 2,
        borderColor: '#E5E5E5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkedCheckbox: {
        backgroundColor: Color.blue2,
        borderColor: Color.blue2,
    },
}); 