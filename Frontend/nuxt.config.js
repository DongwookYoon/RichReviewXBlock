import pkg from './package'
import * as certs from './ssl/certs'


let optimizeBuild = (process.env.NUXT_OPTIMIZE !== undefined) && process.env.NUXT_OPTIMIZE.trim().toUpperCase() === 'TRUE';

var config =  {
  mode: 'universal',
  serverMiddleware: [
    // Will register file from project legacy directory to handle /legacy/* requires
    // Add middleware in ~/modules/LoadServerMiddleware module instead to prevent loading middleware during build
    //{ path: '/', handler: '~/legacy/app.js' }
  ],

  /*
   ** Server settings
   */
  server: {
    https: {
      key: certs.key,
      cert: certs.cert,
      ca: [certs.ca]
    },
    port: certs.port, // default: 3000
    host: certs.host // default: localhost
  },

  env: {
    backend:
      process.env.NODE_ENV !== 'production' ? 'localhost' : 'richreview.net'
  },

  /*
   ** Headers of the page
   */
  head: {
    title: 'RichReview',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: pkg.description }
    ],
    link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    script: [
      {
        src: 'https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js'
      },
      {
        src:
          'https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.3/umd/popper.min.js'
      }
    ]
  },

  /*
   ** Customize the progress-bar color
   */
  loading: '~/components/loading-icon.vue',

  /*
   ** Global CSS
   */
  css: [],

  /*
   ** Plugins to load before mounting the App
   */
  plugins: [{src: './plugins/DateHelper'}, {
    src: './plugins/vue-js-toggle-button.js', ssr: false
  }],

  /*
   ** Nuxt.js modules
   */
  modules: [
    // Doc: https://axios.nuxtjs.org/usage
    '@nuxtjs/axios',
    // '@nuxtjs/auth',
    '@nuxtjs/router',
    '~/modules/LoadServerMiddleware'
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
  // auth: {
  //   // Options
  //   redirect: {
  //     login: '/education/login',
  //     logout: '/education',
  //     callback: '/education/login',
  //     home: '/education/authentication'
  //   },
  //   strategies: {
  //     google: {
  //       client_id:
  //         '1038882230851-in5k8etr5gsjh52o38qo1rg5m4rge7hb.apps.googleusercontent.com'
  //     }
  //   }
  // },

  // /*
  //  ** Globally enable auth
  //  */
  // router: {
  //   middleware: ['auth']
  // },

  /*
   ** Build configuration
   */
  build: {
    // extractCSS: true,

    /*
     **Experimental build optimizations. Enable by setting NUXT_EXP=true.
    */
    //Enabled parallel webpack building. Not recommended as this causes Nuxt build warning.
    //parallel: optimizeBuild,
    //Enable webpack caching.
    cache: optimizeBuild,
    //Improved caching with an intermediate caching step
    hardSource: optimizeBuild,

    /*
     ** You can extend webpack config here.
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

      config.node = {
        fs: 'empty'
      }
    }
  }
};
 

//Build messages
console.log(`***Build optimizations***
Webpack parallelization with thread-loader: ${config.build.parallel ? 'enabled' : 'disabled'}
Caching with terser-webpack-plugin and cache-loader ${config.build.cache ? 'enabled' : 'disabled'}
Intermediate caching with hard-source-webpack-plugin: ${config.build.hardSource ? 'enabled' : 'disabled'}\n`);

export default config;