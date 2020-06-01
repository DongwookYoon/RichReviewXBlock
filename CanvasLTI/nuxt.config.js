import * as certs from './ssl/certs'
import plugins from './store'

// import colors from 'vuetify/es5/util/colors'

export default {
  mode: 'universal',

  /*
  ** Global CSS
  */
  css: [
  ],

  /*
  ** Plugins to load before mounting the App
  */
  plugins: [],

  /*
  ** Nuxt.js dev-modules
  */
  buildModules: [
    '@nuxt/typescript-build',
    '@nuxtjs/router-extras'
  ],
  /*
  ** Nuxt.js modules
  */
  modules: [
    // Doc: https://axios.nuxtjs.org/usage
    '@nuxtjs/axios',
    '@nuxtjs/pwa',
    // Doc: https://github.com/nuxt-community/dotenv-module
    '@nuxtjs/dotenv',
    // Doc: https://auth.nuxtjs.org/guide/setup.html
    // '@nuxtjs/router',
    //'~/modules/LoadServerMiddleware'
  ],

  /*
  ** Axios module configuration
  ** See https://axios.nuxtjs.org/options
  */
  axios: {
  },

  /*
  ** Auth module configuration
  ** See https://auth.nuxtjs.org/#getting-started
  */
  auth: {
  },

  /*
  ** Nuxt server settings
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
    // TODO generate a production public_jwk when generating developer key. This is only for test.
    canvas_public_key_set_url: 'https://canvas.ubc.ca/api/lti/security/jwks',
    jwk_alg: 'RS256',
    rsa256_private_key: '',
    canvas_client_id: '',
    canvas_client_secret: '',
    canvas_path: 'https://canvas.ubc.ca',     //Path to institution's Canvas deployment
    deployment_id: 'Add Canvas deployment id', // TODO Canvas deployment id
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
      { name: 'viewport', content: 'width=device-width, initial-scale=1' }
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
  ** vuetify module configuration
  ** https://github.com/nuxt-community/vuetify-module
  */
  // vuetify: {
  //   customVariables: ['~/assets/variables.scss'],
  //   theme: {
  //     dark: true,
  //     themes: {
  //       dark: {
  //         primary: colors.blue.darken2,
  //         accent: colors.grey.darken3,
  //         secondary: colors.amber.darken3,
  //         info: colors.teal.lighten1,
  //         warning: colors.amber.base,
  //         error: colors.deepOrange.accent4,
  //         success: colors.green.accent3
  //       }
  //     }
  //   }
  // },

  /*
  ** Build configuration
  */
  build: {
    /*
    ** You can extend webpack config here
    */
    extend (config, ctx) {
      config.node = {
        fs: 'empty'
      }
    }
  }
}
