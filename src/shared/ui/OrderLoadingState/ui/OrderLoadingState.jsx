import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { createOrderDetailsStyles } from '@shared/ui/OrderDetailsStyles';

const styles = createOrderDetailsStyles();

export const OrderLoadingSkeleton = () => (
    <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <View style={styles.scrollContainer}>
            {/* Заголовок */}
            <View style={styles.headerContainer}>
                <View style={styles.headerGradient}>
                    <View style={styles.headerContent}>
                        <View style={styles.headerTop}>
                            <View style={styles.orderNumberContainer}>
                                <View style={{ height: 16, width: 120, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 8, marginBottom: 8 }} />
                                <View style={{ height: 12, width: 80, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6 }} />
                            </View>
                            <View style={{ height: 24, width: 100, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 }} />
                        </View>
                        <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginTop: 12 }} />
                    </View>
                </View>
            </View>

            {/* Пара карточек-скелетонов */}
            {[1,2].map(i => (
                <View key={i} style={styles.modernCard}>
                    <View style={{ height: 18, width: 160, backgroundColor: '#eee', borderRadius: 8, marginBottom: 16 }} />
                    <View style={{ height: 14, width: '80%', backgroundColor: '#eee', borderRadius: 6, marginBottom: 10 }} />
                    <View style={{ height: 14, width: '60%', backgroundColor: '#eee', borderRadius: 6, marginBottom: 10 }} />
                    <View style={{ height: 14, width: '70%', backgroundColor: '#eee', borderRadius: 6 }} />
                </View>
            ))}
        </View>
    </View>
);

export const OrderErrorState = ({ error, onRetry }) => (
    <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <View style={styles.errorContainer}>
            <View style={styles.errorIconContainer}>
                <Icon name="error-outline" size={64} color="#EF5350" />
            </View>
            <Text style={styles.errorTitle}>Ошибка загрузки</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity
                style={styles.retryButton}
                onPress={onRetry}
                activeOpacity={0.8}
            >
                <Icon name="refresh" size={20} color="#667eea" />
                <Text style={styles.retryButtonText}>Повторить</Text>
            </TouchableOpacity>
        </View>
    </View>
);

export const OrderLoadingState = () => (
    <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Загрузка заказа...</Text>
        </View>
    </View>
);


