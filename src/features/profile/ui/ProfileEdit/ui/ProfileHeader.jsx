import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, PixelRatio } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import {BackButton} from "@shared/ui/Button/BackButton";

export const ProfileHeader = ({ title, onGoBack }) => {
    return (
        <View style={styles.header}>
            {onGoBack ? (
                    <BackButton />
            ) : (
                <View style={styles.placeholder} />
            )}
            <Text style={styles.title}>{title}</Text>
            <View style={styles.placeholder} />
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        height: normalize(76),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: normalize(16),
        backgroundColor: '#FFFFFF',
        borderBottomColor: '#F5F5F5',
        paddingTop: normalize(25),
    },
    backButton: {
        padding: normalize(8),
    },
    placeholder: {
        width: normalize(32),
    },
    title: {
        fontSize: normalizeFont(18),
        fontWeight: '500',
        color: '#000000',
        textAlign: 'center',
        flex: 1,
    },
});

export default ProfileHeader;