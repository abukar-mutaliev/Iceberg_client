import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import PushNotificationService from '@shared/services/PushNotificationService';

export const usePushTokenAutoRegistration = () => {
  const user = useSelector((s) => s.auth?.user);
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);
  const hasAttemptedRegistration = useRef(false);
  const latestAuthRef = useRef({ isAuthenticated: false, userId: null });
  const registrationAttemptRef = useRef(0);

  useEffect(() => {
    latestAuthRef.current = {
      isAuthenticated: !!isAuthenticated,
      userId: user?.id || null
    };
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    const register = async () => {
      try {
        if (!isAuthenticated || !user) {
          hasAttemptedRegistration.current = false;
          registrationAttemptRef.current += 1;
          return;
        }

        if (hasAttemptedRegistration.current) {
          return;
        }

        const attemptId = ++registrationAttemptRef.current;

        await new Promise(resolve => setTimeout(resolve, 1000));

        const latestAuth = latestAuthRef.current;
        if (!latestAuth.isAuthenticated || latestAuth.userId !== user.id || attemptId !== registrationAttemptRef.current) {
          return;
        }

        hasAttemptedRegistration.current = true;

        const success = await PushNotificationService.initializeForUser(user);

        if (!success) {
          hasAttemptedRegistration.current = false;
        }
      } catch (e) {
        hasAttemptedRegistration.current = false;
      }
    };

    register();
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const checkToken = async () => {
        try {
          const token = PushNotificationService.getCurrentToken();

          if (!token) {
            const latestAuth = latestAuthRef.current;
            if (!latestAuth.isAuthenticated || latestAuth.userId !== user.id) {
              return;
            }
            hasAttemptedRegistration.current = false;
            await PushNotificationService.initializeForUser(user);
          }
        } catch (_) {}
      };

      const timer = setTimeout(checkToken, 3000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user]);
};

export default usePushTokenAutoRegistration;
