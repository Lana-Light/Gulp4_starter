const presets = [
  [
    "@babel/env",
    {
      targets: {
        esmodules: true
      },
      useBuiltIns: "usage"
    }
  ]
];

const plugins = ["@babel/plugin-transform-runtime"];

module.exports = { presets, plugins };
