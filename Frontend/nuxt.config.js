import fs from 'fs'
import path from 'path'
import pkg from './package'
import * as certs from './ssl/certs'

const optimizeBuild = (process.env.NUXT_OPTIMIZE !== undefined) && process.env.NUXT_OPTIMIZE.trim().toUpperCase() === 'TRUE'

const customRoutes = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'routes.json'), 'utf8'))

const config = {
  mode: 'universal',

  serverMiddleware: [
    // Will register file from project legacy directory to handle /legacy/* requires
    // Added middleware in ~/modules/LoadServerMiddleware module instead to prevent loading middleware during build.
    // { path: '/', handler: '~/legacy/app.js' }
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
    test_mode: 'true',
    prod_url: 'https://richreview.net',
    canvas_oidc_endpoint: 'https://canvas.ubc.ca/api/lti/authorize_redirect',
    canvas_client_id: '', // TODO get canvas client id
    canvas_public_key_set_url: 'https://canvas.ubc.ca/api/lti/security/jwks',
    canvas_path: 'https://canvas.ubc.ca', // Path to institution's Canvas deployment
    canvas_host: 'canvas.ubc.ca',
    deployment_id: '12277:f7688ba591cfce37b3bcacd61370d6dc591cf543',
    rs256_public_jwt: {
      alg: 'RS256',
      e: 'AQAB',
      kid: 'sSjNGZuBvnkNFEiRNf6wjuHSpy_RvQNk54NHwgHFrq4',
      kty: 'RSA',
      n: '7HL1kCH7YDeRW2XWm6zHcTmrkD0Y02khq2K1C9aAfvPSAXLHiaTtz5E2eO3A2CSFES7nTvNDKlDrV9aql1v6FOacraVhUMa-yP-UVilJM6K-FBjrOGj7txnPOeK7kJMz_dynR0VwZd-wfQ1UQmSGcDhGRGjaiZ3paml02vN1sQDGXDjnCv0bW8uTFirtdg6l1pYW1gHOUpydEDsL86y7Klmb7KNiGmlbe4cQUm18aRHkKS-tiW4eQgWHoqMCzrrchrx280HpBB01DNQmtJ_P6Z70yVc0PM4UjYFBvEBIAJCRcK9tT7yE7F-YJeDrAHCCO4AElPIE2dkDRRFHGZS3EOaQcaN-yQN0B_hazbsv98rYbm4FpXBU-IMjzIdjB5PXmOnSePxU8rWvze9xAiwU_qIqzr6ObsYzNbO_FC0YaDPvShWYziEE871SwhH-ghE0fLFEmJ928lu3PIGYpzd0xMgzcsP95P1L9YguSgxdMjNnDjvu-inqSHecI6ywZdB6D6pQzEsIpniCi_znYznLCVLuZ0CeGLSUFdQ-8DbV8SAcPqaVH0aUBf_VEaBEQNDYAsegGjQ71fyRR4o2UxrpxsjXDmw6Q7MpLA9CkTyi_DRhSNqRKreq5v25tTGahQEhEjAltLlrxv_RnhC-sLNCCEfNPX93F11NT3_TIxl-3Ec',
      use: 'sig'
    },
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
  plugins: [{ src: './plugins/DateHelper' }, {
    src: './plugins/vue-js-toggle-button.js', ssr: false
  }],

  buildModules: ['@nuxt/typescript-build'],
  /*
   ** Nuxt.js modules
   */
  modules: [
    // Doc: https://axios.nuxtjs.org/usage
    '@nuxtjs/axios',
    // '@nuxtjs/auth',
    // '@nuxtjs/router'
    '~/modules/LoadServerMiddleware'
  ],

  router: {
    extendRoutes (routes) {
      routes.push(...customRoutes)
    }
  },
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
     **Experimental build optimizations. Enable by setting NUXT_OPTIMIZE=true.
    */
    // Enabled parallel webpack building. Not recommended as this causes Nuxt build warning.
    // parallel: optimizeBuild,
    // Enable webpack caching.
    cache: optimizeBuild,
    // Improved caching with an intermediate caching step
    hardSource: optimizeBuild,

    /*
     ** You can extend webpack config here.
     */
    extend (config, ctx) {
      // Run ESLint on save
      // if (ctx.isDev && ctx.isClient) {
      //  config.module.rules.push({
      //    enforce: 'pre',
      //    test: /\.(js|vue)$/,
      //    loader: 'eslint-loader',
      //    exclude: /(node_modules)/
      //  })
      // }

      config.node = {
        fs: 'empty'
      }
    }
  }
}

// Build messages
console.log(`***Build optimizations***
Webpack parallelization with thread-loader: ${config.build.parallel ? 'enabled' : 'disabled'}
Caching with terser-webpack-plugin and cache-loader ${config.build.cache ? 'enabled' : 'disabled'}
Intermediate caching with hard-source-webpack-plugin: ${config.build.hardSource ? 'enabled' : 'disabled'}\n`)

export default config
