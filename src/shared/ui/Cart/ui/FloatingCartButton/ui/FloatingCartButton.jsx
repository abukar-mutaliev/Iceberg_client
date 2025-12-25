import React from 'react';
import {
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions
} from 'react-native';
import { CartBadge } from '@features/cart/ui/CartBadge';
import { useCartStats } from '@entities/cart';
import {
    Color,
    Shadow,
    Border,
    Padding
} from '@app/styles/globalStyles';

const { width } = Dimensions.get('window');

export const FloatingCartButton = ({ navigation, visible = true }) => {
    const { isEmpty } = useCartStats();
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: visible && !isEmpty ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [visible, isEmpty]);

    const handlePress = () => {
        navigation.navigate('Cart');
    };

    if (isEmpty) {
        return null;
    }

    return (
        <Animated.View
            style={[
                floatingStyles.container,
                { opacity: fadeAnim }
            ]}
            pointerEvents={visible && !isEmpty ? 'auto' : 'none'}
        >
            <CartBadge onPress={handlePress} />
        </Animated.View>
    );
};

const floatingStyles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        zIndex: 1000,
    },
});

