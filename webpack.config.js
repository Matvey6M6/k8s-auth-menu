const path = require("path");

module.exports = (_env, argv) => ({
  entry: "./src/renderer.tsx",
  target: "electron-renderer",
  devtool: argv.mode === "development" ? "source-map" : false,
  node: {
    __dirname: false,
    __filename: false
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: { transpileOnly: true }
        }
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  },
  externals: [
    {
      "@k8slens/extensions": "var global.LensExtensions",
      react: "var global.React"
    }
  ],
  output: {
    libraryTarget: "commonjs2",
    globalObject: "this",
    filename: "renderer.js",
    path: path.resolve(__dirname, "dist"),
    clean: true
  },

  optimization: { minimize: false },
  stats: "minimal"
});
