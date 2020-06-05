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
    '~/modules/LoadServerMiddleware'
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
    test_mode: 'true',
    prod_url: 'https://richreview.net',
    canvas_oidc_endpoint: 'https://canvas.ubc.ca/api/lti/authorize_redirect',
    canvas_client_id: '',                     // TODO get canvas client id
    canvas_public_key_set_url: 'https://canvas.ubc.ca/api/lti/security/jwks',
    canvas_path: 'https://canvas.ubc.ca',     //Path to institution's Canvas deployment
    canvas_host: 'canvas.ubc.ca',
    deployment_id: '12277:f7688ba591cfce37b3bcacd61370d6dc591cf543',
    rs256_public_jwt: {
      "alg": "RS256",
      "e": "AQAB",
      "kid": "sSjNGZuBvnkNFEiRNf6wjuHSpy_RvQNk54NHwgHFrq4",
      "kty": "RSA",
      "n": "7HL1kCH7YDeRW2XWm6zHcTmrkD0Y02khq2K1C9aAfvPSAXLHiaTtz5E2eO3A2CSFES7nTvNDKlDrV9aql1v6FOacraVhUMa-yP-UVilJM6K-FBjrOGj7txnPOeK7kJMz_dynR0VwZd-wfQ1UQmSGcDhGRGjaiZ3paml02vN1sQDGXDjnCv0bW8uTFirtdg6l1pYW1gHOUpydEDsL86y7Klmb7KNiGmlbe4cQUm18aRHkKS-tiW4eQgWHoqMCzrrchrx280HpBB01DNQmtJ_P6Z70yVc0PM4UjYFBvEBIAJCRcK9tT7yE7F-YJeDrAHCCO4AElPIE2dkDRRFHGZS3EOaQcaN-yQN0B_hazbsv98rYbm4FpXBU-IMjzIdjB5PXmOnSePxU8rWvze9xAiwU_qIqzr6ObsYzNbO_FC0YaDPvShWYziEE871SwhH-ghE0fLFEmJ928lu3PIGYpzd0xMgzcsP95P1L9YguSgxdMjNnDjvu-inqSHecI6ywZdB6D6pQzEsIpniCi_znYznLCVLuZ0CeGLSUFdQ-8DbV8SAcPqaVH0aUBf_VEaBEQNDYAsegGjQ71fyRR4o2UxrpxsjXDmw6Q7MpLA9CkTyi_DRhSNqRKreq5v25tTGahQEhEjAltLlrxv_RnhC-sLNCCEfNPX93F11NT3_TIxl-3Ec",
      "use": "sig"
    },
    hostname: process.env.NODE_ENV !== 'production' ? 'localhost' : 'richreview.net',
    backend:
      'localhost' //process.env.NODE_ENV !== 'production' ? 'localhost' : 'richreview.net'
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
