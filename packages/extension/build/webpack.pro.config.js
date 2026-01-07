const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

const config = {
  mode: 'production',
  devtool: false,
  performance: {
    maxEntrypointSize: 2500000,
    maxAssetSize: 2500000
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          mangle: {
            keep_classnames: true
          },
          compress: {
            keep_classnames: true
          }
        }
      })
    ]
  },
  plugins: [
    // new BundleAnalyzerPlugin(),
    new webpack.DefinePlugin({
      'process.env.BUILD_ENV': JSON.stringify('PRO')
    })
  ]
};

module.exports = config;
