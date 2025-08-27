import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import BackArrowIcon from "@shared/ui/Icon/BackArrowIcon/BackArrowIcon";
import MapView, { Marker } from 'react-native-maps';
import { selectUser } from '@entities/auth/model/selectors';
import { formatTimeRange } from "@shared/lib/dateFormatters";

export const StopDetailsContent = ({ stop, navigation }) => {
    const user = useSelector(selectUser);
    const defaultCoords = { latitude: 43.172837, longitude: 44.811913 };
    const [mapCoordinates, setMapCoordinates] = useState(defaultCoords);

    const canEdit = ['DRIVER', 'ADMIN', 'EMPLOYEE'].includes(user?.role);

    if (!stop) {
        return null;
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDateTime = (dateString) => {
        return `${formatTime(dateString)}, ${formatDate(dateString)}`;
    };

    const handleEditPress = () => {
        navigation.navigate('EditStop', { stopId: stop.id });
    };

    useEffect(() => {
        if (!stop) return;

        if (stop.mapLocation) {
            try {
                const parsed = JSON.parse(stop.mapLocation);
                if (parsed && typeof parsed === 'object' && 'latitude' in parsed && 'longitude' in parsed) {
                    setMapCoordinates({
                        latitude: parsed.latitude,
                        longitude: parsed.longitude
                    });
                    return;
                }
            } catch (error) {
                console.log('Ошибка при парсинге JSON координат:', error.message);

                try {
                    const regex = /latitude"?:\s*(-?\d+\.?\d*),\s*"?longitude"?:\s*(-?\d+\.?\d*)/;
                    const match = stop.mapLocation.match(regex);
                    if (match && match[1] && match[2]) {
                        const latitude = parseFloat(match[1]);
                        const longitude = parseFloat(match[2]);

                        if (!isNaN(latitude) && !isNaN(longitude)) {
                            setMapCoordinates({ latitude, longitude });
                            return;
                        }
                    }
                } catch (regexError) {
                    console.log('Ошибка при извлечении координат:', regexError.message);
                }
            }
        }

    }, [stop]);

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <BackArrowIcon size={20} color="#3478F6" />
                </TouchableOpacity>

                <View style={styles.titleContainer}>
                    <Text style={styles.districtName}>{stop.district?.name || ''}</Text>
                </View>

                {/* Пустой элемент для баланса с кнопкой назад */}
                <View style={styles.backButton} />
            </View>

            <View style={styles.content}>
                <View style={styles.addressContainer}>
                    <Text style={styles.address}>{stop.address}</Text>
                </View>

                <View style={styles.dateTimeContainer}>
                    <Text style={styles.dateTime}>
                        {formatTimeRange(stop.startTime, stop.endTime)}
                    </Text>
                </View>

                {stop.photo && (
                    <Image
                        source={{ uri: typeof stop.photo === 'string' ? stop.photo : stop.photo.uri }}
                        style={styles.photo}
                        resizeMode="cover"
                        defaultSource={require('@assets/images/placeholder.png')}
                    />
                )}

                {!stop.photo && (
                    <View style={styles.photoPlaceholder}>
                        <Text style={styles.photoPlaceholderText}>Нет изображения</Text>
                    </View>
                )}

                <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                        <View style={styles.infoLabelContainer}>
                            <Text style={styles.infoLabel}>Модель:</Text>
                        </View>
                        <View style={styles.infoValueContainer}>
                            <Text style={styles.infoValue}>{stop.truckModel || 'Не указано'}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoLabelContainer}>
                            <Text style={styles.infoLabel}>Номер:</Text>
                        </View>
                        <View style={styles.infoValueContainer}>
                            <Text style={styles.infoValue}>{stop.truckNumber || 'Не указано'}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoLabelContainer}>
                            <Text style={styles.infoLabel}>Район:</Text>
                        </View>
                        <View style={styles.infoValueContainer}>
                            <Text style={styles.infoValue}>{stop.district?.name || 'Не указано'}</Text>
                        </View>
                    </View>
                </View>

                {stop.description && (
                    <View style={styles.descriptionContainer}>
                        <Text style={styles.description}>{stop.description}</Text>
                    </View>
                )}

                <View style={styles.mapContainer}>
                    <MapView
                        style={styles.map}
                        initialRegion={{
                            latitude: mapCoordinates.latitude,
                            longitude: mapCoordinates.longitude,
                            latitudeDelta: 0.005,
                            longitudeDelta: 0.005,
                        }}
                    >
                        <Marker
                            coordinate={{
                                latitude: mapCoordinates.latitude,
                                longitude: mapCoordinates.longitude,
                            }}
                            title={stop.address}
                        />
                    </MapView>
                </View>

                {canEdit && (
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={handleEditPress}
                    >
                        <Text style={styles.editButtonText}>Редактировать</Text>
                    </TouchableOpacity>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingTop: 24,
    },
    backButton: {
        padding: 15,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    districtName: {
        fontSize: FontSize.size_md,
        fontWeight: '500',
        color: Color.dark,
        fontFamily: FontFamily.sFProText || "system",
        textAlign: 'center',
    },
    content: {
        padding: 16,
    },
    addressContainer: {
        marginBottom: 8,
    },
    address: {
        fontSize: FontSize.size_lg,
        fontFamily: FontFamily.sFProText || "system",
        color: Color.dark,
        letterSpacing: 0.9,
    },
    dateTimeContainer: {
        marginBottom: 16,
    },
    dateTime: {
        fontSize: FontSize.size_lg,
        fontFamily: FontFamily.sFProText || "system",
        color: Color.dark,
        lineHeight: 30,
    },
    photo: {
        width: '100%',
        height: 250,
        borderRadius: 8,
        marginBottom: 16,
    },
    photoPlaceholder: {
        width: '100%',
        height: 250,
        borderRadius: 8,
        marginBottom: 16,
        backgroundColor: '#f2f2f2',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderStyle: 'dashed',
    },
    photoPlaceholderText: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        color: '#999',
    },
    infoSection: {
        marginTop: 16,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    infoLabelContainer: {
        width: 80,
    },
    infoLabel: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        color: Color.blue2,
        letterSpacing: 0.8,
    },
    infoValueContainer: {
        flex: 1,
    },
    infoValue: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        color: Color.dark,
        letterSpacing: 0.8,
    },
    descriptionContainer: {
        marginTop: 16,
        marginBottom: 24,
    },
    description: {
        fontSize: 14,
        fontFamily: FontFamily.sFProText,
        color: Color.dark,
        letterSpacing: 0.7,
        lineHeight: 17,
    },
    mapContainer: {
        height: 250,
        marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    editButton: {
        backgroundColor: Color.blue2,
        height: 40,
        borderRadius: Border.br_3xs,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 20,
    },
    editButtonText: {
        color: Color.colorLightMode,
        fontSize: FontSize.size_md,
        fontWeight: '500',
        fontFamily: FontFamily.sFProText,
    },
});