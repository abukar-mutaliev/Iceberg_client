export const parseStopDateTime = (value) => {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : value;
    }

    const directDate = new Date(value);
    if (!isNaN(directDate.getTime())) {
        return directDate;
    }

    if (typeof value !== 'string') {
        return null;
    }

    const normalizedValue = value.trim();
    const match = normalizedValue.match(
        /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?(?:([Zz])|([+-]\d{2}:?\d{2}))?$/
    );

    if (!match) {
        return null;
    }

    const [, year, month, day, hours = '0', minutes = '0', seconds = '0', milliseconds = '0', utcMark, offset] = match;

    if (utcMark || offset) {
        const isoOffset = offset && !offset.includes(':')
            ? `${offset.slice(0, 3)}:${offset.slice(3)}`
            : offset;
        const isoValue = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds.padEnd(3, '0')}${utcMark || isoOffset}`;
        const date = new Date(isoValue);
        return isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hours),
        Number(minutes),
        Number(seconds),
        Number(milliseconds.padEnd(3, '0'))
    );

    return isNaN(date.getTime()) ? null : date;
};
