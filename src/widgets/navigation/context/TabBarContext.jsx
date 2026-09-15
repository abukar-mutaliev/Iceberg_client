import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const TabBarContext = createContext(null);

export const TabBarProvider = ({ children }) => {
    const [hideLockCount, setHideLockCount] = useState(0);
    const [autoHidden, setAutoHidden] = useState(false);

    const hideTabBar = useCallback(() => {
        setHideLockCount((count) => count + 1);
    }, []);

    const showTabBar = useCallback(() => {
        setHideLockCount((count) => Math.max(0, count - 1));
    }, []);

    const setTabBarAutoHidden = useCallback((hidden) => {
        setAutoHidden(Boolean(hidden));
    }, []);

    const resetTabBarLocks = useCallback(() => {
        setHideLockCount(0);
        setAutoHidden(false);
    }, []);

    const isTabBarVisible = hideLockCount === 0 && !autoHidden;

    const value = useMemo(
        () => ({
            isTabBarVisible,
            hideTabBar,
            showTabBar,
            setTabBarAutoHidden,
            resetTabBarLocks,
        }),
        [isTabBarVisible, hideTabBar, showTabBar, setTabBarAutoHidden, resetTabBarLocks]
    );

    return (
        <TabBarContext.Provider value={value}>
            {children}
        </TabBarContext.Provider>
    );
};

export const useTabBar = () => {
    const context = useContext(TabBarContext);
    if (!context) {
        throw new Error('useTabBar must be used within TabBarProvider');
    }
    return context;
};
