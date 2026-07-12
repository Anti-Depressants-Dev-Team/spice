const { build: baseBuild } = require("./package.json");

const NATIVE_UPDATE_CHANNEL = "native";
const NATIVE_UPDATER_CACHE = "spice-native-updater";

const nativePublish = Array.isArray(baseBuild.publish)
  ? baseBuild.publish.map((publisher) => ({
      ...publisher,
      channel: NATIVE_UPDATE_CHANNEL,
      updaterCacheDirName: NATIVE_UPDATER_CACHE,
    }))
  : baseBuild.publish && typeof baseBuild.publish === "object"
    ? {
        ...baseBuild.publish,
        channel: NATIVE_UPDATE_CHANNEL,
        updaterCacheDirName: NATIVE_UPDATER_CACHE,
      }
    : baseBuild.publish;

module.exports = {
  ...baseBuild,
  appId: "com.spice.native",
  productName: "Spice Native",
  executableName: "Spice Native",
  artifactName: "Spice-Native-${version}-${arch}.${ext}",
  publish: nativePublish,
  detectUpdateChannel: false,
  generateUpdatesFilesForAllChannels: false,
  directories: {
    output: "dist-native",
  },
  linux: {
    ...baseBuild.linux,
    executableName: "spice-native",
    synopsis: "SPICE Music with a bundled local runtime",
    description: "SPICE Native runs the SPICE Music interface and media runtime on the user's computer.",
    target: ["AppImage", "deb", "rpm", "tar.gz"],
  },
  deb: {
    ...baseBuild.deb,
    packageName: "spice-native",
  },
  rpm: {
    ...baseBuild.rpm,
    packageName: "spice-native",
  },
  nsis: {
    ...baseBuild.nsis,
    artifactName: "Spice-Native-Setup-${version}-${arch}.${ext}",
    shortcutName: "Spice Native",
    uninstallDisplayName: "Spice Native",
  },
  extraResources: [
    ...(Array.isArray(baseBuild.extraResources) ? baseBuild.extraResources : []),
    {
      from: "native-runtime",
      to: "native-runtime",
      filter: ["**/*"],
    },
  ],
};
