export default class Roles {
  public static readonly INSTRUCTOR : string = 'instructor'
  public static readonly TA : string = 'ta'
  public static readonly STUDENT : string = 'student'

  public static getUserRoles (ltiRoles : string[]) : string[] {
    const friendlyRoles : string[] = []

    for (const curRole of ltiRoles) {
      const curRoleLower = curRole.toLowerCase()
      if (curRoleLower.includes('student') || curRole.includes('learner')) {
        friendlyRoles.push(this.STUDENT)
      }
      else if (curRoleLower.includes('instructor')) {
        friendlyRoles.push(this.INSTRUCTOR)
      }
      else if (curRoleLower.includes('teachingassistant')) {
        friendlyRoles.push(this.TA)
      }
    }

    return friendlyRoles
  }
}
