import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { normalize, normalizeFont } from '@/shared/lib/normalize';
import BackArrowIcon from '@shared/ui/Icon/BackArrowIcon/BackArrowIcon';

export const ProfileHeader = ({ onGoBack }) => {
    return (
        <View style={[styles.header, { height: normalize(76) }]}>
            <Pressable style={[styles.backButton, { padding: normalize(8) }]} onPress={onGoBack}>
                <BackArrowIcon width={normalize(20)} height={normalize(20)} />
            </Pressable>
            <Text style={[styles.headerTitle, { fontSize: normalizeFont(18) }]}>Мой кабинет</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        height: 76,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '500',
        color: '#000000',
        textAlign: 'center',
        flex: 1,
        marginRight: 32,
    },
});

