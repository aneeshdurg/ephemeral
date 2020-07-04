const path = require('path');

module.exports = {
  entry: {
      index: './src/index.tsx',
      ephemeral: './src/ephemeral.tsx',
      "test/test": './src/test/test.tsx'
  },
  module: {
    rules: [
      {
        test: /\.ts(x?)$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
};
