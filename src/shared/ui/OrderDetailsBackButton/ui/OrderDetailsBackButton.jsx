import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useOrderDetailsStyles } from '@shared/ui/OrderDetailsStyles';
import { useOrderDetailsBack } from '@screens/ordes/lib/orderDetailsNavigation';

const ON_PRIMARY_COLOR = '#FFFFFF';

export const OrderDetailsBackButton = ({ fallbackScreen = 'MyOrders', onPress }) => {
    const insets = useSafeAreaInsets();
    const styles = useOrderDetailsStyles();
    const handleGoBack = useOrderDetailsBack({ fallbackScreen, onBack: onPress });

    return (
        <View style={[styles.backButtonContainer, { top: insets.top + 8 }]}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={handleGoBack}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Icon name="arrow-back" size={24} color={ON_PRIMARY_COLOR} />
            </TouchableOpacity>
        </View>
    );
};
