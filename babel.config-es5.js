const presets = [
  [
    "@babel/env",
    {
      targets: {
        esmodules: false
      },
      useBuiltIns: "usage"
    }
  ]
];

module.exports = { extends: "./babel.config.js", presets };
