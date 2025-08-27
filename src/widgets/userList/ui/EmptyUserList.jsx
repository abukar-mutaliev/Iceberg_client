import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import IconUser from '@shared/ui/Icon/Profile/IconPersona';
import CustomButton from '@shared/ui/Button/CustomButton';

export const EmptyUserList = ({ searchQuery, selectedRole, onRefresh }) => {
    return (
        <View style={styles.emptyContainer}>
            <IconUser width={48} height={48} color={Color.grey7D7D7D} />
            <Text style={styles.emptyText}>Пользователи не найдены</Text>
            <Text style={styles.emptySubtext}>
                {searchQuery || selectedRole
                    ? 'Попробуйте изменить параметры поиска или фильтры'
                    : 'Список пользователей пуст'}
            </Text>
            <CustomButton
                title="Обновить"
                onPress={onRefresh}
                color={Color.blue2}
                style={{ marginTop: normalize(16) }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: normalize(20),
        minHeight: normalize(200),
    },
    emptyText: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
        marginTop: normalize(16),
    },
    emptySubtext: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        textAlign: 'center',
        marginTop: normalize(8),
    },
});

export default EmptyUserList;