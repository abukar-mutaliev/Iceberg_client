import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, TextInput, Animated } from 'react-native';
import { FontFamily, FontSize, Color, Border } from '@app/styles/GlobalStyles';
import { logData } from '@shared/lib/logger';
import { normalize, normalizeFont } from '@shared/lib/normalize';

export const DistrictPicker = ({
                                   districts,
                                   selectedDistrict,
                                   setSelectedDistrict,
                                   showDistrictPicker,
                                   setShowDistrictPicker,
                                   error
                               }) => {
    const [searchText, setSearchText] = useState('');
    const [filteredDistricts, setFilteredDistricts] = useState(districts);
    const [modalVisible, setModalVisible] = useState(false);
    const slideAnimation = useRef(new Animated.Value(0)).current;

    // Handle modal visibility with animation
    useEffect(() => {
        if (showDistrictPicker) {
            setModalVisible(true);
            Animated.timing(slideAnimation, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true
            }).start();
        } else {
            Animated.timing(slideAnimation, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true
            }).start(() => {
                setModalVisible(false);
            });
        }
    }, [showDistrictPicker]);

    // Calculate animation values
    const translateY = slideAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [300, 0]
    });

    // Обновление списка районов при изменении поиска или списка районов
    useEffect(() => {
        if (!searchText) {
            setFilteredDistricts(districts);
            return;
        }

        const filtered = districts.filter(district =>
            district.name.toLowerCase().includes(searchText.toLowerCase()) ||
            (district.description && district.description.toLowerCase().includes(searchText.toLowerCase()))
        );
        setFilteredDistricts(filtered);
    }, [searchText, districts]);

    // Найти название выбранного района
    const selectedDistrictName = React.useMemo(() => {
        if (!selectedDistrict) return 'Выберите район';
        const district = districts.find(d => d.id === selectedDistrict);
        return district ? district.name : 'Выберите район';
    }, [selectedDistrict, districts]);

    // Обработчик выбора района
    const handleSelect = (districtId) => {
        setSelectedDistrict(districtId);
        setShowDistrictPicker(false);
        setSearchText('');
        logData('Выбран район', { districtId });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Район *</Text>
            <TouchableOpacity
                style={[
                    styles.pickerButton,
                    error ? styles.pickerButtonError : null
                ]}
                onPress={() => setShowDistrictPicker(true)}
            >
                <Text style={[
                    styles.pickerButtonText,
                    error ? styles.pickerButtonTextError : null,
                    selectedDistrict ? styles.selectedText : null
                ]}>
                    {selectedDistrictName}
                </Text>
            </TouchableOpacity>
            <View style={[styles.inputUnderline, error ? styles.underlineError : null]} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="none"
                onRequestClose={() => setShowDistrictPicker(false)}
            >
                <Animated.View
                    style={[
                        styles.modalBackdrop,
                        {
                            opacity: slideAnimation
                        }
                    ]}
                >
                    <TouchableOpacity
                        style={styles.backdropTouchable}
                        activeOpacity={1}
                        onPress={() => setShowDistrictPicker(false)}
                    />

                    <Animated.View
                        style={[
                            styles.modalContent,
                            {
                                transform: [{ translateY: translateY }]
                            }
                        ]}
                    >
                        <View style={styles.header}>
                            <Text style={styles.modalTitle}>Выберите район</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setShowDistrictPicker(false)}
                            >
                                <Text style={styles.closeButtonText}>Закрыть</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchContainer}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Поиск района..."
                                value={searchText}
                                onChangeText={setSearchText}
                                placeholderTextColor="#999"
                            />
                        </View>

                        <FlatList
                            data={filteredDistricts}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.districtItem,
                                        selectedDistrict === item.id && styles.selectedItem
                                    ]}
                                    onPress={() => handleSelect(item.id)}
                                >
                                    <Text style={[
                                        styles.districtName,
                                        selectedDistrict === item.id && styles.selectedItemText
                                    ]}>
                                        {item.name}
                                    </Text>
                                    {item.description && (
                                        <Text style={[
                                            styles.districtDescription,
                                            selectedDistrict === item.id && styles.selectedItemText
                                        ]}>
                                            {item.description}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={() => (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>
                                        {searchText ? 'Районы не найдены' : 'Список районов пуст'}
                                    </Text>
                                </View>
                            )}
                        />
                    </Animated.View>
                </Animated.View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: normalize(20),
        width: '100%',
    },
    label: {
        fontSize: normalizeFont(15),
        fontWeight: '600',
        color: Color.dark,
        opacity: 0.4,
        marginBottom: 0,
        fontFamily: FontFamily.sFProText,
    },
    pickerButton: {
        height: normalize(30),
        justifyContent: 'center',
    },
    pickerButtonError: {
        borderColor: '#FF3B30',
    },
    pickerButtonText: {
        fontSize: normalizeFont(FontSize.size_xs),
        color: '#999',
        fontFamily: FontFamily.sFProText,
    },
    pickerButtonTextError: {
        color: '#FF3B30',
    },
    selectedText: {
        color: Color.dark,
    },
    inputUnderline: {
        height: 1,
        backgroundColor: '#000',
        marginTop: 0,
    },
    underlineError: {
        backgroundColor: '#FF3B30',
        height: 1.5,
    },
    errorText: {
        color: '#FF3B30',
        fontSize: normalizeFont(FontSize.size_xs),
        marginTop: normalize(5),
        fontFamily: FontFamily.sFProText,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdropTouchable: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContent: {
        width: '90%',
        maxHeight: '80%',
        backgroundColor: 'white',
        borderRadius: Border.br_3xs,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: normalize(16),
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: normalizeFont(18),
        fontWeight: '600',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    closeButton: {
        padding: normalize(5),
    },
    closeButtonText: {
        color: Color.main,
        fontSize: normalizeFont(16),
        fontFamily: FontFamily.sFProText,
    },
    searchContainer: {
        padding: normalize(10),
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    searchInput: {
        height: normalize(50),
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: Border.br_3xs,
        paddingHorizontal: normalize(10),
        fontFamily: FontFamily.sFProText,
    },
    districtItem: {
        padding: normalize(15),
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    selectedItem: {
        backgroundColor: Color.main,
    },
    districtName: {
        fontSize: normalizeFont(16),
        fontWeight: '500',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    districtDescription: {
        fontSize: normalizeFont(14),
        color: '#666',
        marginTop: normalize(4),
        fontFamily: FontFamily.sFProText,
    },
    selectedItemText: {
        color: 'white',
    },
    emptyContainer: {
        padding: normalize(20),
        alignItems: 'center',
    },
    emptyText: {
        fontSize: normalizeFont(16),
        color: '#999',
        fontFamily: FontFamily.sFProText,
    },
});