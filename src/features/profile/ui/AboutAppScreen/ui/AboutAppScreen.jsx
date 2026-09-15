import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import { HeaderWithBackButton } from '@shared/ui/HeaderWithBackButton';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { FontFamily } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import IconRight from '@shared/ui/Icon/Profile/IconRight';
import {
    UPDATE_KIND,
    applyAppUpdate,
    checkAppUpdates,
    openStoreForUpdate,
    promptApplyUpdateError,
    promptAvailableUpdate,
    promptLatestVersion,
    promptUpdateError,
} from '@shared/lib/checkUpdate';

const getAppVersion = () => {
    const config = Constants.expoConfig ?? {};

    // nativeApplicationVersion в Expo Go — это версия Expo Go (например 54.0.8),
    // а не приложения. Берём значения из app.config.js.
    const version = Platform.OS === 'android'
        ? (config.android?.versionName || config.version)
        : (config.ios?.version || config.version);

    const build = Platform.OS === 'android'
        ? config.android?.versionCode
        : config.ios?.buildNumber;

    if (version && build != null && String(build).length > 0) {
        return `${version} (${build})`;
    }

    return version || '—';
};

const UPDATE_STATUS = {
    IDLE: 'idle',
    CHECKING: 'checking',
    AVAILABLE: 'available',
    APPLYING: 'applying',
};

