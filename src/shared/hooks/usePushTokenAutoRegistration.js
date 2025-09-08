import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Platform } from 'react-native';
import PushNotificationService from '@shared/services/PushNotificationService';

export const usePushTokenAutoRegistration = () => {
  const user = useSelector((s) => s.auth?.user);
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);
  const hasAttemptedRegistration = useRef(false);

  useEffect(() => {
    const register = async () => {
      try {
        if (!isAuthenticated || !user) {
          console.log('🚫 Push token registration: user not authenticated');
          hasAttemptedRegistration.current = false;
          return;
        }

        if (hasAttemptedRegistration.current) {
          console.log('⏭️ Push token registration: already attempted');
          return;
        }

        console.log('🚀 Starting push token registration for user:', user.id);
        hasAttemptedRegistration.current = true;

        const success = await PushNotificationService.initializeForUser(user);
        console.log('📱 PushNotificationService initializeForUser result:', success);
        
        if (!success) {
          console.log('❌ Push token registration failed - initializeForUser returned false');
          hasAttemptedRegistration.current = false;
        }
      } catch (e) {
        console.error('❌ Push token registration error:', e.message);
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
          console.log('🔍 Token check - current token exists:', !!token);
          
          if (!token) {
            console.log('🔄 No token found, re-attempting registration');
            hasAttemptedRegistration.current = false;
            const success = await PushNotificationService.initializeForUser(user);
            console.log('🔄 Re-initialization result:', success);
          }
        } catch (e) {
          console.error('❌ Token check error:', e.message);
        }
      };

      const timer = setTimeout(checkToken, 3000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user]);
};

export default usePushTokenAutoRegistration;

