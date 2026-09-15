import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { fetchAllStops, selectStops } from '@entities/stop';
import { useAuth } from '@entities/auth/hooks/useAuth';
import {
    buildNextStopSlides,
    getClientDistrictId,
    getNextDistrictStop,
} from '@entities/stop/lib/getNextDistrictStop';

const NEXT_STOP_TICK_MS = 30 * 1000;

export const useNextDistrictStopSlides = () => {
    const dispatch = useDispatch();
    const stops = useSelector(selectStops);
    const { currentUser } = useAuth();
    const [now, setNow] = useState(() => Date.now());

    useFocusEffect(
        useCallback(() => {
            dispatch(fetchAllStops(null));
        }, [dispatch])
    );

    useEffect(() => {
        const intervalId = setInterval(() => {
            setNow(Date.now());
        }, NEXT_STOP_TICK_MS);

        return () => clearInterval(intervalId);
    }, []);

    const districtId = useMemo(
        () => getClientDistrictId(currentUser),
        [currentUser]
    );

    return useMemo(() => {
        const nextStop = getNextDistrictStop(stops, districtId, new Date(now));
        return buildNextStopSlides(nextStop);
    }, [stops, districtId, now]);
};
