const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => ({
    mode: argv.mode || 'development',
    entry: {
        widget: './src/widget.ts',
        configuration: './src/configuration.ts'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        clean: true
    },
    devtool: argv.mode === 'production' ? false : 'source-map',
    module: {
        rules: [
            { test: /\.ts$/, use: 'ts-loader', exclude: /node_modules/ }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'src/widget.html', to: 'widget.html' },
                { from: 'src/configuration.html', to: 'configuration.html' },
                { from: 'node_modules/chart.js/dist/chart.min.js', to: 'lib/chart.min.js' }
            ]
        })
    ]
});