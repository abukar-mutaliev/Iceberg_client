import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, TextInput, Animated } from 'react-native';
import { FontFamily, FontSize, Color, Border } from '@app/styles/GlobalStyles';
import { logData } from '@shared/lib/logger';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const DistrictPicker = ({
                                   districts,
                                   selectedDistrict,
                                   setSelectedDistrict,
                                   showDistrictPicker,
                                   setShowDistrictPicker,
                                   error
                               }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const [searchText, setSearchText] = useState('');
    const [filteredDistricts, setFilteredDistricts] = useState(districts);
    const [modalVisible, setModalVisible] = useState(false);
    const slideAnimation = useRef(new Animated.Value(0)).current;

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

    const translateY = slideAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [300, 0]
    });

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

    const selectedDistrictName = React.useMemo(() => {
        if (!selectedDistrict) return 'Выберите район';
        const district = districts.find(d => d.id === selectedDistrict);
        return district ? district.name : 'Выберите район';
    }, [selectedDistrict, districts]);

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
            {error && typeof error === 'string' && error.trim() ? <Text style={styles.errorText}>{String(error)}</Text> : null}

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
                                placeholderTextColor={isDark ? colors.textTertiary : '#999'}
                                keyboardAppearance={isDark ? 'dark' : 'light'}
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

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        marginBottom: normalize(20),
        width: '100%',
    },
    label: {
        fontSize: normalizeFont(15),
        fontWeight: '600',
        color: colors.textPrimary,
        opacity: isDark ? 0.85 : 0.4,
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
        color: isDark ? colors.textTertiary : '#999',
        fontFamily: FontFamily.sFProText,
    },
    pickerButtonTextError: {
        color: '#FF3B30',
    },
    selectedText: {
        color: colors.textPrimary,
    },
    inputUnderline: {
        height: 1,
        backgroundColor: isDark ? colors.divider : '#000',
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
        backgroundColor: isDark ? colors.surface : 'white',
        borderRadius: Border.br_3xs,
        overflow: 'hidden',
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: normalize(16),
        borderBottomWidth: 1,
        borderBottomColor: isDark ? colors.divider : '#eee',
    },
    modalTitle: {
        fontSize: normalizeFont(18),
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
    },
    closeButton: {
        padding: normalize(5),
    },
    closeButtonText: {
        color: isDark ? colors.primary : Color.main,
        fontSize: normalizeFont(16),
        fontFamily: FontFamily.sFProText,
    },
    searchContainer: {
        padding: normalize(10),
        borderBottomWidth: 1,
        borderBottomColor: isDark ? colors.divider : '#eee',
    },
    searchInput: {
        height: normalize(50),
        borderWidth: 1,
        borderColor: isDark ? colors.border : '#ddd',
        borderRadius: Border.br_3xs,
        paddingHorizontal: normalize(10),
        fontFamily: FontFamily.sFProText,
        color: colors.textPrimary,
        backgroundColor: isDark ? colors.surfaceElevated : 'transparent',
    },
    districtItem: {
        padding: normalize(15),
        borderBottomWidth: 1,
        borderBottomColor: isDark ? colors.divider : '#eee',
    },
    selectedItem: {
        backgroundColor: isDark ? colors.primary : Color.main,
    },
    districtName: {
        fontSize: normalizeFont(16),
        fontWeight: '500',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
    },
    districtDescription: {
        fontSize: normalizeFont(14),
        color: isDark ? colors.textSecondary : '#666',
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
        color: isDark ? colors.textTertiary : '#999',
        fontFamily: FontFamily.sFProText,
    },
});
