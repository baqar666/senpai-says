const { withAppBuildGradle } = require('expo/config-plugins');

// Signs release builds with the upload keystore when ANDROID_KEYSTORE_PATH is set (CI),
// otherwise falls back to the debug keystore so local and test builds still work.
module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes('ANDROID_KEYSTORE_PATH')) return cfg;

    gradle = gradle.replace(
      /signingConfigs \{\n(\s*)debug \{/,
      `signingConfigs {
$1release {
$1    if (System.getenv("ANDROID_KEYSTORE_PATH")) {
$1        storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))
$1        storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
$1        keyAlias System.getenv("ANDROID_KEY_ALIAS")
$1        keyPassword System.getenv("ANDROID_KEY_PASSWORD")
$1    }
$1}
$1debug {`
    );
    gradle = gradle.replace(
      /(release \{\n(?:\s*\/\/.*\n)*\s*)signingConfig signingConfigs\.debug/,
      '$1signingConfig System.getenv("ANDROID_KEYSTORE_PATH") ? signingConfigs.release : signingConfigs.debug'
    );
    cfg.modResults.contents = gradle;
    return cfg;
  });
};
