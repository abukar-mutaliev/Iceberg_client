import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute } from '@react-navigation/native';
import {
    fetchAllDistricts,
    fetchDistrictById,
    createDistrict,
    updateDistrict,
    deleteDistrict,
    clearDistrictError,
    selectDistrict as selectDistrictAction
} from '@entities/district';
import {
    selectDistricts,
    selectDistrictLoading,
    selectDistrictError,
    selectDistrictsWithStats
} from '@entities/district';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { AdminHeader } from '@widgets/admin/AdminHeader';
import { useNavigation } from '@react-navigation/native';
import { DistrictListItem } from './DistrictListItem';
import { AddDistrictModal } from './AddDistrictModal';
import { ErrorState } from "@shared/ui/states/ErrorState";
import IconDistrict from "@shared/ui/Icon/DistrictManagement/IconDistrict";
import { IconSearch } from '@shared/ui/Icon/DistrictManagement/IconSearch';

export const DistrictsManagementScreen = () => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const route = useRoute();
    const { openAddModal } = route.params || {};

    const districts = useSelector(selectDistrictsWithStats) || [];
    const isLoading = useSelector(selectDistrictLoading);
    const error = useSelector(selectDistrictError);

    const [isAddModalVisible, setAddModalVisible] = useState(false);
    const [selectedDistrict, setSelectedDistrict] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [operationInProgress, setOperationInProgress] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredDistricts, setFilteredDistricts] = useState([]);

    // Открываем модальное окно при получении параметра
    useEffect(() => {
        if (openAddModal) {
            setAddModalVisible(true);
        }
    }, [openAddModal]);

    const loadDistricts = useCallback(async () => {
        setRefreshing(true);
        try {
            dispatch(clearDistrictError());
            await dispatch(fetchAllDistricts()).unwrap();
        } catch (err) {
            console.error('Error loading districts:', err);
            Alert.alert(
                'Ошибка загрузки',
                'Не удалось загрузить список районов. Попробуйте еще раз.',
                [{ text: 'OK' }]
            );
        } finally {
            setRefreshing(false);
        }
    }, [dispatch]);

    useEffect(() => {
        loadDistricts();
    }, [loadDistricts]);

    // Фильтрация районов при изменении поискового запроса
    useEffect(() => {
        if (!searchQuery.trim() || !districts.length) {
            setFilteredDistricts(districts);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = districts.filter(district =>
            district.name.toLowerCase().includes(query) ||
            (district.description && district.description.toLowerCase().includes(query))
        );

        setFilteredDistricts(filtered);
    }, [searchQuery, districts]);

    const handleBackPress = () => {
        console.log('DistrictsManagement: Going back');
        
        // Проверяем, можем ли мы вернуться назад
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            // Если нет возможности вернуться назад, переходим к профилю
            console.log('DistrictsManagement: Going back to Profile');
            navigation.navigate('Main', {
                screen: 'ProfileTab',
                params: {
                    screen: 'ProfileMain'
                }
            });
        }
    };

    const handleAddDistrict = () => {
        setSelectedDistrict(null);
        setAddModalVisible(true);
    };

    const handleEditDistrict = (district) => {
        setSelectedDistrict(district);
        setAddModalVisible(true);
    };

    const handleDeleteDistrict = (districtId) => {
        Alert.alert(
            'Подтверждение',
            'Вы действительно хотите удалить этот район?',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        setOperationInProgress(true);
                        try {
                            await dispatch(deleteDistrict(districtId)).unwrap();
                            Alert.alert('Успех', 'Район успешно удален');
                            await loadDistricts();
                        } catch (err) {
                            Alert.alert('Ошибка', typeof err === 'string' ? err : 'Не удалось удалить район');
                        } finally {
                            setOperationInProgress(false);
                        }
                    }
                }
            ]
        );
    };

    const handleModalClose = () => {
        setAddModalVisible(false);
        setSelectedDistrict(null);
    };

    const handleDistrictFormSubmit = async (formData) => {
        setOperationInProgress(true);
        try {
            if (selectedDistrict) {
                await dispatch(updateDistrict({
                    id: selectedDistrict.id,
                    districtData: formData
                })).unwrap();
                Alert.alert('Успех', 'Район успешно обновлен');
            } else {
                await dispatch(createDistrict(formData)).unwrap();
                Alert.alert('Успех', 'Район успешно создан');
            }

            setAddModalVisible(false);
            await loadDistricts();
            return true;
        } catch (error) {
            const errorMessage = typeof error === 'string' ? error : 'Произошла ошибка при сохранении района';
            Alert.alert('Ошибка', errorMessage);
            return false;
        } finally {
            setOperationInProgress(false);
        }
    };

    const renderDistrictItem = ({ item }) => (
        <DistrictListItem
            district={item}
            onEdit={() => handleEditDistrict(item)}
            onDelete={() => handleDeleteDistrict(item.id)}
        />
    );

    return (
        <View style={styles.container}>
            <AdminHeader
                title="Управление районами"
                onBack={handleBackPress}
                icon={<IconDistrict width={24} height={24} color={Color.blue2} />}
            />

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Список районов</Text>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={handleAddDistrict}
                        disabled={operationInProgress}
                    >
                        <Text style={styles.addButtonText}>Добавить район</Text>
                    </TouchableOpacity>
                </View>

                {/* Заменяем на обычный TextInput с собственными стилями */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputContainer}>
                        <IconSearch width={20} height={20} color={Color.grey7D7D7D} style={styles.searchIcon} />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Поиск районов..."
                            placeholderTextColor={Color.grey7D7D7D}
                            style={styles.searchInput}
                            clearButtonMode="while-editing"
                        />
                    </View>
                </View>

                {isLoading && !refreshing ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Color.blue2} />
                        <Text style={styles.loadingText}>Загрузка районов...</Text>
                    </View>
                ) : error ? (
                    <ErrorState
                        message={error || 'Ошибка загрузки районов'}
                        onRetry={loadDistricts}
                        buttonText="Повторить"
                    />
                ) : filteredDistricts.length === 0 ? (
                    <View style={styles.centered}>
                        {searchQuery ? (
                            <Text style={styles.emptyText}>Районы не найдены</Text>
                        ) : (
                            <>
                                <Text style={styles.emptyText}>Районы отсутствуют</Text>
                                <TouchableOpacity
                                    style={styles.addEmptyButton}
                                    onPress={handleAddDistrict}
                                >
                                    <Text style={styles.addButtonText}>Добавить первый район</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                ) : (
                    <FlatList
                        data={filteredDistricts}
                        renderItem={renderDistrictItem}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.listContainer}
                        refreshing={refreshing}
                        onRefresh={loadDistricts}
                    />
                )}
            </View>

            <AddDistrictModal
                visible={isAddModalVisible}
                onClose={handleModalClose}
                onSubmit={handleDistrictFormSubmit}
                district={selectedDistrict}
                isSubmitting={operationInProgress}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    content: {
        flex: 1,
        padding: normalize(16),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: normalize(16),
    },
    title: {
        fontSize: normalizeFont(FontSize.size_lg),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
    },
    searchContainer: {
        marginBottom: normalize(16),
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: Border.radius.small,
        paddingHorizontal: normalize(12),
        height: normalize(44),
        borderWidth: 1,
        borderColor: Color.border,
    },
    searchIcon: {
        marginRight: normalize(8),
    },
    searchInput: {
        flex: 1,
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textPrimary,
        padding: 0,
        height: '100%',
    },
    addButton: {
        backgroundColor: Color.blue2,
        paddingVertical: normalize(8),
        paddingHorizontal: normalize(12),
        borderRadius: Border.radius.small,
    },
    addEmptyButton: {
        backgroundColor: Color.blue2,
        paddingVertical: normalize(10),
        paddingHorizontal: normalize(16),
        borderRadius: Border.radius.small,
        marginTop: normalize(16),
    },
    addButtonText: {
        color: Color.colorLightMode,
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginTop: normalize(10),
    },
    emptyText: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
    },
    listContainer: {
        paddingBottom: normalize(16),
    },
});