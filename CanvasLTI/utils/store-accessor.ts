import { Store } from 'vuex';
import { getModule } from 'vuex-module-decorators'
import AuthStore from '~/store/auth-store';

let ltiAuth : AuthStore;

function initialiseStores(store: Store<any>): void {
  ltiAuth = getModule(AuthStore, store);
  //If more stores needed, add them here.
}

export { initialiseStores, ltiAuth };   //Export additional stores here.
