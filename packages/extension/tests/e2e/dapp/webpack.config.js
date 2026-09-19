const path = require('path');
const webpack = require('webpack');

// Bundles psbt-builder.entry.js for the browser so test-dapp.html can build PSBTs
// in-page. Same node-core polyfills the extension build uses.
module.exports = {
  mode: 'development',
  devtool: false,
  target: 'web',
  entry: path.resolve(__dirname, 'psbt-builder.entry.js'),
  output: {
    path: __dirname,
    filename: 'psbt-builder.js'
  },
  resolve: {
    fallback: {
      stream: require.resolve('stream-browserify'),
      crypto: require.resolve('crypto-browserify'),
      process: require.resolve('process/browser'),
      events: require.resolve('events/'),
      buffer: require.resolve('buffer/'),
      vm: false
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process'
    })
  ],
  stats: 'minimal'
};
