<template>
  <div>
    <modal width="35%" height="20%" name="Automatic Group Assignment">
      <div class="modal-div">
        <p id="students-per-group-label">Students per group:</p>
        <input id="students-per-group-input" v-model="students_per_group" />
      </div>
      <div class="modal-footer">
        <p class="modal-continue-button" @click="automatically_create_groups">
          Continue
        </p>
        <p class="modal-cancel-button" @click="hide_automatic_group">Cancel</p>
      </div>
    </modal>
    <modal width="35%" height="20%" name="Rename Group Set">
      <div class="modal-div">
        <p id="new-name-label">New Group Set Name:</p>
        <input id="group-set-name-input" v-model="new_name" />
      </div>
      <div class="modal-footer">
        <p class="modal-continue-button" @click="rename_course_group">
          Save
        </p>
        <p class="modal-cancel-button" @click="hide_rename_group_set">Cancel</p>
      </div>
    </modal>
    <div id="course-groups">
      <course-sidebar :people="true" />
      <div id="content">
        <nav-bar :course="course" people="true" edit_groups="true" />
        <div id="edit-course-groups">
          <div id="group-sets">
            <div id="group-set-header">
              <p id="group-set-title">Group Sets</p>
              <p id="new-group-set-button" @click="new_course_group_set">
                New Group Set
              </p>
            </div>
            <hr id="group-set-hr" />
            <div
              v-for="group_set in course_group_sets"
              :key="group_set.key"
              class="group_set"
            >
              <p class="group-set-name">{{ group_set.name }}</p>
              <div class="group-set-controls">
                <p
                  class="group-set-rename-button"
                  @click="show_rename_group_set(group_set.id)"
                >
                  Rename
                </p>
                <p
                  class="group-set-delete-button"
                  @click="delete_course_group(group_set.id)"
                >
                  Delete
                </p>
              </div>
            </div>
          </div>
          <div id="student-list">
            <div id="student-header">
              <p id="student-header-title">Unassigned Students</p>
              <p id="automatic-groups-button" @click="show_automatic_group">
                Automatically Assign Groups
              </p>
            </div>
            <hr id="student-hr" />
            <draggable
              id="student-draggable"
              :list="unassigned_students"
              group="people"
              @change="changed"
            >
              <div
                v-for="s in unassigned_students"
                :key="s.key"
                class="student"
              >
                {{ s.name }}
              </div>
            </draggable>
          </div>
          <div id="groups">
            <div id="group-header">
              <p id="group-header-title">Groups</p>
              <p id="edit-group-button" @click="newGroup">+ Group</p>
              <p id="save-button" @click="save">Save</p>
            </div>
            <hr id="group-hr" />
            <!--<p-->
            <!--v-if="course_groups.active_course_groups.length > 0"-->
            <!--id="active-course-groups"-->
            <!--&gt;-->
            <!--Active Course Groups:-->
            <!--</p>-->
            <div
              v-for="g in course_groups.active_course_groups"
              :key="g.id"
              @click="change_expand(`group-${g.id}`)"
              @change="changed"
            >
              <course-group-card
                :id="g.id"
                :ref="'group-' + g.id"
                :passed_name="g.name"
                :members="g.members"
              ></course-group-card>
            </div>
          </div>
        </div>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script>
/* eslint-disable no-console,camelcase,vue/no-unused-components,no-unused-vars */

import https from 'https'
import sha1 from 'sha1'
import draggable from 'vuedraggable'
import axios from 'axios'
import Footer from '../components/footer'
import { EventBus } from '../plugins/event-bus'
import CourseGroupCard from '../components/course_group_card'
import CourseSidebar from '../components/course_sidebar'
import NavBar from '../components/nav_bar'
import ModalPlugin from '../node_modules/bootstrap-vue'

