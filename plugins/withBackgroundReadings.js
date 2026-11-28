/**
 * Lets iOS run Barometer in the background to take a pressure reading
 * (modules/baro-background): Background App Refresh ("fetch") and
 * background processing, with the two task identifiers the module
 * registers. No location, audio or other background mode.
 */
const { withInfoPlist } = require('expo/config-plugins');

const IDS = ['com.bwk.barometer.refresh', 'com.bwk.barometer.processing'];

module.exports = function withBackgroundReadings(config) {
  return withInfoPlist(config, (cfg) => {
    const p = cfg.modResults;
    const modes = new Set(Array.isArray(p.UIBackgroundModes) ? p.UIBackgroundModes : []);
    modes.add('fetch');
    modes.add('processing');
    p.UIBackgroundModes = [...modes];
    const ids = new Set(Array.isArray(p.BGTaskSchedulerPermittedIdentifiers) ? p.BGTaskSchedulerPermittedIdentifiers : []);
    for (const id of IDS) ids.add(id);
    p.BGTaskSchedulerPermittedIdentifiers = [...ids];
    return cfg;
  });
};
