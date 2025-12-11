import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const EMOJI_PICKER_HEIGHT = 300;
const EMOJIS_PER_ROW = 8;
const EMOJI_SIZE = (SCREEN_WIDTH - 32) / EMOJIS_PER_ROW;

// Оптимизированный список эмодзи по категориям (только популярные для производительности)
const EMOJI_CATEGORIES = {
  'Недавние': [],
  'Смайлики и люди': [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊',
    '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛',
    '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑',
    '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷',
    '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😵', '🤯', '🤠', '🥳', '😎',
    '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦',
    '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩',
    '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡',
    '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽',
    '🙀', '😿', '😾',
  ],
  'Животные и природа': [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
    '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤',
    '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛',
    '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖',
    '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋',
    '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫',
    '🦒', '🦘', '🦡', '🐾', '🌲', '🌳', '🌴', '🌵', '🌶️', '🌾', '🌿', '☘️',
    '🍀', '🍁', '🍂', '🍃', '🌺', '🌻', '🌹', '🌷', '🌼', '🌸', '🌾', '🌱',
    '🌿', '🍃', '🍂', '🍁', '🍄', '🌰', '🦀', '🦞', '🦐', '🦑', '🌊',
  ],
  'Еда и напитки': [
    '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑',
    '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽',
    '🥕', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🥞',
    '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🌮',
    '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪',
    '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦',
    '🥧', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜',
    '🍯', '🥛', '🍼', '☕️', '🍵', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃',
    '🍸', '🍹', '🧃', '🧉', '🧊',
  ],
  'Путешествия и места': [
    '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚',
    '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼', '🚁', '🛸', '✈️', '🛩️',
    '🛫', '🛬', '🪂', '💺', '🚀', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓️', '⛽',
    '🚧', '🚦', '🚥', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢',
    '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺',
    '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦',
    '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🕍', '🛕', '🕋', '⛩️',
    '🛤️', '🛣️', '🗾', '🎑', '🏞️', '🌅', '🌄', '🌠', '🎇', '🎆', '🌇', '🌆',
    '🏙️', '🌃', '🌌', '🌉', '🌁',
  ],
  'Активности': [
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸',
    '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🏹', '🎣', '🥊', '🥋', '🎽', '🛹',
    '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺', '⛹️',
    '🤾', '🤹', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏇', '🕴️',
    '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸',
    '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩',
  ],
  'Объекты': [
    '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💾',
    '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟',
    '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛',
    '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🧯', '🛢️', '💸', '💵', '💴',
    '💶', '💷', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️',
    '🛠️', '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨',
    '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿',
    '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬',
    '🦠', '🧫', '🧪', '🌡️', '🧹', '🪠', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁',
    '🛀', '🧼', '🪥', '🪒', '🧴', '🧷', '🧹', '🪣', '🧯', '🛒', '🚬', '⚰️',
    '🪦', '⚱️', '🗿', '🏧', '🚮', '🚰', '♿', '🚹', '🚺', '🚻', '🚼', '🚾',
    '🛂', '🛃', '🛄', '🛅', '⚠️', '🚸', '⛔', '🚫', '🚳', '🚭', '🚯', '🚱',
    '🚷', '📵', '🔞', '☢️', '☣️',
  ],
  'Символы': [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕',
    '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️',
    '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍',
    '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳',
    '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴',
    '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑',
    '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵',
    '🚭', '❗', '❓', '❕', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸',
    '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠',
    'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄',
    '🛅', '🔄', '🔃', '🔙', '🔚', '🔛', '🔜', '🔝', '🔀', '🔁', '🔂', '⏩',
    '⏪', '⏫', '⏬', '◀️', '▶️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️',
    '↘️', '↙️', '↖️', '↕️', '↔️', '↩️', '↪️', '⤴️', '⤵️',
  ],
  'Флаги': [
    '🏳️', '🏴', '🏁', '🚩', '🏳️‍🌈', '🏳️‍⚧️', '🇺🇳', '🇦🇫', '🇦🇽', '🇦🇱', '🇩🇿', '🇦🇸',
    '🇦🇩', '🇦🇴', '🇦🇮', '🇦🇶', '🇦🇬', '🇦🇷', '🇦🇲', '🇦🇼', '🇦🇺', '🇦🇹', '🇦🇿', '🇧🇸',
    '🇧🇭', '🇧🇩', '🇧🇧', '🇧🇾', '🇧🇪', '🇧🇿', '🇧🇯', '🇧🇲', '🇧🇹', '🇧🇴', '🇧🇦', '🇧🇼',
    '🇧🇷', '🇮🇴', '🇻🇬', '🇧🇳', '🇧🇬', '🇧🇫', '🇧🇮', '🇰🇭', '🇨🇲', '🇨🇦', '🇮🇨', '🇨🇻',
    '🇧🇶', '🇰🇾', '🇨🇫', '🇹🇩', '🇨🇱', '🇨🇳', '🇨🇽', '🇨🇨', '🇨🇴', '🇰🇲', '🇨🇬', '🇨🇩',
    '🇨🇰', '🇨🇷', '🇨🇮', '🇭🇷', '🇨🇺', '🇨🇼', '🇨🇾', '🇨🇿', '🇩🇰', '🇩🇯', '🇩🇲', '🇩🇴',
    '🇪🇨', '🇪🇬', '🇸🇻', '🇬🇶', '🇪🇷', '🇪🇪', '🇪🇹', '🇪🇺', '🇫🇰', '🇫🇴', '🇫🇯', '🇫🇮',
    '🇫🇷', '🇬🇫', '🇵🇫', '🇹🇫', '🇬🇦', '🇬🇲', '🇬🇪', '🇩🇪', '🇬🇭', '🇬🇮', '🇬🇷', '🇬🇱',
    '🇬🇩', '🇬🇵', '🇬🇺', '🇬🇹', '🇬🇬', '🇬🇳', '🇬🇼', '🇬🇾', '🇭🇹', '🇭🇳', '🇭🇰', '🇭🇺',
    '🇮🇸', '🇮🇳', '🇮🇩', '🇮🇷', '🇮🇶', '🇮🇪', '🇮🇲', '🇮🇱', '🇮🇹', '🇯🇲', '🇯🇵', '🎌',
    '🇯🇪', '🇯🇴', '🇰🇿', '🇰🇪', '🇰🇮', '🇽🇰', '🇰🇼', '🇰🇬', '🇱🇦', '🇱🇻', '🇱🇧', '🇱🇸',
    '🇱🇷', '🇱🇾', '🇱🇮', '🇱🇹', '🇱🇺', '🇲🇴', '🇲🇰', '🇲🇬', '🇲🇼', '🇲🇾', '🇲🇻', '🇲🇱',
    '🇲🇹', '🇲🇭', '🇲🇶', '🇲🇷', '🇲🇺', '🇾🇹', '🇲🇽', '🇫🇲', '🇲🇩', '🇲🇨', '🇲🇳', '🇲🇪',
    '🇲🇸', '🇲🇦', '🇲🇿', '🇲🇲', '🇳🇦', '🇳🇷', '🇳🇵', '🇳🇱', '🇳🇨', '🇳🇿', '🇳🇮', '🇳🇪',
    '🇳🇬', '🇳🇺', '🇳🇫', '🇰🇵', '🇲🇵', '🇳🇴', '🇴🇲', '🇵🇰', '🇵🇼', '🇵🇸', '🇵🇦', '🇵🇬',
    '🇵🇾', '🇵🇪', '🇵🇭', '🇵🇳', '🇵🇱', '🇵🇹', '🇵🇷', '🇶🇦', '🇷🇪', '🇷🇴', '🇷🇺', '🇷🇼',
    '🇼🇸', '🇸🇲', '🇸🇦', '🇸🇳', '🇷🇸', '🇸🇨', '🇸🇱', '🇸🇬', '🇸🇽', '🇸🇰', '🇸🇮', '🇬🇸',
    '🇸🇧', '🇸🇴', '🇿🇦', '🇰🇷', '🇸🇸', '🇪🇸', '🇱🇰', '🇧🇱', '🇸🇭', '🇰🇳', '🇱🇨', '🇵🇲',
    '🇻🇨', '🇸🇩', '🇸🇷', '🇸🇿', '🇸🇪', '🇨🇭', '🇸🇾', '🇹🇼', '🇹🇯', '🇹🇿', '🇹🇭', '🇹🇱',
    '🇹🇬', '🇹🇰', '🇹🇴', '🇹🇹', '🇹🇳', '🇹🇷', '🇹🇲', '🇹🇨', '🇹🇻', '🇺🇬', '🇺🇦', '🇦🇪',
    '🇬🇧', '🇺🇸', '🇻🇮', '🇺🇾', '🇺🇿', '🇻🇺', '🇻🇦', '🇻🇪', '🇻🇳', '🇼🇫', '🇪🇭', '🇾🇪',
    '🇿🇲', '🇿🇼', '🏴‍☠️',
  ],
};

