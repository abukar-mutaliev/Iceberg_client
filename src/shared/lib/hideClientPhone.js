const PHONE_IN_TEXT = /\s*•\s*\+?[\d\s\-()]{6,}/;
const PHONE_ONLY = /^\+?[\d\s\-()]{10,}$/;

export function viewerCanSeeClientPhone(user) {
    return Boolean(
        user?.admin?.isSuperAdmin
        || user?.profile?.isSuperAdmin
        || user?.isSuperAdmin
    );
}

export function hideClientPhoneFields(person, viewer) {
    if (!person || person.role !== 'CLIENT' || viewerCanSeeClientPhone(viewer)) {
        return person;
    }

    const subtitle = String(person.subtitle || '').replace(PHONE_IN_TEXT, '').trim();
    const rawName = person.displayName || person.name || '';
    const nameIsPhone = PHONE_ONLY.test(String(rawName).trim());
    const safeName = nameIsPhone
        ? (person.email ? person.email.split('@')[0] : 'Клиент')
        : rawName;

    return {
        ...person,
        name: nameIsPhone ? safeName : person.name,
        displayName: safeName || person.displayName,
        subtitle: subtitle || (person.role === 'CLIENT' ? 'Клиент' : person.subtitle)
    };
}
