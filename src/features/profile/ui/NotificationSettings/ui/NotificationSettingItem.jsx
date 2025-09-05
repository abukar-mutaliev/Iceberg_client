import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, Border } from '@app/styles/GlobalStyles';

export const NotificationSettingItem = ({
    title,
    description,
    value,
    onValueChange,
    disabled = false
}) => {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>{title}</Text>
                    {description && (
                        <Text style={styles.description}>{description}</Text>
                    )}
                </View>
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    disabled={disabled}
                    trackColor={{
                        false: '#767577',
                        true: Color.blue2
                    }}
                    thumbColor={value ? '#FFFFFF' : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        marginBottom: normalize(8),
        borderRadius: Border.br_3xs,
        borderWidth: 0.1,
        overflow: 'hidden'
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: normalize(16),
        paddingHorizontal: normalize(16),
        justifyContent: 'space-between'
    },
    textContainer: {
        flex: 1,
        marginRight: normalize(16)
    },
    title: {
        fontSize: normalizeFont(16),
        fontWeight: '500',
        color: '#000',
        marginBottom: normalize(4)
    },
    description: {
        fontSize: normalizeFont(14),
        color: '#666',
        lineHeight: normalize(18)
    }
});
