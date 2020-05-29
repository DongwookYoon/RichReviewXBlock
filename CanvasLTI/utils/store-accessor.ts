/* eslint-disable camelcase */
import { Store } from 'vuex'
import { getModule } from 'vuex-module-decorators'
import { IAuthPayload, IUser } from '../store/AuthStore'
import AuthStore from '~/store/AuthStore'

let lti_auth : AuthStore

function initialiseStores (store: Store<any>): void {
  lti_auth = getModule(AuthStore, store)
  // If more stores needed, add them here.
}

export { initialiseStores, lti_auth, IAuthPayload, IUser } // Export additional stores here.
