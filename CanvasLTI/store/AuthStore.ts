/**
 * auth-store.ts
 *
 * Provides a Vuex store which supports storing OAuth access tokens and user id.
 */

import { Module, VuexModule, Mutation, Action } from 'vuex-module-decorators'


export interface IUser {
  userId: string
  userName ?: string
}

interface IAuthData {
  token: string,
  name ?: string
}

interface ITokenInfo {
  token: string,
  name ?: string,
  creationTime: Date
}

@Module({
  name: 'AuthStore', // Important: Module name MUST be the same as the file name and class name.
  stateFactory: true,
  namespaced: true
})
export default class AuthStore extends VuexModule {
  private readonly TOKEN_LIFETIME: number  = 3600
  private userId: string | null = null
  private userName: string | null = null
  private codeFlowToken: ITokenInfo | null = null
  private clientToken: ITokenInfo | null = null
  private oidcStateData ?: string;


  /*Getters */

  get oidcState () : string | null {
    if (!this.oidcStateData) {
      return null
    }
    return this.oidcStateData
  }


  get isLoggedIn () : boolean {
    return (this.userId !== null )
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
  get codeToken () : string | null {
    if (this.codeFlowToken === null)
      return null

    /* Check if token expired */
    const now : Date = new Date()
    if (now.getSeconds() - this.codeFlowToken.creationTime.getSeconds() > this.TOKEN_LIFETIME) {
      this.codeFlowToken = null;
    }

    return (this.codeFlowToken === null ? null : this.codeFlowToken.token)
  }

  get clientCredentialsToken () : string | null {
    if (this.clientToken === null) {
      return null
    }

    /* Check if token expired */
    const now : Date = new Date()
    if (now.getSeconds() - this.clientToken.creationTime.getSeconds() > this.TOKEN_LIFETIME) {
      this.clientToken = null;
    }

    return (this.clientToken === null ? null : this.clientToken.token)
  }



  /*Mutations */

  @Mutation
  setLogin (authPayload : IUser) {
    this.userId = authPayload.userId
    this.userName = (authPayload.userName ? authPayload.userName : null)
  }

  @Mutation
  clearLogin () {
    this.userId = null
    this.userName = null
  }

  @Mutation
  setCodeFlowToken (token: string) {
    this.codeFlowToken = {
      token,
      creationTime: new Date()
    }
  }

  @Mutation
  setOAuthData (authData: IAuthData) {
    this.clientToken = {
      token: authData.token,
      name: authData.name,
      creationTime: new Date()
    }
  }

  @Mutation
  setOidcState (stateData: string) {
    this.oidcStateData = stateData
  }


  /* Actions */

  /**
   * Update auth state using mutation `setAuth`.
   * Uses OAuth token obtained from LTI platform.
   * Payload may be acquired via OAuth Code Flow with
   * authorization code grant.
   */
  @Action
  updatePlatformAuth (codeFlowToken: string | null, userName ?: string) {
    this.context.commit('setOAuthData', {codeFlowToken, userName})
  }

  /**
   * Update auth state using mutation `setClientCredentialsToken`.
   * Uses OAuth token obtained from LTI platform.
   * Token may be acquired via client credentials flow with
   * client credentials code grant.
   */
  @Action
  updateClientCredentialsToken (clientCredentialToken : string | null) {
    this.context.commit('setClientCredentialsToken', clientCredentialToken)
  }

  @Action
  logIn (loginInfo : IUser){
    this.context.commit('setLogin', loginInfo)
  }

  @Action
  logOut(){
    this.context.commit('clearLogin')
  }

  @Action
  updateOidcState(state: string){
    this.context.commit('setOidcState', state)
  }
}
