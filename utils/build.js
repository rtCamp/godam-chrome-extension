var { NODE_ENV } = require("./env")
var webpack = require("webpack");
var config = require("../webpack.config");

delete config.custom;

config.mode = NODE_ENV;

webpack(config, function (err) {
  if (err) throw err;
});
