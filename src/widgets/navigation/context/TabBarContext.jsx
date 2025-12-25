import React, { createContext, useContext, useState, useCallback } from 'react';

const TabBarContext = createContext({
    isTabBarVisible: true,
    hideTabBar: () => {},
    showTabBar: () => {},
});

export const TabBarProvider = ({ children }) => {
    const [isTabBarVisible, setIsTabBarVisible] = useState(true);

    const hideTabBar = useCallback(() => {
        setIsTabBarVisible(prev => {
            if (prev === false) {
                // Уже скрыт, не вызываем ререндер
                return prev;
            }
            console.log('📊 TabBarContext: Hiding TabBar');
            return false;
        });
    }, []);

    const showTabBar = useCallback(() => {
        setIsTabBarVisible(prev => {
            if (prev === true) {
                // Уже показан, не вызываем ререндер
                return prev;
            }
            console.log('📊 TabBarContext: Showing TabBar');
            return true;
        });
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

