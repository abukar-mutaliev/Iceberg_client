import React, {useCallback, useState} from 'react';
import {
    TouchableOpacity,
    View,
    Text,
    StyleSheet
} from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, Border } from '@app/styles/GlobalStyles';
import IconRight from '@shared/ui/Icon/Profile/IconRight';

export const AdminMenuItem = ({ icon, title, onPress, color = Color.blue2 }) => {
    const [isActive, setIsActive] = useState(false);

    const handlePress = () => {
        setIsActive(true);

        const timer = setTimeout(() => {
            setIsActive(false);
            setTimeout(() => {
                if (typeof onPress === 'function') {
                    onPress();
                }
            }, 100);
        }, 200);

        return () => {
            clearTimeout(timer);
        };
    };

    return (
        <TouchableOpacity
            style={[
                styles.menuItem,
                isActive && styles.activeMenuItem
            ]}
            onPress={handlePress}
        >
            <View style={styles.menuItemIcon}>
                {React.isValidElement(icon)
                    ? React.cloneElement(icon, {
                        color: isActive ? '#fff' : color
                    })
                    : icon
                }
            </View>
            <Text style={[
                styles.menuItemText,
                isActive && styles.activeMenuItemText
            ]}>
                {title}
            </Text>
            <IconRight color={isActive ? '#fff' : Color.grayDarker} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: normalize(15),
        paddingHorizontal: normalize(16),
        borderBottomWidth: 0.5,
        borderBottomColor: Color.border,
        backgroundColor: Color.colorLightMode,
        position: 'relative',
    },
    menuItemIcon: {
        width: normalize(24),
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuItemText: {
        flex: 1,
        marginLeft: normalize(15),
        fontSize: normalizeFont(16),
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    activeMenuItem: {
        backgroundColor: Color.blue2,
    },
    activeMenuItemText: {
        color: '#fff',
    },
});

export default React.memo(AdminMenuItem);