export default {
  name: 'NewGroup',
  components: {
    NavBar,
    CourseSidebar,
    Footer,
    draggable,
    CourseGroupCard,
    ModalPlugin
  },
  data() {
    return { new_name: '', group_set_id: null }
  },
  async asyncData(context) {
    if (!context.store.state.authUser) return

    const res = await axios.get(
      `https://${process.env.backend}:3000/courses/${
        context.params.course_id
      }/users/unassigned`,
      {
        headers: {
          Authorization: context.store.state.authUser.id
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )

    console.log(res.data)
    return {
      course_group_sets: res.data.course_group_sets,
      all_students: res.data.all_students,
      selected_course_group_set: null,
      unassigned_students: [],
      course_groups: [],
      permissions: res.data.permissions,
      group_ids: [],
      show_modal: false,
      students_per_group: '',
      groups_changed: false,
      changes_saved: false,
      course: res.data.course_title
    }
  },
  fetch({ store, redirect }) {
    if (!store.state.authUser) {
      return redirect('/education/login')
    }
  },
  created: function() {
    EventBus.$on('delete-group', async data => {
      const members = data.members
      const id = data.id
      for (const member of members) {
        this.unassigned_students.push(member)
      }
      await this.permanently_delete_group(id)

      // todo this is the disabled inactive course group functionality
      // const members = data.members
      // const inactive = data.inactive
      // const id = data.id
      //
      // if (inactive) {
      //   await this.permanently_delete_group(id)
      // } else {
      //   for (const member of members) {
      //     this.unassigned_students.push(member)
      //   }
      // }
    })
  },
  methods: {
    changed() {
      this.groups_changed = true
    },
    new_course_group_set() {
      this.course_group_sets.push({
        id: `temp_id${Date.now()}`,
        name: 'New Group Set',
        course_groups: [],
        unassigned_students: this.all_students
      })
    },
    rename_course_group() {
      for (const group_set of this.course_group_sets) {
        if (group_set.id === this.group_set_id) {
          group_set.name = this.new_name
        }
      }
      this.new_name = ''
      this.group_set_id = null
      this.hide_rename_group_set()
    },
    delete_course_group(id) {
      this.course_group_sets = this.course_group_sets.filter(group_set => {
        return group_set.id !== id
      })
    },
    newGroup() {
      // this.groups_changed = true
      // const id = `placeholder-${sha1(Math.random())}`
      // const g = { id: id, name: 'New Group', members: [] }
      // this.group_ids.push(id)
      // this.course_groups.active_course_groups.push(g)
      // return id
    },
    change_expand(id) {
      this.$refs[id][0].change_expand()
    },
    show_automatic_group() {
      this.$modal.show('Automatic Group Assignment')
    },
    hide_automatic_group() {
      this.$modal.hide('Automatic Group Assignment')
    },
    show_rename_group_set(id) {
      this.group_set_id = id
      this.$modal.show('Rename Group Set')
    },
    hide_rename_group_set() {
      this.$modal.hide('Rename Group Set')
    },
    automatically_create_groups() {
      // this.groups_changed = true
      // const students_per_group = parseInt(this.students_per_group)
      //
      // if (isNaN(students_per_group) || students_per_group === 0)
      //   console.warn('Invalid number of students per group')
      // else {
      //   let number_of_groups =
      //     this.unassigned_students.length / students_per_group
      //
      //   while (this.unassigned_students.length > 0) {
      //     const group_id = this.newGroup()
      //
      //     if (number_of_groups >= 2) {
      //       for (const group of this.course_groups.active_course_groups) {
      //         if (group.id === group_id) {
      //           for (let i = 0; i < students_per_group; i++) {
      //             group.members.push(this.unassigned_students.pop())
      //           }
      //         }
      //       }
      //     }
      //
      //     if (number_of_groups < 2) {
      //       for (const group of this.course_groups.active_course_groups) {
      //         if (group.id === group_id) {
      //           for (let i = 0; i < this.unassigned_students.length; i++) {
      //             group.members.push(this.unassigned_students.pop())
      //             i--
      //           }
      //         }
      //       }
      //     }
      //
      //     number_of_groups -= 1
      //   }
      // }
      // this.hide_automatic_group()
    },
    async permanently_delete_group(id) {
      this.groups_changed = true
      await axios.delete(
        `https://${process.env.backend}:3000/courses/${
          this.$route.params.course_id
        }/course_groups/${id}/permanently`,
        {
          headers: {
            Authorization: this.$store.state.authUser.id
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      )
    },
    async save() {
      this.changes_saved = true
      const all_group_data = []
      for (const group_id of this.group_ids) {
        const group_data = this.$refs[`group-${group_id}`][0].get_data()
        group_data.id = group_id
        if (!group_data.deleted) all_group_data.push(group_data)
      }
      console.log(all_group_data)
      await axios.post(
        `https://${process.env.backend}:3000/courses/${
          this.$route.params.course_id
        }/course_groups`,
        all_group_data,
        {
          headers: {
            Authorization: this.$store.state.authUser.id
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      )
      window.location.reload(true)
    }
  },
  beforeRouteLeave(to, from, next) {
    if (this.groups_changed && !this.changes_saved) {
      if (confirm('Leave Page? Changes you made may not be saved.')) {
        return next()
      } else {
        return next(false)
      }
    }
    return next()
  }
}
</script>

<style scoped>
@import '../node_modules/bootstrap/dist/css/bootstrap.css';

p {
  margin: 0;
}

#group-hr {
}

#student-hr {
  margin-right: 5vw;
}

#course-groups {
  display: flex;
}

#content {
  display: block;
  margin-top: 5vh;
  margin-left: 7vw;
}

.group_set {
  display: flex;
  position: relative;
}

#edit-course-groups {
  display: flex;
}

.modal-div,
.modal-footer {
  display: flex;
}

.modal-div {
  margin-top: 5vh;
  margin-left: 2vw;
}

.modal-footer {
  margin-top: 2vh;
  margin-left: -3vw;
}

.group-set-controls {
  color: white;
  cursor: pointer;
  position: absolute;
  right: 0;
  display: flex;
}

.group-set-rename-button {
  margin-right: 0.5vw;
  background-color: #0c2343;
  border-radius: 0.5vh;
}

.group-set-delete-button {
  background-color: #0c2343;
  border-radius: 0.5vh;
}

#students-per-group-label,
#new-name-label {
  margin-right: 1vw;
}

