// Adds the IDs that differ between test and release builds to app.json, from env vars
// (GitHub Actions secrets in CI). Without them the app uses Google's official test AdMob app ID,
// which only ever shows test ads.
const TEST_ADMOB_ANDROID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_ADMOB_IOS = 'ca-app-pub-3940256099942544~1458002511';

module.exports = ({ config }) => {
  config.plugins = config.plugins.map((plugin) =>
    plugin === 'react-native-google-mobile-ads'
      ? [
          plugin,
          {
            androidAppId: process.env.ADMOB_ANDROID_APP_ID || TEST_ADMOB_ANDROID,
            iosAppId: TEST_ADMOB_IOS,
            // Wait for the user's consent choice before Google measures anything.
            delayAppMeasurementInit: true,
          },
        ]
      : plugin
  );
  return config;
};
