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

export const AdminMenuItem = ({ icon, title, onPress, color = Color.blue2, badgeCount = 0 }) => {
    const [isActive, setIsActive] = useState(false);
    const hasBadge = Number(badgeCount) > 0;
    const badgeText = badgeCount > 99 ? '99+' : String(badgeCount);

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
            <View style={styles.rightContainer}>
                {hasBadge && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{badgeText}</Text>
                    </View>
                )}
                <IconRight color={isActive ? '#fff' : Color.grayDarker} />
            </View>
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
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    badge: {
        minWidth: normalize(20),
        height: normalize(20),
        borderRadius: normalize(10),
        paddingHorizontal: normalize(6),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Color.red,
        marginRight: normalize(8),
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: normalizeFont(11),
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
    },
});

export default React.memo(AdminMenuItem);
