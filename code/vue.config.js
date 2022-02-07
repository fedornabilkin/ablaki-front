module.exports = {
    devServer: {
        proxy: 'http://94.250.251.94:3180/'
    },
    chainWebpack: config => {
        config.resolve.extensions.add('.vue', '.js');
    }
    // css: {
    //     loaderOptions: {
    //         sass: {
    //             additionalData: `
    //                 @import "@/preloadStyles.scss";
    //             `
    //         }
    //     }
    // }
}