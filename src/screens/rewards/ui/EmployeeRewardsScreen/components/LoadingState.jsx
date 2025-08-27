import React from 'react';
import { View } from 'react-native';
import { Loader } from '@/shared/ui/Loader';
import { styles } from '../styles/EmployeeRewardsScreen.styles';

export const LoadingState = React.memo(() => (
    <View style={styles.loadingContainer}>
        <Loader />
    </View>
)); 