import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { ReusableModal } from '@shared/ui/Modal';
import { CustomDatePicker, CustomTimePicker } from '@shared/ui/Pickers/CustomDatePicker';
import { FormSection, FormField } from '@features/driver/addDriverStop/ui/FormField';
import { updateStop, patchStopTimes } from '@entities/stop';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const toLocalISOString = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return '';
    }
    const pad = (value) => String(value).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    const millis = String(date.getMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${millis}`;
};

const parseDateTimeValue = (value, fallbackDate = null) => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return new Date(value);
    }

    if (!value) {
        return fallbackDate ? new Date(fallbackDate) : null;
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed;
    }

    return fallbackDate ? new Date(fallbackDate) : null;
};

const parseScheduleData = (schedule) => {
    if (!schedule) {
        return { enabled: false };
    }

    let scheduleObj = schedule;

    if (typeof schedule === 'string') {
        try {
            scheduleObj = JSON.parse(schedule);
        } catch {
            return { enabled: false };
        }
    }

    if (Array.isArray(scheduleObj)) {
        return { enabled: scheduleObj.length > 0 };
    }

    const days = Array.isArray(scheduleObj?.daysOfWeek) ? scheduleObj.daysOfWeek : [];
    const enabled = typeof scheduleObj?.enabled === 'boolean' ? scheduleObj.enabled : days.length > 0;

    return { enabled };
};

const STOP_DURATION_MS = 60 * 60 * 1000;

const buildDateTime = (datePart, timePart) => {
    const dateTime = new Date(datePart);
    dateTime.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
    return dateTime;
};

const addStopDuration = (dateTime) => {
    return new Date(dateTime.getTime() + STOP_DURATION_MS);
};

const getTodayDate = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const combineDateAndTime = (datePart, timeSource) => {
    const combined = new Date(datePart);
    const time = parseDateTimeValue(timeSource, new Date()) || new Date();
    combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return combined;
};

const getInitialFormValues = (stop) => {
    const today = getTodayDate();
    const stopStart = parseDateTimeValue(stop?.startTime, new Date()) || new Date();
    const startDateTime = combineDateAndTime(today, stopStart);
    const endDateTime = addStopDuration(startDateTime);

    return {
        startDate: today,
        startTime: startDateTime,
        endDate: new Date(endDateTime.getFullYear(), endDateTime.getMonth(), endDateTime.getDate()),
        endTime: endDateTime,
    };
};

export const QuickEditStopTimeModal = ({ visible, stop, onClose, onSaved }) => {
    const dispatch = useDispatch();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const scheduleEnabled = useMemo(() => parseScheduleData(stop?.schedule).enabled, [stop?.schedule]);

    const initialValues = useMemo(() => getInitialFormValues(stop), [stop]);

    const [startDate, setStartDate] = useState(initialValues.startDate);
    const [startTime, setStartTime] = useState(initialValues.startTime);
    const [endDate, setEndDate] = useState(initialValues.endDate);
    const [endTime, setEndTime] = useState(initialValues.endTime);
    const [errors, setErrors] = useState({ startTime: '', endTime: '' });
    const [isSaving, setIsSaving] = useState(false);
    const endTimeManuallyEditedRef = useRef(false);

    const applyAutoEndTime = useCallback((nextStartDate, nextStartTime) => {
        const startDateTime = buildDateTime(nextStartDate, nextStartTime);
        const autoEnd = addStopDuration(startDateTime);
        setEndDate(new Date(autoEnd.getFullYear(), autoEnd.getMonth(), autoEnd.getDate()));
        setEndTime(autoEnd);
    }, []);

    useEffect(() => {
        if (!visible || !stop) {
            return;
        }

        const values = getInitialFormValues(stop);
        endTimeManuallyEditedRef.current = false;
        setStartDate(values.startDate);
        setStartTime(values.startTime);
        setEndDate(values.endDate);
        setEndTime(values.endTime);
        setErrors({ startTime: '', endTime: '' });
    }, [visible, stop]);

    const onStartDateChange = useCallback((date) => {
        setStartDate(date);
        if (!endTimeManuallyEditedRef.current) {
            applyAutoEndTime(date, startTime);
        } else if (date > endDate) {
            setEndDate(date);
        }
        setErrors((prev) => ({ ...prev, startTime: '', endTime: '' }));
    }, [applyAutoEndTime, startTime, endDate]);

    const onStartTimeChange = useCallback((time) => {
        setStartTime(time);
        if (!endTimeManuallyEditedRef.current) {
            applyAutoEndTime(startDate, time);
        }
        setErrors((prev) => ({ ...prev, startTime: '', endTime: '' }));
    }, [applyAutoEndTime, startDate]);

    const onEndDateChange = useCallback((date) => {
        endTimeManuallyEditedRef.current = true;
        if (date < startDate) {
            setErrors((prev) => ({
                ...prev,
                endTime: 'Дата окончания не может быть раньше даты начала',
            }));
            return;
        }
        setEndDate(date);
        setErrors((prev) => ({ ...prev, endTime: '' }));
    }, [startDate]);

    const onEndTimeChange = useCallback((time) => {
        endTimeManuallyEditedRef.current = true;
        const isSameDay =
            startDate.getDate() === endDate.getDate() &&
            startDate.getMonth() === endDate.getMonth() &&
            startDate.getFullYear() === endDate.getFullYear();

        if (
            isSameDay &&
            (
                time.getHours() < startTime.getHours() ||
                (time.getHours() === startTime.getHours() && time.getMinutes() < startTime.getMinutes())
            )
        ) {
            setErrors((prev) => ({
                ...prev,
                endTime: 'Время окончания не может быть раньше времени начала',
            }));
            return;
        }

        setEndTime(time);
        setErrors((prev) => ({ ...prev, endTime: '' }));
    }, [startDate, endDate, startTime]);

    const validate = useCallback(() => {
        const startDateTime = buildDateTime(startDate, startTime);
        const endDateTime = buildDateTime(endDate, endTime);

        if (endDateTime <= startDateTime) {
            setErrors({ startTime: '', endTime: 'Время окончания должно быть позже времени начала' });
            return null;
        }

        setErrors({ startTime: '', endTime: '' });
        return { startDateTime, endDateTime };
    }, [startDate, startTime, endDate, endTime]);

    const handleSave = useCallback(async () => {
        const validated = validate();
        if (!validated || !stop?.id || isSaving) {
            return;
        }

        const { startDateTime, endDateTime } = validated;
        const startTimeIso = scheduleEnabled
            ? toLocalISOString(startDateTime)
            : startDateTime.toISOString();
        const endTimeIso = scheduleEnabled
            ? toLocalISOString(endDateTime)
            : endDateTime.toISOString();

        const previousTimes = {
            startTime: stop.startTime,
            endTime: stop.endTime,
            status: stop.status,
        };

        setIsSaving(true);

        dispatch(patchStopTimes({
            stopId: stop.id,
            startTime: startTimeIso,
            endTime: endTimeIso,
            status: 'SCHEDULED',
        }));

        onSaved?.();
        onClose?.();

        try {
            await dispatch(updateStop({
                stopId: stop.id,
                stopData: {
                    startTime: startTimeIso,
                    endTime: endTimeIso,
                },
                silent: true,
            })).unwrap();
        } catch (error) {
            dispatch(patchStopTimes({
                stopId: stop.id,
                startTime: previousTimes.startTime,
                endTime: previousTimes.endTime,
                status: previousTimes.status,
            }));

            const message = typeof error === 'string'
                ? error
                : error?.message || 'Не удалось обновить время остановки';
            Alert.alert('Ошибка', message);
        } finally {
            setIsSaving(false);
        }
    }, [validate, stop, isSaving, scheduleEnabled, dispatch, onSaved, onClose]);

    if (!stop) {
        return null;
    }

    return (
        <ReusableModal
            visible={visible}
            onClose={onClose}
            title="Изменить время"
            height={scheduleEnabled ? 75 : 90}
            disableSwipe={isSaving}
        >
            <View style={styles.content}>
                <Text style={styles.address} numberOfLines={2}>
                    {stop.address || 'Адрес не указан'}
                </Text>

                <FormSection
                    title="Время стоянки"
                    subtitle={scheduleEnabled
                        ? 'Для остановки с графиком можно изменить только время'
                        : 'Укажите дату и время начала и окончания'}
                >
                    <FormField
                        label={scheduleEnabled ? 'Время начала' : 'Дата и время начала'}
                        required
                        error={errors.startTime}
                    >
                        <View style={styles.dateTimeRow}>
                            {!scheduleEnabled && (
                                <View style={styles.dateTimeColumn}>
                                    <Text style={styles.sublabel}>Дата</Text>
                                    <CustomDatePicker date={startDate} onDateChange={onStartDateChange} />
                                </View>
                            )}
                            <View style={styles.dateTimeColumn}>
                                <Text style={styles.sublabel}>Время</Text>
                                <CustomTimePicker date={startTime} onTimeChange={onStartTimeChange} />
                            </View>
                        </View>
                    </FormField>

                    <FormField
                        label={scheduleEnabled ? 'Время окончания' : 'Дата и время окончания'}
                        required
                        error={errors.endTime}
                    >
                        <View style={styles.dateTimeRow}>
                            {!scheduleEnabled && (
                                <View style={styles.dateTimeColumn}>
                                    <Text style={styles.sublabel}>Дата</Text>
                                    <CustomDatePicker date={endDate} onDateChange={onEndDateChange} />
                                </View>
                            )}
                            <View style={styles.dateTimeColumn}>
                                <Text style={styles.sublabel}>Время</Text>
                                <CustomTimePicker date={endTime} onTimeChange={onEndTimeChange} />
                            </View>
                        </View>
                    </FormField>
                </FormSection>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.button, styles.cancelButton]}
                        onPress={onClose}
                        disabled={isSaving}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.buttonText, styles.cancelButtonText]}>Отмена</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.saveButton, isSaving && styles.buttonDisabled]}
                        onPress={handleSave}
                        disabled={isSaving}
                        activeOpacity={0.7}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Сохранить</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </ReusableModal>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    content: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    address: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_md,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 12,
    },
    dateTimeRow: {
        flexDirection: 'row',
        gap: 12,
    },
    dateTimeColumn: {
        flex: 1,
    },
    sublabel: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_sm,
        color: colors.textSecondary,
        marginBottom: 6,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButton: {
        backgroundColor: isDark ? '#2E8F4A' : Color.success,
    },
    cancelButton: {
        backgroundColor: isDark ? colors.surfaceElevated : '#fff',
        borderWidth: 1.5,
        borderColor: isDark ? colors.border : '#E0E0E0',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_md,
        fontWeight: '600',
        color: '#fff',
    },
    cancelButtonText: {
        color: colors.textPrimary,
    },
});
