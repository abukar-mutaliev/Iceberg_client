import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { updateStop } from '@entities/stop';
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

const buildDateTime = (datePart, timePart) => {
    const dateTime = new Date(datePart);
    dateTime.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
    return dateTime;
};

export const QuickEditStopTimeModal = ({ visible, stop, onClose, onSaved }) => {
    const dispatch = useDispatch();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const scheduleEnabled = useMemo(() => parseScheduleData(stop?.schedule).enabled, [stop?.schedule]);

    const initialStart = useMemo(() => {
        return parseDateTimeValue(stop?.startTime, new Date()) || new Date();
    }, [stop?.startTime]);

    const initialEnd = useMemo(() => {
        const fallback = new Date(initialStart.getTime() + 2 * 60 * 60 * 1000);
        return parseDateTimeValue(stop?.endTime, fallback) || fallback;
    }, [stop?.endTime, initialStart]);

    const [startDate, setStartDate] = useState(initialStart);
    const [startTime, setStartTime] = useState(initialStart);
    const [endDate, setEndDate] = useState(initialEnd);
    const [endTime, setEndTime] = useState(initialEnd);
    const [errors, setErrors] = useState({ startTime: '', endTime: '' });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!visible || !stop) {
            return;
        }

        setStartDate(initialStart);
        setStartTime(initialStart);
        setEndDate(initialEnd);
        setEndTime(initialEnd);
        setErrors({ startTime: '', endTime: '' });
    }, [visible, stop, initialStart, initialEnd]);

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

        setIsSaving(true);

        try {
            await dispatch(updateStop({
                stopId: stop.id,
                stopData: {
                    startTime: startTimeIso,
                    endTime: endTimeIso,
                },
            })).unwrap();

            onSaved?.();
            onClose?.();
        } catch (error) {
            const message = typeof error === 'string'
                ? error
                : error?.message || 'Не удалось обновить время остановки';
            Alert.alert('Ошибка', message);
        } finally {
            setIsSaving(false);
        }
    }, [validate, stop?.id, isSaving, scheduleEnabled, dispatch, onSaved, onClose]);

    if (!stop) {
        return null;
    }

    return (
        <ReusableModal
            visible={visible}
            onClose={onClose}
            title="Изменить время"
            height={scheduleEnabled ? 55 : 70}
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
                                    <CustomDatePicker date={startDate} onDateChange={setStartDate} />
                                </View>
                            )}
                            <View style={styles.dateTimeColumn}>
                                <Text style={styles.sublabel}>Время</Text>
                                <CustomTimePicker date={startTime} onTimeChange={setStartTime} />
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
                                    <CustomDatePicker date={endDate} onDateChange={setEndDate} />
                                </View>
                            )}
                            <View style={styles.dateTimeColumn}>
                                <Text style={styles.sublabel}>Время</Text>
                                <CustomTimePicker date={endTime} onTimeChange={setEndTime} />
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
