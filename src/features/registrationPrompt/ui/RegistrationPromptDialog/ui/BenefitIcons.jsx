import React from 'react';
import Svg, { Path } from 'react-native-svg';
import IconNotification from '@shared/ui/Icon/Profile/IconNotification';
import { CartIcon, ChatIcon, FavouritesIcon } from '@shared/ui/Icon/TabBarIcons';

/**
 * Иконки для списка преимуществ. Все принимают одинаковый контракт
 * ({ color, size }), т.к. общие иконки приложения используют разные пропсы.
 */

export const StopsBenefitIcon = ({ color, size = 22 }) => (
    <IconNotification width={size} height={size} color={color} />
);

export const ChatBenefitIcon = ({ color, size = 22 }) => (
    <ChatIcon color={color} size={size} />
);

export const FavoritesBenefitIcon = ({ color, size = 22 }) => (
    <FavouritesIcon width={size} height={size} color={color} />
);

export const DeliveryBenefitIcon = ({ color, size = 22 }) => (
    <CartIcon width={size} height={size * 0.8} color={color} />
);

export const AssistantBenefitIcon = ({ color, size = 22 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M10.5 2.5L12.6 8.4L18.5 10.5L12.6 12.6L10.5 18.5L8.4 12.6L2.5 10.5L8.4 8.4L10.5 2.5Z"
            stroke={color}
            strokeWidth={1.5}
            strokeLinejoin="round"
        />
        <Path
            d="M18.5 15.5L19.4 17.6L21.5 18.5L19.4 19.4L18.5 21.5L17.6 19.4L15.5 18.5L17.6 17.6L18.5 15.5Z"
            fill={color}
        />
    </Svg>
);
