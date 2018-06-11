// var HTMLWebpackPlugin = require('html-webpack-plugin');
// var HTMLWebpackPluginConfig = new HTMLWebpackPlugin({
//     template: __dirname + '/index.html',
//     filename: 'index.html',
//     inject: 'body'
// });

module.exports = {
    entry: __dirname + '/client/richreview.js',
    module: {
        rules: [
            {
                test: /\.js$/,
                include: /client/,
                use: {
                    loader: 'babel-loader'
                }
            }
        ]
    },
    output: {
        path: __dirname + '/dist',
        filename: 'bundle.js'
    },
    /*plugins: [HTMLWebpackPluginConfig]*/
};
