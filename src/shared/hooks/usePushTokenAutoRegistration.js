import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import PushNotificationService from '@shared/services/PushNotificationService';

// Minimal hook to auto-register push token on auth changes
export const usePushTokenAutoRegistration = () => {
  const user = useSelector((s) => s.auth?.user);
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);

  useEffect(() => {
    const register = async () => {
      try {
        if (!isAuthenticated || !user) return;
        await PushNotificationService.initializeForUser(user);
      } catch (e) {
        console.warn('usePushTokenAutoRegistration: failed', e);
      }
    };
    register();
  }, [isAuthenticated, user?.id]);
};

export default usePushTokenAutoRegistration;

