const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Исправление для Windows - используем process.cwd() вместо __dirname
const projectRoot = __dirname || process.cwd();
const config = getDefaultConfig(projectRoot);

// Добавление алиасов для путей
config.resolver = {
    ...config.resolver,
    alias: {
        '@': path.resolve(projectRoot, 'src'),
        '@app': path.resolve(projectRoot, 'src/app'),
        '@shared': path.resolve(projectRoot, 'src/shared'),
        '@assets': path.resolve(projectRoot, 'assets'),
        '@features': path.resolve(projectRoot, 'src/features'),
        '@widgets': path.resolve(projectRoot, 'src/widgets'),
        '@screens': path.resolve(projectRoot, 'src/screens'),
        '@entities': path.resolve(projectRoot, 'src/entities'),
        '@services': path.resolve(projectRoot, 'src/services'),
        '@styles': path.resolve(projectRoot, 'src/styles'),
    },
    // НЕ переопределяем sourceExts - используем дефолтные из Expo и добавляем к ним
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

// Расширения для изображений уже включены в дефолтные assetExts Expo
// Не нужно добавлять их вручную


module.exports = config;