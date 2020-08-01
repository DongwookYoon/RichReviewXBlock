export default class Roles {
  public static readonly INSTRUCTOR : string = 'instructor'
  public static readonly TA : string = 'ta'
  public static readonly STUDENT : string = 'student'

  public static readonly CONTEXT_SCOPE: string = 'http://purl.imsglobal.org/vocab/lis/v2/membership'

  /**
   * Determines the user's lti context (course) roles given a set of
   * lti scopes. Does NOT consider system or institution roles. These
   * are ignored.
   *
   * Roles are expected to follow the lti 1.3 specification
   * @see http://www.imsglobal.org/spec/lti/v1p3/#role-vocabularies
   * @param ltiRoles string[] Set of all lti roles for a user.
   */
  public static getUserRoles (ltiRoles : string[]) : string[] {
    const friendlyRoles : string[] = []

    for (const curRole of ltiRoles) {
      if (curRole.includes(Roles.CONTEXT_SCOPE)) {
        const contextRole: string = curRole.replace(Roles.CONTEXT_SCOPE, '')

        if (contextRole.includes('Student') || curRole.includes('Learner') || curRole.includes('Mentor')) {
          friendlyRoles.push(this.STUDENT)
        }
        else if (contextRole.includes('TeachingAssistant')) {
          friendlyRoles.push(this.TA)
        }
        else if (contextRole.includes('Instructor')) {
          friendlyRoles.push(this.INSTRUCTOR)
        }
      } // End-if
    } // End-for

    return friendlyRoles
  }
}
