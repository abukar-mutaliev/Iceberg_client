import React from 'react';
import { View, StyleSheet } from 'react-native';
import { normalize } from '@shared/lib/normalize';
import { Color, Border } from '@app/styles/GlobalStyles';
import IconAdd from '@shared/ui/Icon/Profile/JoinTeamIcon';
import CustomButton from '@shared/ui/Button/CustomButton';

export const AddUserButton = ({ onPress }) => {
    return (
        <View style={styles.footer}>
            <CustomButton
                title="Добавить пользователя"
                onPress={onPress}
                color={Color.blue2}
                leftIcon={<IconAdd width={18} height={18} color="white" />}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    footer: {
        padding: normalize(16),
        borderTopWidth: 1,
        borderTopColor: Color.border,
        backgroundColor: Color.colorLightMode,
    },
});

export default AddUserButton;