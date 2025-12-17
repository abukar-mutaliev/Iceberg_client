import React, { createContext, useContext, useState, useCallback } from 'react';

const TabBarContext = createContext({
    isTabBarVisible: true,
    hideTabBar: () => {},
    showTabBar: () => {},
});

export const TabBarProvider = ({ children }) => {
    const [isTabBarVisible, setIsTabBarVisible] = useState(true);

    const hideTabBar = useCallback(() => {
        console.log('📊 TabBarContext: Hiding TabBar');
        setIsTabBarVisible(false);
    }, []);

    const showTabBar = useCallback(() => {
        console.log('📊 TabBarContext: Showing TabBar');
        setIsTabBarVisible(true);
    }, []);

    return (
        <TabBarContext.Provider value={{ isTabBarVisible, hideTabBar, showTabBar }}>
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