#students-per-group-input,
#group-set-name-input {
  text-align: right;
}

#students-per-group-label,
#new-name-label,
#students-per-group-input,
#group-set-name-input {
  color: #0c2343;
  font-size: 1.5vh;
}

#student-draggable {
  width: 100%;
  min-height: 20vh;
}

#group-sets,
#student-list,
#groups {
  margin-top: 1vh;
  width: 33.333%;
  margin-right: 2vw;
}

#group-set-header,
#student-header,
#group-header {
  display: flex;
}

#new-group-set-button,
#automatic-groups-button,
#edit-group-button,
#save-button,
.modal-continue-button,
.modal-cancel-button {
  font-size: 1.5vh;
  color: white;
  background-color: #0c2343;
  border-radius: 0.5vh;
  padding-left: 0.5vw;
  padding-right: 0.5vw;
  margin-top: 0.33vh;
  margin-bottom: 0.33vh;
  cursor: pointer;
}

.modal-continue-button {
  margin-right: 0.5vw;
  margin-left: 25vw;
}

.modal-cancel-button {
  background-color: #595959;
}

#edit-group-button {
  margin-right: 1vw;
}

#group-set-title,
#student-header-title,
.student,
#group-header-title {
  color: #0c2343;
}

#group-set-title,
#student-header-title,
#group-header-title {
  font-size: 2vh;
}

.student {
  font-size: 1.5vh;
  padding-top: 0.5vh;
  padding-bottom: 0.5vh;
  padding-left: 1vw;
  cursor: pointer;
}

.student:hover {
  background-color: #f5f5f5;
}

#active-course-groups,
#inactive-course-groups {
  font-size: 1.5vh;
  color: #0c2343;
  margin-bottom: 1vh;
}

#active-course-groups {
  margin-bottom: 1vh;
}

#inactive-course-groups {
  margin-top: 3vh;
  margin-bottom: 1vh;
}
</style>
