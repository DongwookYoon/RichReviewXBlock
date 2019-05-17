import pkg from './package'

export default {
  mode: 'universal',

  /*
   ** Server settings
   */
  server: {
    port: 8000, // default: 3000
    host: '127.0.0.1' // default: localhost
  },

  /*
   ** Headers of the page
   */
  head: {
    title: pkg.name,
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: pkg.description }
    ],
    link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }]
  },

  /*
   ** Customize the progress-bar color
   */
  loading: { color: '#fff' },

  /*
   ** Global CSS
   */
  css: [],

  /*
   ** Plugins to load before mounting the App
   */
  plugins: ['./plugins/DateHelper'],

  /*
   ** Nuxt.js modules
   */
  modules: [
    // Doc: https://axios.nuxtjs.org/usage
    '@nuxtjs/axios',
    '@nuxtjs/auth',
    'bootstrap-vue/nuxt',
    '@nuxtjs/router'
  ],

  /*
   ** Axios module configuration
   */
  axios: {
    // See https://github.com/nuxt-community/axios-module#options
  },

  /*
   ** Auth module configuration
   */
  auth: {
    // Options
    redirect: {
      login: '/login',
      logout: '/',
      callback: '/login',
      home: '/authentication'
    },
    strategies: {
      google: {
        client_id:
          '1038882230851-in5k8etr5gsjh52o38qo1rg5m4rge7hb.apps.googleusercontent.com'
      }
    }
  },

  /*
   ** Globally enable auth
   */
  router: {
    middleware: ['auth']
  },

  /*
   ** Build configuration
   */
  build: {
    extractCSS: true,

    /*
     ** You can extend webpack config here
     */
    extend(config, ctx) {
      // Run ESLint on save
      if (ctx.isDev && ctx.isClient) {
        config.module.rules.push({
          enforce: 'pre',
          test: /\.(js|vue)$/,
          loader: 'eslint-loader',
          exclude: /(node_modules)/
        })
      }
    }
  }
}
