export default {
    mode: 'production',
    experiments: {
        outputModule: true
    },
    entry: {
        littlechart: './src/LittleChart.mjs'
    },
    output: {
        filename: '[name].esm.min.js',
        library: {
            type: 'module'
        }
    },
    optimization: {
        minimize: true
    }
}
