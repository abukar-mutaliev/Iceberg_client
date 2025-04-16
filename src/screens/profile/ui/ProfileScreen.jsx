import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { ProfileInfo } from "@/features/profile";

export const ProfileScreen = ({ onProductPress }) => {
    const navigation = useNavigation();
    const { isAuthenticated } = useSelector((state) => state.auth);

    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, [navigation]);

    return (
        <SafeAreaView style={styles.container}>
            <ProfileInfo onProductPress={onProductPress} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
});

export default ProfileScreen;