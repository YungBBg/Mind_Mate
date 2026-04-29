module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // babel-preset-expo automatically adds react-native-worklets/plugin
    // or react-native-reanimated/plugin based on what's installed
    // Since we have react-native-worklets installed, it will use that
    // We should NOT manually add react-native-reanimated/plugin as it
    // will cause conflicts
    plugins: [],
  };
};

