// 3. features/ProfileInfo/ui/ProfileMenu.js
// Компонент меню профиля, специфичный для ProfileInfo

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { IconRight } from '@shared/ui/Icon/Profile';
import ButtonPressBackgroundBlue from '@shared/ui/Button/ButtonPressBackgroundBlue';
import { normalize, normalizeFont } from '@/shared/lib/normalize';

export const ProfileMenu = ({ menuItems, activeItemId, setActiveItemId }) => {
    return (
        <View style={styles.menuContainer}>
            {menuItems.map((item, index) => (
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
                    {activeItemId === item.id && <ButtonPressBackgroundBlue />}
                    <View style={styles.menuIconContainer}>
                        {React.cloneElement(item.icon, {
                            color: activeItemId === item.id ? '#FFFFFF' : '#000000',
                        })}
                    </View>
                    <Text
                        style={[styles.menuItemText, activeItemId === item.id && styles.menuItemTextActive]}
                    >
                        {item.title}
                    </Text>
                    <IconRight
                        style={styles.arrowIcon}
                        color={activeItemId === item.id ? '#FFFFFF' : '#C8C8C8'}
                    />
                </Pressable>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    menuContainer: {
        marginHorizontal: normalize(15),
        borderColor: '#E5E5E5',
        borderBottomWidth: 0.5,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        height: normalize(70),
        borderColor: '#E5E5E5',
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
        color: '#000000',
        zIndex: 1,
    },
    menuItemTextActive: {
        color: '#FFFFFF',
    },
    arrowIcon: {
        marginRight: normalize(15),
        zIndex: 1,
    },
});
