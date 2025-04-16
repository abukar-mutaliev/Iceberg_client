import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

/**
 * Компонент для отладки данных в приложении
 *
 * @param {Object} props
 * @param {Object|Array} props.data - Данные для отображения
 * @param {String} props.title - Заголовок для отображения
 * @param {Boolean} props.expanded - Начальное состояние (развернуто/свернуто)
 * @param {Boolean} props.showDetails - Показать детали или только заголовок
 */
export const DebugView = ({ data, title = 'Отладка', expanded = false, showDetails = true }) => {
    const [isExpanded, setIsExpanded] = useState(expanded);

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const renderValue = (value, depth = 0) => {
        if (value === null) return <Text style={styles.null}>null</Text>;
        if (value === undefined) return <Text style={styles.undefined}>undefined</Text>;

        if (typeof value === 'object') {
            if (Array.isArray(value)) {
                return (
                    <View style={{ marginLeft: depth * 10 }}>
                        <Text>Array[{value.length}]:</Text>
                        {value.map((item, index) => (
                            <View key={index} style={styles.arrayItem}>
                                <Text style={styles.keyText}>[{index}]: </Text>
                                {renderValue(item, depth + 1)}
                            </View>
                        ))}
                    </View>
                );
            } else {
                const keys = Object.keys(value);
                return (
                    <View style={{ marginLeft: depth * 10 }}>
                        <Text>Object{'{}'}</Text>
                        {keys.map((key) => (
                            <View key={key} style={styles.objectItem}>
                                <Text style={styles.keyText}>{key}: </Text>
                                {renderValue(value[key], depth + 1)}
                            </View>
                        ))}
                    </View>
                );
            }
        }

        if (typeof value === 'string') return <Text style={styles.string}>"{value}"</Text>;
        if (typeof value === 'number') return <Text style={styles.number}>{value}</Text>;
        if (typeof value === 'boolean') return <Text style={styles.boolean}>{value ? 'true' : 'false'}</Text>;

        return <Text>{String(value)}</Text>;
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={toggleExpand} style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <Text>{isExpanded ? '▼' : '▶'}</Text>
            </TouchableOpacity>

            {isExpanded && showDetails && (
                <ScrollView style={styles.content}>
                    {renderValue(data)}
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 4,
        margin: 10,
        backgroundColor: '#f8f8f8',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        backgroundColor: '#eee',
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
    },
    title: {
        fontWeight: 'bold',
    },
    content: {
        padding: 10,
        maxHeight: 300,
    },
    arrayItem: {
        flexDirection: 'row',
        marginVertical: 2,
        flexWrap: 'wrap',
    },
    objectItem: {
        flexDirection: 'row',
        marginVertical: 2,
        flexWrap: 'wrap',
    },
    keyText: {
        fontWeight: 'bold',
        color: '#333',
    },
    string: {
        color: 'green',
    },
    number: {
        color: 'blue',
    },
    boolean: {
        color: 'purple',
    },
    null: {
        color: 'red',
        fontStyle: 'italic',
    },
    undefined: {
        color: 'orange',
        fontStyle: 'italic',
    },
});

export default DebugView;