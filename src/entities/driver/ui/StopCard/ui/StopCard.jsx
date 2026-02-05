import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import IconRight from "@shared/ui/Icon/Common/IconRight";
import { formatTimeRange } from '@shared/lib/dateFormatters';

const isSameDay = (left, right) => {
    if (!(left instanceof Date) || isNaN(left.getTime()) || !(right instanceof Date) || isNaN(right.getTime())) {
        return false;
    }
    return (
        left.getFullYear() === right.getFullYear() &&
        left.getMonth() === right.getMonth() &&
        left.getDate() === right.getDate()
    );
};

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

const getNextOccurrenceFromSchedule = (schedule, fromDate, minDateTime = null) => {
    if (!schedule?.daysOfWeek?.length) {
        return null;
    }
    const days = schedule.daysOfWeek
        .map((day) => Number(day))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
    if (!days.length) {
        return null;
    }
    const minTime = minDateTime ? new Date(minDateTime) : null;
    for (let offset = 0; offset <= 14; offset += 1) {
        const candidate = new Date(fromDate);
        candidate.setDate(candidate.getDate() + offset);
        if (!days.includes(candidate.getDay())) {
            continue;
        }
        const start = buildDateWithTime(candidate, schedule.startTime);
        const end = buildDateWithTime(candidate, schedule.endTime);
        if (start && end) {
            if (minTime && end <= minTime) {
                continue;
            }
            return { startTime: start, endTime: end };
        }
    }
    return null;
};

const getDisplayTimesForStop = (stop) => {
    if (!stop?.startTime || !stop?.endTime) {
        return { startTime: stop?.startTime, endTime: stop?.endTime };
    }

    const schedule = stop.schedule;
    const now = new Date();
    const startDate = new Date(stop.startTime);
    const endDate = new Date(stop.endTime);

    const isSkipToday = (stop.status || '').toUpperCase() === 'SKIPPED' ||
        (stop.skipReason && isSameDay(startDate, now));

    if (startDate >= now || endDate >= now) {
        if (!isSkipToday) {
            return { startTime: stop.startTime, endTime: stop.endTime };
        }
    }

    if (schedule?.daysOfWeek?.length) {
        const fromDate = new Date(now);
        if (isSkipToday) {
            fromDate.setDate(fromDate.getDate() + 1);
            fromDate.setHours(0, 0, 0, 0);
        }
        const nextOccurrence = getNextOccurrenceFromSchedule(schedule, fromDate, now);
        if (nextOccurrence?.startTime && nextOccurrence?.endTime) {
            return nextOccurrence;
        }
    }

    return { startTime: stop.startTime, endTime: stop.endTime };
};

export const isStopActive = (stop) => {
    if (!stop?.startTime || !stop?.endTime) return false;

    const displayTimes = getDisplayTimesForStop(stop);
    const startTime = new Date(displayTimes.startTime);
    const endTime = new Date(displayTimes.endTime);
    const now = new Date();

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return false;
    }

    return startTime <= now && endTime >= now;
};


export const StopCard = ({ stop, onPress }) => {
    const active = isStopActive(stop);
    const displayTimes = getDisplayTimesForStop(stop);

    return (
        <TouchableOpacity
            style={styles.locationItem}
            onPress={() => onPress(stop.id)}
        >
            <View style={styles.locationContent}>
                <Text style={styles.addressText}>{stop.address}</Text>
                <View style={styles.timeRow}>
                    <Text style={styles.timeText}>
                        {formatTimeRange(displayTimes.startTime, displayTimes.endTime)}
                    </Text>
                    {active && (
                        <View style={styles.onPlaceBadge}>
                            <Text style={styles.onPlaceBadgeText}>На месте</Text>
                        </View>
                    )}
                </View>
            </View>
            <IconRight style={styles.iconRight} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    locationItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingLeft: 20,
        paddingVertical: 5,
        height: 'auto',
        borderBottomWidth: 0.5,
        borderBottomColor: Color.colorLavender,
        backgroundColor: Color.colorLightMode,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'nowrap',
        gap: 8,
    },
    locationContent: {
        flex: 1,
        marginRight: 10,
    },
    addressText: {
        fontSize: FontSize.size_lg,
        fontWeight: '500',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
        marginBottom: 4,
        letterSpacing: 0.9,
    },
    timeText: {
        fontSize: FontSize.size_md,
        color: Color.grey7D7D7D,
        fontFamily: FontFamily.sFProDisplay,
        letterSpacing: 0.9,
        marginBottom: 0,
        flexShrink: 1,
    },
    onPlaceBadge: {
        backgroundColor: '#34C759',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    onPlaceBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
    },
    descriptionText: {
        fontSize: FontSize.size_sm,
        color: '#333',
        fontFamily: FontFamily.sFProDisplay,
        marginBottom: 4,
        fontStyle: 'italic',
        lineHeight: 16,
    },
    truckText: {
        fontSize: FontSize.size_sm,
        color: Color.grey7D7D7D,
        fontFamily: FontFamily.sFProDisplay,
        marginBottom: 2,
    },
    activeLabel: {
        backgroundColor: Color.purpleSoft,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        marginTop: 5,
        alignSelf: 'flex-start'
    },
    activeLabelText: {
        color: Color.colorLightMode,
        fontSize: 10,
        fontWeight: '600'
    },
    iconRight: {
        width: 10,
        height: 15,
        position: "absolute",
        right: 12,
        top: '50%',
        marginTop: -7.5,
    }
});

export default StopCard;