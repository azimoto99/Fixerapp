module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Add any Babel plugins here
      "transform-inline-environment-variables",
      ["module:react-native-dotenv", {
        "moduleName": "@env",
        "path": ".env",
        "blacklist": null,
        "whitelist": null,
        "safe": false,
        "allowUndefined": true
      }],
    ],
    env: {
      production: {
        plugins: ["transform-remove-console"]
      }
    }
  };
};
