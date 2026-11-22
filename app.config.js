const app = require("./app.json").expo;

const plugins = app.plugins.map((plugin) => {
  if (!Array.isArray(plugin) || plugin[0] !== "react-native-google-mobile-ads") {
    return plugin;
  }

  return [
    plugin[0],
    {
      ...plugin[1],
      androidAppId:
        process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ||
        plugin[1].androidAppId,
      iosAppId:
        process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || plugin[1].iosAppId,
    },
  ];
});

module.exports = { ...app, plugins };
