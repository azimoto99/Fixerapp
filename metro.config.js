// This is a compatibility file for metro.config.js
// Using CommonJS syntax since it's being loaded with require()

// Simply load and re-export the actual config from metro.config.cjs
const metroConfig = require('./metro.config.cjs');
module.exports = metroConfig;