const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Добавление алиасов для путей
config.resolver.alias = {
    '@': path.resolve(__dirname, 'src'),
    '@app': path.resolve(__dirname, 'src/app'),
    '@shared': path.resolve(__dirname, 'src/shared'),
    '@assets': path.resolve(__dirname, 'assets'),
    '@features': path.resolve(__dirname, 'src/features'),
    '@widgets': path.resolve(__dirname, 'src/widgets'),
    '@screens': path.resolve(__dirname, 'src/screens'),
    '@entities': path.resolve(__dirname, 'src/entities'),
    '@services': path.resolve(__dirname, 'src/services'),
    '@styles': path.resolve(__dirname, 'src/styles'),
};

// Безопасная настройка SVG трансформера
try {
    const svgTransformer = require.resolve('react-native-svg-transformer');
    
    // Если пакет найден, настраиваем SVG поддержку
    config.transformer = {
        ...config.transformer,
        babelTransformerPath: svgTransformer,
    };

    config.resolver = {
        ...config.resolver,
        assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
        sourceExts: [...config.resolver.sourceExts, 'svg'],
    };
    
    console.log('✅ SVG transformer configured successfully');
} catch (error) {
    console.warn('⚠️ react-native-svg-transformer not found, SVG support disabled');
    
    // Если пакет не найден, просто добавляем SVG как asset
    config.resolver.assetExts = [
        ...config.resolver.assetExts,
        'svg'
    ];
}

// Добавляем остальные расширения для изображений
config.resolver.assetExts = [
    ...config.resolver.assetExts,
    'png',
    'jpg',
    'jpeg',
    'gif',
    'webp'
];

module.exports = config;