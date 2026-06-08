/**
 * Район остановки для фильтров в каналах — API может отдавать districtId или вложенный district.id.
 * Если в сообщении чата района нет, слой фильтрации показывает STOP всем (см. useGroupChatData / selectors).
 */
export function resolveStopDistrictId(stopData) {
  if (!stopData || typeof stopData !== 'object') return null;

  const raw =
    stopData.districtId ??
    stopData.district_id ??
    stopData.district?.id ??
    stopData.district?.districtId ??
    null;

  if (raw === '' || raw === undefined || raw === null) return null;
  return raw;
}
