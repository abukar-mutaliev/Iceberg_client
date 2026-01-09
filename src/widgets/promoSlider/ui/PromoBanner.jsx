import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Linking } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { selectActiveMainBanners, selectBannerStatus } from '@entities/banner';
import { Border } from '@app/styles/GlobalStyles';
import { getBaseUrl } from '@shared/api/api';

export const PromoBanner = ({ hideLoader = true }) => {
    const navigation = useNavigation();
    const activeBanners = useSelector(selectActiveMainBanners);
    const status = useSelector(selectBannerStatus);
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);


    useEffect(() => {
        if (activeBanners.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentBannerIndex(prevIndex =>
                prevIndex === activeBanners.length - 1 ? 0 : prevIndex + 1
            );
        }, 5000);

        return () => clearInterval(interval);
    }, [activeBanners.length]);

    const handleBannerPress = () => {
        const banner = activeBanners[currentBannerIndex];
        if (!banner || !banner.clickUrl) return;

        if (banner.clickUrl.startsWith('http')) {
            Linking.openURL(banner.clickUrl);
        } else if (banner.clickUrl.startsWith('screen://')) {
            const screenName = banner.clickUrl.replace('screen://', '');
            navigation.navigate(screenName);
        }
    };

    // Никогда не показываем спиннер — либо баннеры, либо ничего

    if (activeBanners.length === 0) {
        return null;
    }

    const currentBanner = activeBanners[currentBannerIndex];

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={handleBannerPress}
            activeOpacity={0.9}
        >
            <Image
                style={styles.bannerImage}
                resizeMode="cover"
                source={{
                    uri: currentBanner.image.startsWith('http')
                        ? currentBanner.image
                        : getImageUrl(currentBanner.image)
                }}
                defaultSource={require('@assets/promo-banner.png')}
            />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: Border.br_3xs,
        overflow: 'hidden',
        marginHorizontal: 25,
        marginTop: 30,
        marginBottom: 19,
        height: 169,
        position: 'relative',
    },
    bannerImage: {
        width: '100%',
        height: '100%',
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        marginHorizontal: 4,
    },
    activeIndicator: {
        backgroundColor: '#FFFFFF',
        width: 10,
        height: 10,
        borderRadius: 5,
    }
});