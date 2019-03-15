const presets = [
  [
    "@babel/env",
    {
      targets: {
        browsers: "> 2.5%",
        edge: "17",
        firefox: "60",
        chrome: "67",
        safari: "11.1",
        opera: "57",
        ios: "10"
      },
      useBuiltIns: "usage",
    },
  ],
];

const plugins = ["@babel/plugin-transform-runtime"];

module.exports = { presets, plugins };