module.exports = {
    devServer: {
        proxy: 'http://94.250.251.94:3180/'
    },
    chainWebpack: config => {
        config.resolve.alias.set('vue', '@vue/compat')

        config.module
            .rule('vue')
            .use('vue-loader')
            .tap(options => {
                return {
                    ...options,
                    compilerOptions: {
                        compatConfig: {
                            MODE: 2
                        }
                    }
                }
            })
    }
}