export const AboutAppScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const versionLabel = useMemo(() => getAppVersion(), []);

    const [updateStatus, setUpdateStatus] = useState(UPDATE_STATUS.IDLE);
    const [pendingUpdate, setPendingUpdate] = useState(null);
    const pendingUpdateRef = useRef(null);
    const applyingRef = useRef(false);

    const isUpdateBusy =
        updateStatus === UPDATE_STATUS.CHECKING
        || updateStatus === UPDATE_STATUS.APPLYING;

    const handleBackPress = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate('ProfileMain');
        }
    };

    const handleOpenPrivacyPolicy = () => {
        const appNavigation = navigation.getParent?.('AppStack') || navigation;
        appNavigation.navigate('PrivacyPolicy');
    };

    const handleApplyUpdate = useCallback(async (update) => {
        const target = update || pendingUpdateRef.current;
        if (!target || applyingRef.current) {
            return;
        }

        applyingRef.current = true;

        if (target.kind === UPDATE_KIND.STORE) {
            try {
                await applyAppUpdate(target);
            } catch {
                promptApplyUpdateError();
            } finally {
                applyingRef.current = false;
            }
            return;
        }

        setUpdateStatus(UPDATE_STATUS.APPLYING);
        try {
            await applyAppUpdate(target);
        } catch {
            applyingRef.current = false;
            setUpdateStatus(UPDATE_STATUS.AVAILABLE);
            promptApplyUpdateError();
        }
    }, []);

    const handleCheckOrApplyUpdate = useCallback(async () => {
        if (isUpdateBusy) {
            return;
        }

        if (updateStatus === UPDATE_STATUS.AVAILABLE) {
            await handleApplyUpdate();
            return;
        }

        setUpdateStatus(UPDATE_STATUS.CHECKING);

        try {
            const result = await checkAppUpdates();

            if (result.kind === UPDATE_KIND.STORE || result.kind === UPDATE_KIND.OTA) {
                pendingUpdateRef.current = result;
                setPendingUpdate(result);
                setUpdateStatus(UPDATE_STATUS.AVAILABLE);
                promptAvailableUpdate(result, {
                    onUpdate: () => handleApplyUpdate(result),
                });
                return;
            }

            pendingUpdateRef.current = null;
            setPendingUpdate(null);
            setUpdateStatus(UPDATE_STATUS.IDLE);

            if (result.kind === UPDATE_KIND.LATEST) {
                promptLatestVersion();
                return;
            }

            promptUpdateError({
                onOpenStore: () => openStoreForUpdate().catch(() => {}),
            });
        } catch {
            pendingUpdateRef.current = null;
            setPendingUpdate(null);
            setUpdateStatus(UPDATE_STATUS.IDLE);
            promptUpdateError({
                onOpenStore: () => openStoreForUpdate().catch(() => {}),
            });
        }
    }, [handleApplyUpdate, isUpdateBusy, updateStatus]);

    const updateTitle = useMemo(() => {
        if (updateStatus === UPDATE_STATUS.CHECKING) {
            return 'Проверка обновлений...';
        }
        if (updateStatus === UPDATE_STATUS.APPLYING) {
            return 'Установка обновления...';
        }
        if (updateStatus === UPDATE_STATUS.AVAILABLE) {
            return 'Обновить приложение';
        }
        return 'Проверить обновления';
    }, [updateStatus]);

    const updateHint = useMemo(() => {
        if (updateStatus !== UPDATE_STATUS.AVAILABLE || !pendingUpdate) {
            return null;
        }
        if (pendingUpdate.kind === UPDATE_KIND.STORE && pendingUpdate.latestVersion) {
            return `Доступна версия ${pendingUpdate.latestVersion}`;
        }
        return 'Новая версия готова к установке';
    }, [pendingUpdate, updateStatus]);

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right']}>
            <HeaderWithBackButton
                title="О приложении"
                onBackPress={handleBackPress}
            />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + normalize(32) },
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.hero}>
                    <View style={styles.logoWrap}>
                        <Image
                            source={require('@assets/logo/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>
                    <Text style={styles.appName}>Iceberg</Text>
                    <Text style={styles.tagline}>Мороженое для всех</Text>
                    <Text style={styles.version}>Версия {versionLabel}</Text>
                </View>

                <Text style={styles.description}>
                    Iceberg Ingushetia — приложение для заказа мороженого: каталог товаров,
                    остановки фургонов, склады и доставка. Свежесть, качество и радость
                    в каждом заказе.
                </Text>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.legalItem}
                        onPress={handleOpenPrivacyPolicy}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Согласие на обработку персональных данных"
                    >
                        <Text style={styles.legalItemText}>
                            Согласие на обработку персональных данных
                        </Text>
                        <IconRight color={colors.textTertiary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.legalItem,
                            updateStatus === UPDATE_STATUS.AVAILABLE && styles.updateAvailableItem,
                        ]}
                        onPress={handleCheckOrApplyUpdate}
                        activeOpacity={0.7}
                        disabled={isUpdateBusy}
                        accessibilityRole="button"
                        accessibilityLabel={updateTitle}
                        accessibilityState={{ busy: isUpdateBusy }}
                    >
                        <View style={styles.legalItemContent}>
                            <Text
                                style={[
                                    styles.legalItemText,
                                    styles.updateItemText,
                                    updateStatus === UPDATE_STATUS.AVAILABLE && styles.updateAvailableText,
                                ]}
                            >
                                {updateTitle}
                            </Text>
                            {updateHint ? (
                                <Text style={styles.updateHint}>{updateHint}</Text>
                            ) : null}
                        </View>
                        {isUpdateBusy ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <IconRight
                                color={
                                    updateStatus === UPDATE_STATUS.AVAILABLE
                                        ? colors.primary
                                        : colors.textTertiary
                                }
                            />
                        )}
                    </TouchableOpacity>
                </View>

                <Text style={styles.copyright}>
                    © {new Date().getFullYear()} Iceberg Ingushetia
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
};

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: normalize(20),
        paddingTop: normalize(8),
    },
    hero: {
        alignItems: 'center',
        paddingTop: normalize(16),
        paddingBottom: normalize(24),
    },
    logoWrap: {
        width: normalize(112),
        height: normalize(112),
        borderRadius: normalize(28),
        backgroundColor: colors.surfaceSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: normalize(16),
    },
    logo: {
        width: normalize(80),
        height: normalize(70),
    },
    appName: {
        fontSize: normalizeFont(24),
        fontWeight: '700',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
    },
    tagline: {
        marginTop: normalize(6),
        fontSize: normalizeFont(15),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    version: {
        marginTop: normalize(10),
        fontSize: normalizeFont(13),
        color: colors.textTertiary,
        fontFamily: FontFamily.sFProText,
    },
    description: {
        fontSize: normalizeFont(15),
        lineHeight: normalize(22),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        marginBottom: normalize(28),
    },
    actions: {
        gap: normalize(12),
    },
    legalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        paddingVertical: normalize(16),
        paddingHorizontal: normalize(16),
        borderRadius: normalize(12),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
    },
    updateAvailableItem: {
        borderColor: colors.primary,
    },
    legalItemContent: {
        flex: 1,
        marginRight: normalize(12),
    },
    legalItemText: {
        flex: 1,
        fontSize: normalizeFont(15),
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
        marginRight: normalize(12),
    },
    updateItemText: {
        flex: 0,
        marginRight: 0,
    },
    updateAvailableText: {
        color: colors.primary,
        fontWeight: '600',
    },
    updateHint: {
        marginTop: normalize(4),
        fontSize: normalizeFont(12),
        color: colors.textTertiary,
        fontFamily: FontFamily.sFProText,
    },
    copyright: {
        marginTop: normalize(32),
        fontSize: normalizeFont(12),
        color: colors.textTertiary,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
    },
});

export default AboutAppScreen;
