export default {
    mode: 'production',
    entry: {
        littlechart: './src/LittleChart.mjs'
    },
    output: {
        filename: '[name].umd.min.js',
        library: {
            type: 'umd'
        }
    },
    optimization: {
        minimize: true
    }
}
