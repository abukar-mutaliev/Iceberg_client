import React from 'react';
import { Platform } from 'react-native';
import LogoSvg from '@/assets/logo/logo.svg';

export const Logo = ({ width, height }) => {
    if (Platform.OS === 'web') {
        return (
            <img
                src={'@/assets/logo/logo.svg'}
                style={{ width, height }}
                alt="Logo"
            />
        );
    }

    return <LogoSvg width={width} height={height} />;
};