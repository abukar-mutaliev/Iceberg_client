module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            [
                'module-resolver',
                {
                    root: ['./src'],
                    extensions: [
                        '.ios.js',
                        '.android.js',
                        '.js',
                        '.jsx',
                        '.ts',
                        '.tsx',
                        '.json',
                        '.png',
                        '.jpg',
                        '.jpeg',
                        '.gif',
                        '.webp',
                        '.svg'
                    ],
                    alias: {
                        '@': './src',
                        '@app': './src/app',
                        '@shared': './src/shared',
                        '@assets': './assets',
                        '@features': './src/features',
                        '@widgets': './src/widgets',
                        '@screens': './src/screens',
                        '@entities': './src/entities',
                        '@services': './src/services',
                        '@styles': './src/styles'
                    }
                }
            ],
            'react-native-reanimated/plugin'
        ]
    };
};