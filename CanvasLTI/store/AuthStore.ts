/**
 * auth-store.ts
 *
 * Provides a Vuex store which supports storing OAuth access tokens and user id.
 */

import { Module, VuexModule, Mutation, Action } from 'vuex-module-decorators'

export interface IAuthPayload {
  userId: string
  userName ?: string
  token: string
}

export interface IUser {
  userId: string
  userName ?: string
}

@Module({
  name: 'AuthStore', // Important: Module name MUST be the same as the file name and class name.
  stateFactory: true,
  namespaced: true
})
export default class AuthStore extends VuexModule {
  private userId: string | null = null
  private userName: string | null = null
  private codeToken: string | null = null
  private clientToken: string | null = null

  public isAuthenticated () : boolean {
    return (this.userId !== null && this.codeToken !== null)
  }

  get authUser () : IUser {
    //  Return a User object representing authenticated user
    const user : IUser = {
      userId: this.userId as string
    }
    if (this.userName !== null) {
      user.userName = this.userName
    }
    return user
  }

  /* Return the OAuth token obtained from code flow,
     or null if RichReview
     has not been authorized with the LTI platform  */
  get codeFlowToken () : string | null {
    return this.codeToken
  }

  get clientCredentialsToken () : string | null {
    return this.clientToken
  }

  @Mutation
  setAuth (authPayload : IAuthPayload) {
    this.userId = authPayload.userId
    this.userName = (authPayload.userName ? authPayload.userName : null)
    this.codeToken = authPayload.token
  }

  @Mutation
  setClientCredentialsToken (token: string) {
    this.clientToken = token
  }

  /**
   * Update auth state using mutation `setAuth`.
   * Uses OAuth token obtained from LTI platform.
   * Payload may be acquired via OAuth Code Flow with
   * authorization code grant.
   */
  @Action
  updatePlatformAuth (authPayload : IAuthPayload) {
    this.context.commit('setAuth', authPayload)
  }

  /**
   * Update auth state using mutation `setClientCredentialsToken`.
   * Uses OAuth token obtained from LTI platform.
   * Token may be acquired via client credentials flow with
   * client credentials code grant.
   */
  @Action
  updateClientCredentialsToken (token : string) {
    this.context.commit('setClientCredentialsToken', token)
  }
}
