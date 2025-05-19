module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", {
        "unstable_transformImportMeta": true
      }]
    ],
    plugins: [
      // Add any Babel plugins here
      "transform-inline-environment-variables",
      "@babel/plugin-transform-export-namespace-from",
      ["module:react-native-dotenv", {
        "moduleName": "@env",
        "path": ".env",
        "blacklist": null,
        "whitelist": null,
        "safe": false,
        "allowUndefined": true
      }],
      ["babel-plugin-transform-import-meta", {
        "module": "ES6"
      }]
    ],
    env: {
      production: {
        plugins: ["transform-remove-console"]
      }
    }
  };
};
