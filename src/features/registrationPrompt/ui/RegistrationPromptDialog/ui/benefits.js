import { featureFlags } from '@shared/config/featureFlags';
import {
    AssistantBenefitIcon,
    ChatBenefitIcon,
    DeliveryBenefitIcon,
    FavoritesBenefitIcon,
    StopsBenefitIcon,
} from './BenefitIcons';

/**
 * Что пользователь получает после регистрации.
 * Состав списка зависит от фичефлагов: пока раздел не выпущен, показываем его
 * с пометкой «скоро», чтобы не обещать недоступную функциональность.
 */
export const getRegistrationBenefits = () => {
    const benefits = [
        {
            id: 'stops',
            Icon: StopsBenefitIcon,
            title: 'Уведомления об остановках',
            description: 'Узнавайте первыми, когда фургон приедет в ваш город',
        },
    ];

    if (featureFlags.chat) {
        benefits.push({
            id: 'chat',
            Icon: ChatBenefitIcon,
            title: 'Чат',
            description: 'Общайтесь с продавцами и поддержкой прямо в приложении',
        });
    }

    benefits.push(
        {
            id: 'assistant',
            Icon: AssistantBenefitIcon,
            title: 'ИИ-помощник',
            description: 'Ответит на вопросы о товарах и заказах в любое время',
        },
        {
            id: 'favorites',
            Icon: FavoritesBenefitIcon,
            title: 'Избранное',
            description: 'Сохраняйте любимое мороженое в один тап',
        },
    );

    benefits.push(
        featureFlags.cart
            ? {
                id: 'delivery',
                Icon: DeliveryBenefitIcon,
                title: 'Корзина и заказы',
                description: 'Собирайте заказ и получайте мороженое прямо домой',
            }
            : {
                id: 'delivery',
                Icon: DeliveryBenefitIcon,
                title: 'Корзина и доставка',
                description: 'Заказ мороженого прямо домой — уже совсем скоро',
                isComingSoon: true,
            },
    );

    return benefits;
};
