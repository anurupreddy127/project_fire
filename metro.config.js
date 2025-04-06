const { getDefaultConfig } = require("@expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.assetExts = [
  ...defaultConfig.resolver.assetExts,
  "glb",
  "gltf",
  "obj",
  "db",
  "mp3",
  "ttf",
  "png",
  "jpg",
];

module.exports = defaultConfig;
