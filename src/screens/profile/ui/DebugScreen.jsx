// import React from 'react';
// import { View, Text, Button, StyleSheet } from 'react-native';
// import { testAuth } from '@shared/api/api';
//
// const DebugScreen = () => {
//     const runAuthTest = async () => {
//         try {
//             const result = await testAuth();
//             console.log('Результат тестирования авторизации:', result);
//             // Можно добавить отображение результата на экране
//         } catch (error) {
//             console.error('Ошибка при тестировании:', error);
//         }
//     };
//
//     return (
//         <View style={styles.container}>
//             <Text style={styles.title}>Отладка приложения</Text>
//             <Button
//                 title="Тестировать авторизацию"
//                 onPress={runAuthTest}
//             />
//         </View>
//     );
// };
//
// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         padding: 16,
//         justifyContent: 'center',
//     },
//     title: {
//         fontSize: 18,
//         fontWeight: 'bold',
//         marginBottom: 20,
//         textAlign: 'center',
//     },
// });
//
// export default DebugScreen;