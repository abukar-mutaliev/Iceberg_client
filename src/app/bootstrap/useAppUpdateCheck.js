import { useEffect } from 'react';
import { scheduleUpdateCheck } from '@shared/lib/checkUpdate';

export const useAppUpdateCheck = () => {
    useEffect(() => {
        const clear = scheduleUpdateCheck();
        return clear;
    }, []);
};
