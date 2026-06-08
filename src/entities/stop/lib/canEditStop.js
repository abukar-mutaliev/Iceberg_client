export const canEditStop = (stop, user) => {
    if (!stop || !user) {
        return false;
    }

    const isSuperAdmin = !!user?.admin?.isSuperAdmin;
    const isAdminOrEmployee = user?.role === 'ADMIN' || user?.role === 'EMPLOYEE' || isSuperAdmin;
    const isDriverOwnedStop = !!(
        (user?.id && stop?.driver?.userId === user.id) ||
        (user?.driver?.id && stop?.driverId === user.driver.id)
    );

    return isAdminOrEmployee || (user?.role === 'DRIVER' && isDriverOwnedStop);
};