// Иконки категорий для нижней панели
const CATEGORY_ICONS = {
  'Недавние': 'time-outline',
  'Смайлики и люди': 'happy-outline',
  'Животные и природа': 'leaf-outline',
  'Еда и напитки': 'restaurant-outline',
  'Путешествия и места': 'car-outline',
  'Активности': 'football-outline',
  'Объекты': 'bulb-outline',
  'Символы': 'musical-notes-outline',
  'Флаги': 'flag-outline',
};

// Порядок категорий
const CATEGORY_ORDER = [
  'Недавние',
  'Смайлики и люди',
  'Животные и природа',
  'Еда и напитки',
  'Путешествия и места',
  'Активности',
  'Объекты',
  'Символы',
  'Флаги',
];

const RECENT_STORAGE_KEY = '@emoji_picker_recent';

/**
 * Встраиваемый компонент выбора эмодзи (вместо клавиатуры)
 * Оптимизирован для производительности с использованием FlatList и мемоизации
 */
export const FullEmojiPicker = React.memo(({
  visible,
  onClose,
  onEmojiSelect,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('Смайлики и люди');
  const [recentEmojis, setRecentEmojis] = useState([]);
  const flatListRef = useRef(null);
  const categoryPositions = useRef({});
  const categoryScrollViewRef = useRef(null);

  // Загружаем недавние эмодзи из AsyncStorage
  useEffect(() => {
    const loadRecent = async () => {
      try {
        const stored = await AsyncStorage.getItem(RECENT_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setRecentEmojis(parsed);
          if (parsed.length > 0) {
            EMOJI_CATEGORIES['Недавние'] = parsed;
          }
        }
      } catch (error) {
        console.error('Error loading recent emojis:', error);
      }
    };
    loadRecent();
  }, []);

  // Сохраняем выбранный эмодзи в недавние
  const addToRecent = useCallback(async (emoji) => {
    const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 30);
    setRecentEmojis(updated);
    EMOJI_CATEGORIES['Недавние'] = updated;
    try {
      await AsyncStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving recent emojis:', error);
    }
  }, [recentEmojis]);

  // Подготавливаем данные для FlatList (оптимизированная структура)
  const listData = useMemo(() => {
    const data = [];
    CATEGORY_ORDER.forEach((category) => {
      if (category === 'Недавние' && recentEmojis.length === 0) return;
      const categoryEmojis = EMOJI_CATEGORIES[category] || [];
      if (categoryEmojis.length === 0) return;

      // Добавляем заголовок категории
      data.push({ type: 'header', category, id: `header-${category}` });
      
      // Добавляем эмодзи группами по строке (для оптимизации рендеринга)
      const rows = [];
      for (let i = 0; i < categoryEmojis.length; i += EMOJIS_PER_ROW) {
        rows.push(categoryEmojis.slice(i, i + EMOJIS_PER_ROW));
      }
      rows.forEach((row, rowIndex) => {
        data.push({
          type: 'row',
          category,
          emojis: row,
          id: `${category}-row-${rowIndex}`,
        });
      });
    });
    return data;
  }, [recentEmojis]);

  const handleEmojiSelect = useCallback(
    (emoji) => {
      addToRecent(emoji);
      if (onEmojiSelect) {
        onEmojiSelect(emoji);
      }
    },
    [onEmojiSelect, addToRecent]
  );

  // Прокрутка к категории
  const scrollToCategory = useCallback((category) => {
    const headerIndex = listData.findIndex(item => item.type === 'header' && item.category === category);
    if (headerIndex !== -1 && flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: headerIndex,
        animated: true,
        viewOffset: 0,
      });
    }
  }, [listData]);

  // Рендер элемента списка
  const renderItem = useCallback(({ item }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>{item.category}</Text>
        </View>
      );
    }
    
    if (item.type === 'row') {
      return (
        <View style={styles.emojiRow}>
          {item.emojis.map((emoji, index) => (
            <EmojiButton
              key={`${item.id}-${index}`}
              emoji={emoji}
              onPress={handleEmojiSelect}
            />
          ))}
        </View>
      );
    }
    
    return null;
  }, [handleEmojiSelect]);

  const keyExtractor = useCallback((item) => item.id, []);

  const getItemLayout = useCallback((data, index) => {
    const item = data?.[index];
    if (item?.type === 'header') {
      return { length: 40, offset: index * 40, index };
    }
    return { length: EMOJI_SIZE, offset: index * EMOJI_SIZE, index };
  }, []);

  if (!visible) {
    return <View style={[styles.container, styles.hidden]} />;
  }

  return (
    <View style={styles.container}>
      {/* Верхняя панель с категориями */}
      <View style={styles.topBar}>
        <ScrollView
          ref={categoryScrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryTabsContent}
          style={styles.categoryTabs}
          nestedScrollEnabled={true}
          scrollEnabled={true}
          bounces={false}
          alwaysBounceHorizontal={false}
          removeClippedSubviews={false}
          keyboardShouldPersistTaps="handled"
          directionalLockEnabled={true}
        >
          {CATEGORY_ORDER.filter(cat => cat !== 'Недавние' || recentEmojis.length > 0).map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <TouchableOpacity
                key={category}
                style={[styles.categoryTab, isSelected && styles.categoryTabSelected]}
                onPress={() => {
                  setSelectedCategory(category);
                  scrollToCategory(category);
                }}
                activeOpacity={0.7}
              >
                <Text 
                  style={[styles.categoryTabText, isSelected && styles.categoryTabTextSelected]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Список эмодзи с виртуализацией */}
      <FlatList
        ref={flatListRef}
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
        onScrollToIndexFailed={(info) => {
          // Fallback для прокрутки
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: Math.min(info.index, listData.length - 1),
              animated: true,
            });
          }, 100);
        }}
      />

      {/* Нижняя панель с иконками категорий */}
      <View style={styles.bottomBar}>
        {CATEGORY_ORDER.map((category) => {
          if (category === 'Недавние' && recentEmojis.length === 0) return null;
          const isSelected = selectedCategory === category;
          const iconName = CATEGORY_ICONS[category] || 'ellipse-outline';

          return (
            <TouchableOpacity
              key={category}
              style={[styles.bottomBarItem, isSelected && styles.bottomBarItemSelected]}
              onPress={() => {
                setSelectedCategory(category);
                scrollToCategory(category);
              }}
            >
              <Ionicons
                name={iconName}
                size={24}
                color={isSelected ? '#00A884' : '#8696A0'}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

// Мемоизированный компонент кнопки эмодзи
const EmojiButton = React.memo(({ emoji, onPress }) => {
  const handlePress = useCallback(() => {
    onPress(emoji);
  }, [emoji, onPress]);

  return (
    <TouchableOpacity
      style={styles.emojiButton}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={styles.emoji}>{emoji}</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    height: EMOJI_PICKER_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E4E6EB',
    overflow: 'hidden',
  },
  hidden: {
    height: 0,
    overflow: 'hidden',
    opacity: 0,
  },
  topBar: {
    backgroundColor: '#F0F2F5',
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E6EB',
    height: 48,
    justifyContent: 'center',
    width: '100%',
  },
  categoryTabs: {
    width: '100%',
    height: '100%',
  },
  categoryTabsContent: {
    paddingHorizontal: 8,
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 32,
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 4,
    backgroundColor: 'transparent',
    flexShrink: 0,
    minWidth: 60,
  },
  categoryTabSelected: {
    backgroundColor: '#FFFFFF',
  },
  categoryTabText: {
    fontSize: 13,
    color: '#8696A0',
    fontWeight: '500',
    flexShrink: 0,
  },
  categoryTabTextSelected: {
    color: '#00A884',
    fontWeight: '600',
  },
  scrollViewContent: {
    padding: 8,
  },
  categoryHeader: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8696A0',
    textTransform: 'uppercase',
  },
  emojiRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  emojiButton: {
    width: EMOJI_SIZE,
    height: EMOJI_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  emoji: {
    fontSize: 28,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F0F2F5',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#E4E6EB',
    minHeight: 48,
  },
  bottomBarItem: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  bottomBarItemSelected: {
    backgroundColor: '#FFFFFF',
  },
});
