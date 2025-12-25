import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import ArrowBackIcon from '@shared/ui/Icon/Common/ArrowBackIcon';

export const OrdersSkeleton = ({ onGoBack }) => {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.backButton}>
                    <ArrowBackIcon />
                </View>
                <View style={styles.headerTitle} />
            </View>

            <FlatList
                data={[1,2,3,4,5,6,7,8]}
                keyExtractor={(i) => i.toString()}
                renderItem={() => (
                    <View style={styles.skeletonCard}>
                        <View style={styles.skeletonHeader} />
                        <View style={styles.skeletonLineWide} />
                        <View style={styles.skeletonLine} />
                        <View style={styles.skeletonFooter} />
                    </View>
                )}
                contentContainerStyle={styles.listContentContainer}
                ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        height: 24,
        width: 200,
        backgroundColor: '#eee',
        borderRadius: 6,
        marginHorizontal: 16,
    },
    listContentContainer: {
        paddingHorizontal: 10,
        paddingTop: 24,
    },
    cardSeparator: {
        height: 20,
    },
    skeletonCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 10,
        marginVertical: 6,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    skeletonHeader: {
        height: 16,
        width: '40%',
        backgroundColor: '#eee',
        borderRadius: 6,
        marginBottom: 12,
    },
    skeletonLineWide: {
        height: 14,
        width: '85%',
        backgroundColor: '#eee',
        borderRadius: 6,
        marginBottom: 8,
    },
    skeletonLine: {
        height: 14,
        width: '60%',
        backgroundColor: '#eee',
        borderRadius: 6,
        marginBottom: 12,
    },
    skeletonFooter: {
        height: 24,
        width: '30%',
        backgroundColor: '#eee',
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
});
