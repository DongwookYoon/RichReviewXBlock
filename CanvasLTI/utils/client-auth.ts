export default class ClientAuth {


  private domain: string
  private clientId: string

  constructor(clientId: string, domain: string) {
    this.clientId = clientId
    this.domain = domain
  }

  /**
   * Obtain token which gives app access to Canvas Advantage Grading Services
   * line items and score to support assignment submission
   */
  public getGradeServicesToken() : string {
    return ''
  }



  private generateClientAssertion() : string {


    return ''
  }




}
