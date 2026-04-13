module.exports = {
  transpileDependencies: ['vuetify'],  // Add the dependencies you need to transpile here
  publicPath: './',  // Use `/` to serve assets from the root (adjust if you are deploying to a subdirectory)
  devServer: {
    port: 8082,  // Port for the development server
    historyApiFallback: {
      index: '/index.html',
      disableDotRule: true,
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',  // Proxy API calls to your backend
        changeOrigin: true,  // Handle CORS issues
      }
    }
  },
  pluginOptions: {
    vuetify: {
      // https://github.com/vuetifyjs/vuetify-loader/tree/next/packages/vuetify-loader
    }
  },
  chainWebpack: config => {
    // Disable thread-loader for JS and Vue files
    config.module.rule('js').uses.delete('thread-loader');
    config.module.rule('vue').uses.delete('thread-loader');
  }
};
