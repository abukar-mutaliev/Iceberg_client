import React from 'react';
import { View } from 'react-native';
import { SearchBar } from '@/shared/ui/SearchBar';
import { RewardCard } from '@/shared/ui/Reward/RewardCard';
import { styles } from '../styles/EmployeeRewardsScreen.styles';

// Мемоизированный компонент для элемента списка
const MemoizedRewardCard = React.memo(({ item, showEmployee, onProcessReward }) => (
    <RewardCard
        reward={item}
        showEmployee={showEmployee}
        onStatusChange={onProcessReward}
    />
), (prevProps, nextProps) => {
    // Кастомная функция сравнения для React.memo
    return (
        prevProps.item.id === nextProps.item.id &&
        prevProps.item.status === nextProps.item.status &&
        prevProps.item.amount === nextProps.item.amount &&
        prevProps.showEmployee === nextProps.showEmployee
    );
});

export const RewardsListView = React.memo(({
    filteredData,
    searchQuery,
    searchPlaceholder,
    showEmployee,
    onSearchChange,
    onProcessReward
}) => (
    <>
        <View style={styles.searchContainer}>
            <SearchBar
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChangeText={onSearchChange}
            />
        </View>

        {filteredData.map((item) => (
            <View key={item.id} style={styles.listItem}>
                <MemoizedRewardCard
                    item={item}
                    showEmployee={showEmployee}
                    onProcessReward={onProcessReward}
                />
            </View>
        ))}
    </>
)); 