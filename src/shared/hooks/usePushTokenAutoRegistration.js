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
          hasAttemptedRegistration.current = false;
          return;
        }

        if (hasAttemptedRegistration.current) {
          return;
        }

        hasAttemptedRegistration.current = true;

        const success = await PushNotificationService.initializeForUser(user);

        console.log('Push notification initialization successful:', success);

        if (success) {
            try {
                console.log('Getting FCM token...');
                const token = await PushNotificationService.getFCMToken();
                console.log('FCM token received:', !!token);
                if (token) {
                    console.log('Saving FCM token to server...');
                    const saved = await PushNotificationService.saveTokenToServerSafe(token, PushNotificationService.deviceId, Platform.OS);
                    console.log('FCM token saved:', saved);
                } else {
                    console.log('No FCM token received');
                }
            } catch (firebaseError) {
                console.log('FCM token error:', firebaseError.message);
            }
        }
      } catch (e) {
        console.log('Registration error:', e.message);
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
            await PushNotificationService.initializeForUser(user);
          }
        } catch (e) {
          // Token check error
        }
      };

      const timer = setTimeout(checkToken, 3000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user]);
};

export default usePushTokenAutoRegistration;

