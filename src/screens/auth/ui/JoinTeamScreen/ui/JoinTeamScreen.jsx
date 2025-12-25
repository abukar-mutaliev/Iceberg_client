import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Modal,
    FlatList,
    ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import { CustomTextInput } from '@shared/ui/CustomTextInput/CustomTextInput';
import CustomButton from '@shared/ui/Button/CustomButton';
import { BackButton } from '@shared/ui/Button/BackButton';
import CloseIcon from '@shared/ui/Icon/Profile/CloseIcon';
import { IconCheck } from '@shared/ui/Icon/Common';
import { MapPinIcon } from '@shared/ui/Icon/DistrictManagement/MapPinIcon';
import { fetchAllDistricts } from '@entities/district/model/slice';
import { authApi } from '@entities/auth/api/authApi';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { useCustomAlert } from '@shared/ui/CustomAlert';

const roleOptions = [
    { value: 'EMPLOYEE', label: 'Сотрудник', description: 'Работа в офисе или на складе' },
    { value: 'SUPPLIER', label: 'Поставщик', description: 'Поставка товаров' },
    { value: 'DRIVER', label: 'Водитель', description: 'Доставка товаров клиентам' }
];

export const JoinTeamScreen = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const { currentUser } = useAuth();
    const { showError, showSuccess } = useCustomAlert();
    
    const { districts, isLoading: districtsLoading } = useSelector(state => state.district);

    const [selectedRole, setSelectedRole] = useState('');
    const [selectedDistricts, setSelectedDistricts] = useState([]);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showDistrictsModal, setShowDistrictsModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [applicationData, setApplicationData] = useState({
        reason: '',
        experience: '',
        additionalInfo: ''
    });

    // Загружаем районы при монтировании компонента
    useEffect(() => {
        if (districts.length === 0) {
            dispatch(fetchAllDistricts());
        }
    }, [dispatch, districts.length]);

    // Обработчик выбора роли
    const handleRoleSelect = (roleValue) => {
        setSelectedRole(roleValue);
        setShowRoleModal(false);
        // Сбрасываем выбранные районы при смене роли
        setSelectedDistricts([]);
    };

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

    // Обработчик отправки заявки
    const handleSubmit = async () => {
        if (!selectedRole) {
            showError('Ошибка', 'Пожалуйста, выберите желаемую роль');
            return;
        }

        if ((selectedRole === 'DRIVER' || selectedRole === 'EMPLOYEE') && selectedDistricts.length === 0) {
            showError('Ошибка', 'Пожалуйста, выберите хотя бы один район для работы');
            return;
        }

        try {
            setIsSubmitting(true);

            // Подготавливаем данные для отправки
            const requestData = {
                desiredRole: selectedRole,
                ...(selectedDistricts.length > 0 && { districts: selectedDistricts }),
                ...applicationData
            };

            console.log('Отправляем заявку:', requestData);

            // Отправляем заявку через API
            const response = await authApi.applyForStaff(requestData);

            console.log('Ответ сервера:', response);

            showSuccess(
                'Заявка отправлена!',
                'Ваша заявка успешно отправлена. Администратор рассмотрит её в ближайшее время.',
                [
                    {
                        text: 'OK',
                        style: 'primary',
                        onPress: () => navigation.goBack()
                    }
                ]
            );

        } catch (error) {
            console.error('Ошибка отправки заявки:', error);
            showError(
                'Ошибка',
                error.response?.data?.message || error.message || 'Не удалось отправить заявку'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // Получаем название выбранной роли
    const getSelectedRoleLabel = () => {
        const role = roleOptions.find(r => r.value === selectedRole);
        return role ? role.label : 'Выберите роль';
    };

    // Получаем названия выбранных районов
    const getSelectedDistrictsText = () => {
        if (selectedDistricts.length === 0) return 'Выберите районы';
        
        const selectedNames = districts
            .filter(district => selectedDistricts.includes(district.id))
            .map(district => district.name);
        
        if (selectedNames.length > 2) {
            return `${selectedNames.slice(0, 2).join(', ')} и еще ${selectedNames.length - 2}`;
        }
        
        return selectedNames.join(', ');
    };

    // Нужно ли показывать выбор районов
    const shouldShowDistrictsSelection = selectedRole === 'DRIVER' || selectedRole === 'EMPLOYEE';

    // Рендер элемента роли
    const renderRoleItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.optionItem, selectedRole === item.value && styles.selectedOptionItem]}
            onPress={() => handleRoleSelect(item.value)}
        >
            <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, selectedRole === item.value && styles.selectedOptionText]}>
                    {item.label}
                </Text>
                <Text style={[styles.optionDescription, selectedRole === item.value && styles.selectedOptionText]}>
                    {item.description}
                </Text>
            </View>
            {selectedRole === item.value && (
                <IconCheck width={20} height={20} color={Color.colorLightMode} />
            )}
        </TouchableOpacity>
    );

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
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <BackButton onPress={() => navigation.goBack()} />
                <Text style={styles.headerTitle}>Присоединиться к команде</Text>
                <View style={styles.headerRight} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.formContainer}>
                    <Text style={styles.sectionTitle}>Выберите желаемую роль</Text>
                    <Text style={styles.sectionDescription}>
                        Выберите роль, на которую хотите подать заявку
                    </Text>

                    {/* Селектор роли */}
                    <TouchableOpacity
                        style={styles.selector}
                        onPress={() => setShowRoleModal(true)}
                    >
                        <Text style={[styles.selectorText, !selectedRole && styles.placeholderText]}>
                            {getSelectedRoleLabel()}
                        </Text>
                        <Text style={styles.selectorIcon}>▼</Text>
                    </TouchableOpacity>

                    {/* Селектор районов (показывается для водителей и сотрудников) */}
                    {shouldShowDistrictsSelection && (
                        <>
                            <Text style={[styles.sectionTitle, styles.marginTop]}>Районы работы</Text>
                            <Text style={styles.sectionDescription}>
                                Выберите районы, в которых готовы работать
                            </Text>

                            <TouchableOpacity
                                style={styles.selector}
                                onPress={() => setShowDistrictsModal(true)}
                            >
                                <View style={styles.selectorContent}>
                                    <MapPinIcon size={20} color={Color.textSecondary} />
                                    <Text style={[
                                        styles.selectorText,
                                        styles.selectorTextWithIcon,
                                        selectedDistricts.length === 0 && styles.placeholderText
                                    ]}>
                                        {getSelectedDistrictsText()}
                                    </Text>
                                </View>
                                <Text style={styles.selectorIcon}>▼</Text>
                            </TouchableOpacity>

                            {selectedDistricts.length > 0 && (
                                <Text style={styles.selectedCount}>
                                    Выбрано районов: {selectedDistricts.length}
                                </Text>
                            )}
                        </>
                    )}

                    {/* Дополнительные поля */}
                    <Text style={[styles.sectionTitle, styles.marginTop]}>Дополнительная информация</Text>
                    
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Причина желания работать с нами</Text>
                        <CustomTextInput
                            style={styles.textArea}
                            value={applicationData.reason}
                            onChangeText={(text) => setApplicationData(prev => ({ ...prev, reason: text }))}
                            placeholder="Расскажите, почему хотите работать в нашей команде"
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Опыт работы (необязательно)</Text>
                        <CustomTextInput
                            style={styles.textArea}
                            value={applicationData.experience}
                            onChangeText={(text) => setApplicationData(prev => ({ ...prev, experience: text }))}
                            placeholder="Опишите ваш опыт работы в данной сфере"
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Дополнительная информация (необязательно)</Text>
                        <CustomTextInput
                            style={styles.textArea}
                            value={applicationData.additionalInfo}
                            onChangeText={(text) => setApplicationData(prev => ({ ...prev, additionalInfo: text }))}
                            placeholder="Любая дополнительная информация о себе"
                            multiline
                            numberOfLines={3}
                        />
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <CustomButton
                    title={isSubmitting ? "Отправка..." : "Отправить заявку"}
                    onPress={handleSubmit}
                    disabled={isSubmitting || !selectedRole}
                    color={Color.blue2}
                    activeColor="#FFFFFF"
                />
            </View>

            {/* Модальное окно выбора роли */}
            <Modal
                visible={showRoleModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowRoleModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Выберите роль</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setShowRoleModal(false)}
                            >
                                <CloseIcon width={24} height={24} color={Color.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={roleOptions}
                            keyExtractor={(item) => item.value}
                            renderItem={renderRoleItem}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                </View>
            </Modal>

            {/* Модальное окно выбора районов */}
            <Modal
                visible={showDistrictsModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowDistrictsModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Выберите районы</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setShowDistrictsModal(false)}
                            >
                                <CloseIcon width={24} height={24} color={Color.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.counter}>
                            <Text style={styles.counterText}>
                                Выбрано районов: {selectedDistricts.length}
                            </Text>
                        </View>

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

                        <View style={styles.modalFooter}>
                            <CustomButton
                                title="Готово"
                                onPress={() => setShowDistrictsModal(false)}
                                color={Color.blue2}
                                activeColor="#FFFFFF"
                            />
                        </View>
                    </View>
                </View>
            </Modal>
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
    formContainer: {
        padding: normalize(20),
    },
    sectionTitle: {
        fontSize: normalizeFont(18),
        fontWeight: '600',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(8),
    },
    sectionDescription: {
        fontSize: normalizeFont(14),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(16),
        lineHeight: normalize(20),
    },
    marginTop: {
        marginTop: normalize(24),
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(14),
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: normalize(12),
        backgroundColor: '#FFFFFF',
        marginBottom: normalize(8),
    },
    selectorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    selectorText: {
        fontSize: normalizeFont(16),
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    selectorTextWithIcon: {
        marginLeft: normalize(12),
    },
    placeholderText: {
        color: Color.textSecondary,
    },
    selectorIcon: {
        fontSize: normalizeFont(16),
        color: Color.textSecondary,
    },
    selectedCount: {
        fontSize: normalizeFont(12),
        color: Color.blue2,
        fontFamily: FontFamily.sFProText,
        marginTop: normalize(4),
    },
    inputContainer: {
        marginBottom: normalize(20),
    },
    inputLabel: {
        fontSize: normalizeFont(14),
        fontWeight: '500',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(8),
    },
    textArea: {
        minHeight: normalize(80),
        textAlignVertical: 'top',
        paddingTop: normalize(12),
    },
    footer: {
        padding: normalize(20),
        borderTopWidth: 0.5,
        borderTopColor: '#E5E5E5',
        backgroundColor: '#FFFFFF',
    },
    
    // Стили для модальных окон
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: normalize(20),
        borderTopRightRadius: normalize(20),
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5E5',
    },
    modalTitle: {
        fontSize: normalizeFont(18),
        fontWeight: '600',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    closeButton: {
        padding: normalize(4),
    },
    counter: {
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(12),
        backgroundColor: '#F8F9FA',
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
    loadingContainer: {
        padding: normalize(40),
        alignItems: 'center',
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
    modalFooter: {
        padding: normalize(20),
        borderTopWidth: 0.5,
        borderTopColor: '#E5E5E5',
    },
    
    // Стили для опций роли
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(16),
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5E5',
    },
    selectedOptionItem: {
        backgroundColor: '#F0F8FF',
    },
    optionContent: {
        flex: 1,
    },
    optionTitle: {
        fontSize: normalizeFont(16),
        fontWeight: '500',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(4),
    },
    optionDescription: {
        fontSize: normalizeFont(14),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    selectedOptionText: {
        color: Color.blue2,
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