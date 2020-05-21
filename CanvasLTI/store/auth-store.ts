import { Module, VuexModule, Mutation, Action } from 'vuex-module-decorators'

interface IAuthPayload {
  userID: string;
  token: any,
  randomData: any
}

@Module({
  name: 'AuthStore',
  stateFactory: true,
  namespaced: true,
})
export default class AuthStore extends VuexModule {

  userID: any = null;
  token: any = null;
  randomData: any = null;

  get authorized () : boolean  {
    //TODO really check token and data against data from LTI request
    return this.token !== null && this.randomData != null;
  }

  @Mutation
  setAuth({userID, token, randomData}:IAuthPayload) {
    this.userID = userID;
    this.token = token;
    this.randomData = randomData;
  }

  /**
   * Update auth state using mutation setUser using
   * OAuth token obtained from LTI platform.
   */
  @Action
  updatePlatformAuth(authPayload : IAuthPayload) {
    this.context.commit('setAuth', authPayload);
  }
}
