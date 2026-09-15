import { parseStopDateTime } from './parseStopDateTime';

const DEFAULT_SLIDE = {
    id: 'title',
    line1: 'Остановки',
    line2: 'в твоем городе',
    variant: 'title',
};

const HIDDEN_STATUSES = new Set(['CANCELLED', 'COMPLETED']);

const parseTimeString = (timeString) => {
    if (!timeString || typeof timeString !== 'string') {
        return null;
    }

    const [hoursPart, minutesPart] = timeString.split(':');
    const hours = Number(hoursPart);
    const minutes = Number(minutesPart);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return null;
    }

    return { hours, minutes };
};

const buildDateWithTime = (baseDate, timeString) => {
    const time = parseTimeString(timeString);
    if (!time) {
        return null;
    }

    const next = new Date(baseDate);
    next.setHours(time.hours, time.minutes, 0, 0);
    return next;
};

const formatClock = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return '';
    }

    return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatRemaining = (end, now) => {
    const minutesLeft = Math.max(1, Math.round((end.getTime() - now.getTime()) / 60000));

    if (minutesLeft < 60) {
        return `ещё ${minutesLeft} мин`;
    }

    const hoursLeft = Math.floor(minutesLeft / 60);
    const minsLeft = minutesLeft % 60;

    if (minsLeft === 0) {
        return `ещё ${hoursLeft} ч`;
    }

    return `ещё ${hoursLeft} ч ${minsLeft} мин`;
};

export const formatLocatorPlaceName = (address) => {
    let text = String(address || '').replace(/\s+/g, ' ').trim();
    if (!text) {
        return 'Адрес уточняется';
    }

    text = text.replace(/^(республика\s+ингушетия|ри)[,.\s:-]*/i, '');

    const settlementMatch = text.match(
        /(?:^|,)\s*((?:пгт|поселок|посёлок|станица|село|город|аул|ст|с|г|х|п)\.?\s+[A-ZА-ЯЁа-яёA-Za-z-]+(?:\s+[A-ZА-ЯЁа-яёA-Za-z-]+){0,2})/i
    );
    if (settlementMatch?.[1]) {
        text = settlementMatch[1].trim();
    } else if (text.includes(',')) {
        text = text.split(',')[0].trim();
    }

    return text || 'Адрес уточняется';
};

export const getClientDistrictId = (user) => {
    if (!user) {
        return null;
    }

    const raw =
        user.client?.districtId ??
        user.client?.district?.id ??
        user.districtId ??
        user.district?.id ??
        null;

    if (raw === '' || raw == null) {
        return null;
    }

    const numeric = Number(raw);
    return Number.isFinite(numeric) ? numeric : null;
};

export const getStopDistrictId = (stop) => {
    const raw = stop?.districtId ?? stop?.district?.id ?? null;
    if (raw === '' || raw == null) {
        return null;
    }

    const numeric = Number(raw);
    return Number.isFinite(numeric) ? numeric : null;
};

export const hasPublicVisibleTime = (stop, now = new Date()) => {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (stop.schedule?.daysOfWeek?.length) {
        const days = stop.schedule.daysOfWeek
            .map((day) => Number(day))
            .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
        const start = parseStopDateTime(stop.startTime);
        const isSkipToday = (stop.status || '').toUpperCase() === 'SKIPPED' ||
            (stop.skipReason && start && start >= todayStart && start <= todayEnd);

        return days.includes(now.getDay()) && !isSkipToday;
    }

    const start = parseStopDateTime(stop.startTime);
    const end = parseStopDateTime(stop.endTime);

    if (start && end) return start <= todayEnd && end >= todayStart;
    if (end) return end >= todayStart && end <= todayEnd;
    if (start) return start >= todayStart && start <= todayEnd;

    return false;
};

const getTodayOccurrence = (stop, now) => {
    if (stop.schedule?.daysOfWeek?.length) {
        const start = buildDateWithTime(now, stop.schedule.startTime) || parseStopDateTime(stop.startTime);
        const end = buildDateWithTime(now, stop.schedule.endTime) || parseStopDateTime(stop.endTime);
        return { start, end };
    }

    return {
        start: parseStopDateTime(stop.startTime),
        end: parseStopDateTime(stop.endTime),
    };
};

export const getNextDistrictStop = (stops, districtId, now = new Date()) => {
    const safeStops = Array.isArray(stops) ? stops : [];
    const normalizedDistrictId = districtId == null ? null : Number(districtId);
    const hasDistrictFilter = Number.isFinite(normalizedDistrictId);

    const upcoming = safeStops.reduce((result, stop) => {
        const status = String(stop?.status || '').toUpperCase();
        if (HIDDEN_STATUSES.has(status)) {
            return result;
        }

        if (!hasPublicVisibleTime(stop, now)) {
            return result;
        }

        if (hasDistrictFilter) {
            const stopDistrictId = getStopDistrictId(stop);
            if (stopDistrictId !== normalizedDistrictId) {
                return result;
            }
        }

        const { start, end } = getTodayOccurrence(stop, now);
        const expired = end ? end < now : (start ? start < now : true);
        if (expired) {
            return result;
        }

        const isActive = !!(start && end && start <= now && end >= now);
        result.push({ stop, start, end, isActive });
        return result;
    }, []);

    upcoming.sort((left, right) => {
        if (left.isActive !== right.isActive) {
            return left.isActive ? -1 : 1;
        }

        return (left.start?.getTime() ?? 0) - (right.start?.getTime() ?? 0);
    });

    return upcoming[0] || null;
};

export const buildNextStopSlides = (nextStop) => {
    if (!nextStop?.stop) {
        return [DEFAULT_SLIDE];
    }

    const { stop, start, end, isActive } = nextStop;
    const placeName = formatLocatorPlaceName(stop.address);
    const timeLine = isActive && end
        ? `Сейчас · ${formatRemaining(end, new Date())}`
        : start && end
            ? `Сегодня ${formatClock(start)} – ${formatClock(end)}`
            : start
                ? `Сегодня с ${formatClock(start)}`
                : isActive
                    ? 'Сейчас на месте'
                    : 'Сегодня';

    return [
        DEFAULT_SLIDE,
        {
            id: `place-${stop.id}`,
            line1: placeName,
            line2: '',
            variant: 'place',
        },
        {
            id: `time-${stop.id}`,
            line1: timeLine,
            line2: '',
            variant: 'info',
        },
    ];
};
