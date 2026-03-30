import * as Notifications from 'expo-notifications';

const DEFAULT_TTL_MS = 120000;

class NotificationDedup {
    constructor(ttlMs = DEFAULT_TTL_MS) {
        this.ttlMs = ttlMs;
        this.seen = new Map();
    }

    markSeen(notificationId) {
        if (!notificationId) return;
        this.seen.set(notificationId, Date.now());
        this._scheduleCleanup();
    }

    hasSeen(notificationId) {
        if (!notificationId) return false;
        const ts = this.seen.get(notificationId);
        if (!ts) return false;
        if (Date.now() - ts > this.ttlMs) {
            this.seen.delete(notificationId);
            return false;
        }
        return true;
    }

    async checkPresentedNotifications(notificationId) {
        if (!notificationId) return false;
        try {
            const presented = await Notifications.getPresentedNotificationsAsync();
            return presented.some((n) => {
                const data = n?.request?.content?.data;
                return data?.notificationId === notificationId;
            });
        } catch (_) {
            return false;
        }
    }

    async isDuplicate(notificationId) {
        if (!notificationId) return false;
        if (this.hasSeen(notificationId)) return true;
        return await this.checkPresentedNotifications(notificationId);
    }

    cleanup() {
        const now = Date.now();
        for (const [id, ts] of this.seen) {
            if (now - ts > this.ttlMs) {
                this.seen.delete(id);
            }
        }
    }

    _scheduleCleanup() {
        if (this._cleanupTimer) return;
        this._cleanupTimer = setTimeout(() => {
            this._cleanupTimer = null;
            this.cleanup();
        }, this.ttlMs);
    }
}

const notificationDedup = new NotificationDedup();
export default notificationDedup;
export { notificationDedup as NotificationDedup };
