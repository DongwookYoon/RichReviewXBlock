/* eslint-disable @typescript-eslint/no-unused-vars */

import { IUser } from '~/model/user'

export interface ITokenInfo {
  token: string;
  name ?: string;
  creationTime ?: Date;
}

const TOKEN_LIFETIME: number = 3600

const state = () => ({
  userId: null,
  userName: null,
  codeToken: null,
  clientCredentialsToken: null,
  oidcStateData: null
})

const getters = {
  oidcState: (state: any, getters: any) : string => state.oidcState,
  isLoggedIn: (state: any, getters: any) : boolean => state.userId !== null,
  authUser: (state: any, getters: any) : IUser => {
    return { id: state.userId, userName: state.userName }
  },
  codeToken: (state: any, getters: any) : ITokenInfo => state.codeToken,
  clientCredentialsToken: (state: any, getters: any) : ITokenInfo => state.clientCredentialsToken
}

const actions = {
  /**
   * Update auth state using mutation `setOAuthData`.
   * Uses OAuth token obtained from LTI platform.
   * Payload may be acquired via OAuth Code Flow with
   * authorization code grant.
   */
  updatePlatformAuth ({ commit, state }: any, payload : ITokenInfo) {
    commit('setOAuthData', payload)
  },

  /**
   * Update auth state using mutation `setClientCredentialsToken`.
   * Uses OAuth token obtained from LTI platform.
   * Token may be acquired via client credentials flow with
   * client credentials code grant.
   */
  updateClientCredentialsToken ({ commit, state } : any, clientCredentialToken : string | null) {
    commit('setClientCredentialsToken', clientCredentialToken)
  },

  logIn ({ commit, state } : any, loginInfo : IUser) {
    console.log('logging in!! ' + JSON.stringify(loginInfo))
    commit('setLogin', loginInfo)
  },

  logOut ({ commit, state } : any) {
    commit('clearLogin')
  },

  updateOidcState ({ commit, state } : any, oidcState: string) {
    commit('setOidcState', oidcState)
  }

}

const mutations = {
  setLogin (state: any, authPayload : IUser) {
    state.userId = authPayload.id
    state.userName = (authPayload.userName ? authPayload.userName : null)
  },

  clearLogin (state: any) {
    state.userId = null
    state.userName = null
  },

  setClientCredentialsToken (state: any, token: string) {
    state.codeToken = {
      token,
      creationTime: new Date()
    }
  },

  setOAuthData (state: any, payload : ITokenInfo) {
    state.clientCredentialsToken = {
      token: payload.token,
      name: payload.name,
      creationTime: new Date()
    }
  },

  setOidcState (state: any, stateData: string) {
    state.oidcStateData = stateData
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
