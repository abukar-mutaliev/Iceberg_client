import { resolveStopDistrictId } from './resolveStopDistrictId';

function parseStopPayload(message) {
  if (!message || String(message.type || '').toUpperCase() !== 'STOP') return null;

  if (message.stop && typeof message.stop === 'object') {
    return { stopData: { ...message.stop } };
  }

  if (typeof message.content === 'string' && message.content.trim()) {
    try {
      const parsed = JSON.parse(message.content);
      if (parsed && typeof parsed === 'object') {
        return { stopData: { ...parsed } };
      }
    } catch (_) {}
  }

  return null;
}

function findCatalogStop(stops, stopIdNum) {
  if (!Array.isArray(stops) || !Number.isFinite(stopIdNum)) return null;
  return stops.find((s) => Number(s?.id) === stopIdNum) || null;
}

function districtSnippet(districts, districtId) {
  const idNum = Number(districtId);
  if (!Number.isFinite(idNum) || !Array.isArray(districts)) return null;
  const d = districts.find((x) => Number(x?.id) === idNum);
  if (!d) return null;
  return { id: d.id, name: d.name };
}

/**
 * Дописывает districtId/district в STOP-снапшот сообщения из Redux (список остановок и районов),
 * если API не включил район в тело сообщения.
 */
export function enrichStopChatMessageFromStore(message, rootState) {
  if (!message || String(message.type || '').toUpperCase() !== 'STOP') return message;

  const parsed = parseStopPayload(message);
  if (!parsed) return message;

  const stopData = parsed.stopData;

  if (resolveStopDistrictId(stopData)) {
    if (!message.stop && typeof message.content === 'string') {
      return { ...message, stop: { ...stopData } };
    }
    return message;
  }

  const rawStopId = stopData.stopId ?? stopData.id;
  const sid = Number(rawStopId);
  const catalog = findCatalogStop(rootState?.stop?.stops, sid);

  const catalogDistrictId =
    catalog?.districtId ?? catalog?.district?.id ?? null;

  if (catalogDistrictId == null || catalogDistrictId === '') {
    if (!message.stop && typeof message.content === 'string') {
      return { ...message, stop: { ...stopData } };
    }
    return message;
  }

  const merged = {
    ...stopData,
    districtId: catalogDistrictId,
  };

  if (!merged.district) {
    const districts = rootState?.district?.districts || [];
    const snippet = districtSnippet(districts, catalogDistrictId);
    if (snippet) merged.district = snippet;
    else if (catalog.district) merged.district = catalog.district;
  }

  const nextStop =
    message.stop != null && typeof message.stop === 'object'
      ? { ...message.stop, ...merged }
      : { ...merged };
  const nextContent =
    typeof message.content === 'string' ? JSON.stringify(merged) : message.content;

  return {
    ...message,
    stop: nextStop,
    content: nextContent,
  };
}
