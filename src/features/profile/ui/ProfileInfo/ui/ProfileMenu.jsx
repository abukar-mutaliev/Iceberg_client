import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { IconRight } from '@shared/ui/Icon/Profile';
import ButtonPressBackgroundBlue from '@shared/ui/Button/ButtonPressBackgroundBlue';
import { normalize, normalizeFont } from '@/shared/lib/normalize';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const ProfileMenu = ({ menuItems, activeItemId, setActiveItemId }) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.menuContainer}>
            {menuItems.map((item, index) => {
                const isActive = activeItemId === item.id;
                return (
                    <Pressable
                        key={item.id}
                        style={[styles.menuItem, { borderTopWidth: index === 0 ? 0.5 : 0 }]}
                        onPress={() => {
                            setActiveItemId(item.id);
                            setTimeout(() => {
                                setActiveItemId(null);
                                item.onPress();
                            }, 150);
                        }}
                    >
                        {isActive && <ButtonPressBackgroundBlue />}
                        <View style={styles.menuIconContainer}>
                            {React.cloneElement(item.icon, {
                                color: isActive ? colors.menuItemActiveText : colors.textPrimary,
                            })}
                        </View>
                        <Text
                            style={[styles.menuItemText, isActive && styles.menuItemTextActive]}
                        >
                            {item.title}
                        </Text>
                        <IconRight
                            style={styles.arrowIcon}
                            color={isActive ? colors.menuItemActiveText : colors.textTertiary}
                        />
                    </Pressable>
                );
            })}
        </View>
    );
};

const createStyles = (colors) => StyleSheet.create({
    menuContainer: {
        marginHorizontal: normalize(15),
        borderColor: colors.divider,
        borderBottomWidth: 0.5,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        height: normalize(70),
        borderColor: colors.divider,
        borderBottomWidth: 0.8,
        position: 'relative',
    },
    menuIconContainer: {
        marginLeft: normalize(15),
        width: normalize(24),
        alignItems: 'center',
        zIndex: 1,
    },
    menuItemText: {
        fontSize: normalizeFont(16),
        marginLeft: normalize(15),
        flex: 1,
        color: colors.textPrimary,
        zIndex: 1,
    },
    menuItemTextActive: {
        color: colors.menuItemActiveText,
    },
    arrowIcon: {
        marginRight: normalize(15),
        zIndex: 1,
    },
});
