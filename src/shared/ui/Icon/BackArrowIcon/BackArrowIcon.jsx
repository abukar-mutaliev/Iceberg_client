import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const BackArrowIcon = ({ name, size = 24, color = "#000", style, onPress }) => {
  const renderIcon = () => {
    switch (name) {
      case 'arrow-back':
        return <Ionicons name="arrow-back" size={size} color={color} />;
      case 'camera':
        return <Ionicons name="camera" size={size} color={color} />;
      case 'map-pin':
        return <FontAwesome5 name="map-pin" size={size} color={color} />;
      case 'alert-circle':
        return <Ionicons name="alert-circle" size={size} color={color} />;
      default:
        return <Ionicons name="arrow-back" size={size} color={color} />;
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={style}>
        {renderIcon()}
      </TouchableOpacity>
    );
  }

  return renderIcon();
};

export default BackArrowIcon;