import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';

export const AdminMenuSection = ({ title, children }) => {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.sectionContent}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        marginTop: normalize(16),
        marginHorizontal: normalize(20),
        marginBottom: normalize(8),
    },
    sectionTitle: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.grey7D7D7D,
        marginBottom: normalize(8),
    },
    sectionContent: {
        borderRadius: Border.radius.large,
        backgroundColor: Color.colorLightMode,
        ...Shadow.light,
        overflow: 'hidden',
    },
});

export default AdminMenuSection;

