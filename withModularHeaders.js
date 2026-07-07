const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf8');

        if (!podfileContent.includes('use_modular_headers!')) {
          // Insert after platform :ios
          podfileContent = podfileContent.replace(
            /platform :ios, .*/,
            '$&\nuse_modular_headers!'
          );
          fs.writeFileSync(podfilePath, podfileContent);
        }
      }
      return config;
    },
  ]);
};
