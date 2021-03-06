const { notarize } = require('electron-notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  return await notarize({
    appBundleId: 'com.nexusearth.NexusTritium',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: 'xxxxxxxxxxx',
    appleIdPassword: 'xxxxxxxxxxx',
  });
};
