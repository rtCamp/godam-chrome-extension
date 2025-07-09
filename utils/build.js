process.env.BABEL_ENV = "production";
process.env.NODE_ENV = "production";
process.env.ASSET_PATH = "/";

var webpack = require("webpack"),
  config = require("../webpack.config");

//delete config.chromeExtensionBoilerplate;
delete config.custom;

config.mode = "production";

webpack(config, function (err) {
  if (err) throw err;
});
