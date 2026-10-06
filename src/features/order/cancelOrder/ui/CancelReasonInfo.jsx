import React from 'react';
import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useOrderDetailsStyles } from '@shared/ui/OrderDetailsStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const CancelReasonInfo = ({ reason }) => {
    const styles = useOrderDetailsStyles();
    const { colors } = useTheme();

    if (!reason) return null;

    return (
        <View style={styles.modernCard}>
            <View style={styles.cardHeader}>
                <Icon name="report" size={22} color={colors.error} />
                <Text style={styles.cardTitle}>Причина отмены</Text>
            </View>
            <Text style={styles.infoValue}>{reason}</Text>
        </View>
    );
};
