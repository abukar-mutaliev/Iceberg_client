/**
 * Системные сообщения о назначении/отзыве администратора группы или канала.
 * Используется чтобы скрыть их в каналах (BROADCAST) в ленте и в превью списка чатов;
 * для обычных групп (GROUP) не фильтруем на уровне вызывающего кода.
 */
export function isGroupAdminRoleSystemMessage(msg) {
  if (String(msg?.type || '').toUpperCase() !== 'SYSTEM') return false;

  const raw = msg?.content ?? msg?.text ?? '';
  if (raw == null) return false;

  const trimmed = String(raw).trim();
  if (!trimmed) return false;

  if (trimmed.startsWith('{')) {
    try {
      const o = JSON.parse(trimmed);
      const ev = String(o.event || o.type || o.kind || o.action || '').toUpperCase();
      if (
        /^(GROUP_)?(ASSIGN|REVOKE|SET)_ADMIN|PARTICIPANT_ROLE|ROLE_(CHANGE|UPDATE)|ADMIN_(ASSIGNED|REVOKED)/.test(ev)
      ) {
        return true;
      }
      const nr = String(o.newRole || o.role || '').toUpperCase();
      const prev = String(o.oldRole || o.previousRole || '').toUpperCase();
      if (nr === 'ADMIN' || prev === 'ADMIN') {
        if (/\b(PARTICIPANT|ROLE|MEMBER_ROOM)\b/i.test(ev)) return true;
        if (nr && prev && nr !== prev) return true;
      }
    } catch {
      // не JSON — разбираем как текст ниже
    }
  }

  const lower = trimmed.toLowerCase();
  const mentionsAdmin =
    lower.includes('администратор') ||
    lower.includes('administrator') ||
    /\badmin\b/i.test(trimmed);

  if (!mentionsAdmin) return false;

  return (
    lower.includes('назнач') ||
    lower.includes('отозв') ||
    lower.includes('снят') ||
    lower.includes('стал администратор') ||
    lower.includes('стала администратор') ||
    lower.includes('стали администратор') ||
    /\b(assigned|promoted|revoked|removed)\b/i.test(trimmed)
  );
}
