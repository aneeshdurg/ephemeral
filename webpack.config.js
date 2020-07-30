const path = require('path');
const webpack = require('webpack');

module.exports = (env) => {
    return {
        entry: {
            index: './src/index.tsx',
            ephemeral: './src/ephemeral.tsx',
            "test/test": './src/test/test.tsx'
        },
        plugins: [
            new webpack.DefinePlugin({
                    'process.env.NODE_ENV': JSON.stringify(
                        env.production === 'true' ? 'production' : 'development'
                    )
                }
            )
        ],
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
    }
};
