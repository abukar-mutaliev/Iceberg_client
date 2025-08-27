import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import CustomButton from '@shared/ui/Button/CustomButton';
import {UserCard} from "@entities/user";

export const UserList = ({
                             items,
                             isLoading,
                             error,
                             refreshing,
                             handleRefresh,
                             handleLoadMore,
                             renderEmptyList,
                             onEdit,
                             onDelete,
                             onRoleChange,
                             onProcessingRoleChange,
                             currentUser
                         }) => {
    const renderFooter = () => {
        if (!isLoading) return null;

        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={Color.blue2} />
                <Text style={styles.footerText}>Загрузка...</Text>
            </View>
        );
    };

    const renderSeparator = () => (
        <View style={styles.separator} />
    );

    if (isLoading && items.length === 0) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Color.blue2} />
                <Text style={styles.loadingText}>Загрузка пользователей...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Ошибка: {error}</Text>
                <CustomButton
                    title="Повторить"
                    onPress={handleRefresh}
                    color={Color.blue2}
                    style={{ marginTop: normalize(16) }}
                />
            </View>
        );
    }

    return (
        <FlatList
            data={items}
            renderItem={({ item }) => (
                <UserCard
                    user={item}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onRoleChange={onRoleChange}
                    onProcessingRoleChange={onProcessingRoleChange}
                    currentUser={currentUser}
                />
            )}
            keyExtractor={(item, index) => `user-${item.id}-${index}`}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={renderSeparator}
            ListEmptyComponent={renderEmptyList}
            ListFooterComponent={renderFooter}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            removeClippedSubviews={false}
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={10}
        />
    );
};

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: normalize(20),
    },
    loadingText: {
        fontSize: normalizeFont(14),
        color: Color.textSecondary,
        marginTop: normalize(10),
    },
    listContent: {
        flexGrow: 1,
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(8),
    },
    separator: {
        height: normalize(8),
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: normalize(20),
    },
    errorText: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: 'red',
        textAlign: 'center',
    },
    footerLoader: {
        paddingVertical: normalize(16),
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    footerText: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginLeft: normalize(8),
    }
});

export default UserList;