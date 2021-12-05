module.exports = {
    devServer: {
        proxy: 'http://94.250.251.94:3180/'
    },
    chainWebpack: config => {
        // config.resolve.alias.set('@', resolve('src'));
        config.resolve.extensions.add('.vue');
    }
}