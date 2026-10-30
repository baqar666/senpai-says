const { withAndroidManifest } = require('expo/config-plugins');

// The screen-time guard's background parts stay out of the free launch, so Play doesn't ask to review them.
const REMOVE = [
  ['service', 'expo.modules.ringtonesetter.GuardService'],
  ['receiver', 'expo.modules.ringtonesetter.GuardBootReceiver'],
];

module.exports = function withFreeLaunch(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application[0];
    for (const [tag, name] of REMOVE) {
      const list = (app[tag] ??= []);
      if (!list.some((e) => e.$['android:name'] === name)) {
        list.push({ $: { 'android:name': name, 'tools:node': 'remove' } });
      }
    }
    return cfg;
  });
};
