const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

module.exports = (() => {
    const config = getDefaultConfig(__dirname);

    const { transformer, resolver } = config;

    config.transformer = {
        ...transformer,
        babelTransformerPath: require.resolve('react-native-svg-transformer')
    };

    config.resolver = {
        ...resolver,
        assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
        sourceExts: [...resolver.sourceExts, 'svg'],
        resolverMainFields: ['sbmodern', 'browser', 'main'],
        extraNodeModules: {
            '@': path.resolve(__dirname, 'src'),
            '@app': path.resolve(__dirname, 'src/app'),
            '@shared': path.resolve(__dirname, 'src/shared'),
            '@assets': path.resolve(__dirname, 'src/assets'),
            '@features': path.resolve(__dirname, 'src/features'),
            '@widgets': path.resolve(__dirname, 'src/widgets'),
            '@pages': path.resolve(__dirname, 'src/pages'),
            '@entities': path.resolve(__dirname, 'src/entities'),
            '@services': path.resolve(__dirname, 'src/services'),
        }
    };

    return config;
})();
