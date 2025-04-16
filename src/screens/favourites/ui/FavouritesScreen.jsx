import {Text, TouchableOpacity, View} from "react-native";
import React from "react";

export const FavouritesScreen = ({ navigation }) => {
    const handleProductPress = (productId) => {
        navigation.navigate('ProductDetail', { productId, fromScreen: 'Favourites' });
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Favourites Screen</Text>
            <TouchableOpacity onPress={() => handleProductPress('example-product-id')}>
                <Text>Go to Product Detail</Text>
            </TouchableOpacity>
        </View>
    );
};