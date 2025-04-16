module.exports = function (api) {
    api.cache(true);
    return {
        presets: [['module:metro-react-native-babel-preset', { loose: true }]],
        plugins: [
            [
                'module-resolver',
                {
                    root: ['.'],
                    extensions: [
                        '.ios.js',
                        '.android.js',
                        '.js',
                        '.jsx',
                        '.json'
                    ],
                    alias: {
                        '@': './src',
                        '@app': './src/app',
                        '@shared': './src/shared',
                        '@assets': './src/assets',
                        '@features': './src/features',
                        '@widgets': './src/widgets',
                        '@pages': './src/pages',
                        '@entities': './src/entities',
                        '@services': './src/services'
                    }
                }
            ],
            ['@babel/plugin-transform-private-methods', { loose: true }],
            'react-native-reanimated/plugin'
        ]
    };
};