import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Platform } from 'react-native';
import PushNotificationService from '@shared/services/PushNotificationService';
import { useNotificationOnboardingHint } from '@shared/hooks/useNotificationOnboardingHint';
// import { useHeadsUpNotificationPrompt } from '@shared/hooks/useHeadsUpNotificationPrompt';

export const usePushTokenAutoRegistration = () => {
  const user = useSelector((s) => s.auth?.user);
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);
  const hasAttemptedRegistration = useRef(false);

  // 1️⃣ Базовый запрос разрешения на уведомления после авторизации
  useNotificationOnboardingHint({ isAuthenticated, userId: user?.id });
  
  // 2️⃣ Подсказка про всплывающие уведомления при первом получении push
  // ОТКЛЮЧЕНО: всплывающие уведомления работают
  // useHeadsUpNotificationPrompt({ isAuthenticated });

  useEffect(() => {
    const register = async () => {
      try {
        if (!isAuthenticated || !user) {
          hasAttemptedRegistration.current = false;
          return;
        }

        if (hasAttemptedRegistration.current) {
          return;
        }

        hasAttemptedRegistration.current = true;

        const success = await PushNotificationService.initializeForUser(user);
        
        if (!success) {
          hasAttemptedRegistration.current = false;
        }
      } catch (e) {
        // Временно отключены логи OneSignal
        // console.error('❌ Push token registration error:', e.message);
        hasAttemptedRegistration.current = false;
      }
    };

    const timer = setTimeout(register, 1000);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const checkToken = async () => {
        try {
          const token = PushNotificationService.getCurrentToken();
          
          if (!token) {
            hasAttemptedRegistration.current = false;
            const success = await PushNotificationService.initializeForUser(user);
          }
        } catch (e) {
          // Временно отключены логи OneSignal
          // console.error('❌ Token check error:', e.message);
        }
      };

      const timer = setTimeout(checkToken, 3000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user]);
};

export default usePushTokenAutoRegistration;

