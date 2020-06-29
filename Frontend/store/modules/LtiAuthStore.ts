/* eslint-disable @typescript-eslint/no-unused-vars */

import User, { IUser } from '~/model/user'

export interface ITokenInfo {
  token: string;
  name ?: string;
  creationTime ?: Date;
}

const TOKEN_LIFETIME: number = 3600

const state = () => ({
  userId: null,
  userName: null,
  userRoles: null,
  codeToken: null,
  clientCredentialsToken: null,
  oidcStateData: null
})

const getters = {
  oidcState: (state: any, getters: any) : string => state.oidcState,
  isLoggedIn: (state: any, getters: any) : boolean => state.userId !== null,
  authUser: (state: any, getters: any) : User => {
    return new User(state.userId, state.userName || '', state.userRoles || [])
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

  logIn ({ commit, state } : any, loginInfo : User) {
    console.log('Logging in! ')
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
  setLogin (state: any, authPayload : User) {
    state.userId = authPayload.id
    state.userName = (authPayload.userName ? authPayload.userName : null)
    state.userRoles = (authPayload.roles ? authPayload.roles : null)
  },

  clearLogin (state: any) {
    state.userId = null
    state.userName = null
  },

  setClientCredentialsToken (state: any, token: string) {
    state.clientCredentialsToken = {
      token,
      creationTime: new Date()
    }
  },

  setOAuthData (state: any, payload : ITokenInfo) {
    state.codeToken = {
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
