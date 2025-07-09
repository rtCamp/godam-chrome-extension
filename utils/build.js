import { NODE_ENV } from "./env";

var webpack = require("webpack"),
  config = require("../webpack.config");

//delete config.chromeExtensionBoilerplate;
delete config.custom;

config.mode = NODE_ENV;

webpack(config, function (err) {
  if (err) throw err;
});
