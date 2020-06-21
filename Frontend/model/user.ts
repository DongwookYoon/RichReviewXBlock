
import Roles from '~/utils/roles'

export interface IUser {
  id: string;
  userName ?: string;
  roles ?: string[];
}

export default class User implements IUser {
  id: string = '';
  userName ?: string;
  roles ?: string[];

  constructor (id: string, userName: string, roles ?: string[]) {
    this.id = id
    this.userName = userName
    this.roles = roles
  }

  get isInstructor () : boolean {
    if (!this.roles) {
      return false
    }

    return this.roles?.includes(Roles.INSTRUCTOR)
  }

  get isTa () : boolean {
    if (!this.roles) {
      return false
    }

    return this.roles?.includes(Roles.TA)
  }

  get isStudent () : boolean {
    if (!this.roles) {
      return false
    }

    return this.roles?.includes(Roles.STUDENT)
  }
}
