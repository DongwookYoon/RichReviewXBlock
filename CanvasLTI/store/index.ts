import { Store } from 'vuex'
import { initialiseStores } from '~/utils/store-accessor'

/* Initialize the auth store once here so that it is available globally
   and importing modules do not need to initialize it again */
const initializer = (store: Store<any>) => initialiseStores(store)
export const plugins = [initializer]

/* All stores are made available to importing modules from this export */
export * from '~/utils/store-accessor'
