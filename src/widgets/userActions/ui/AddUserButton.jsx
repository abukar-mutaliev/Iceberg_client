import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { normalize } from '@shared/lib/normalize';
import IconAdd from '@shared/ui/Icon/Profile/JoinTeamIcon';
import CustomButton from '@shared/ui/Button/CustomButton';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const AddUserButton = ({ onPress }) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.footer}>
            <CustomButton
                title="Добавить пользователя"
                onPress={onPress}
                color={colors.primary}
                leftIcon={<IconAdd width={18} height={18} color={colors.textInverse} />}
            />
        </View>
    );
};

const createStyles = (colors) => StyleSheet.create({
    footer: {
        padding: normalize(16),
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.surface,
    },
});

export default AddUserButton;