module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'nativewind/babel',
      'babel-plugin-transform-import-meta',
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@giphy/react-native-sdk': './src/mocks/giphy.js',
          },
        },
      ],
    ],
  };
};
