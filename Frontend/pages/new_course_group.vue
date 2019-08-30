<template>
  <div>
    <automatic-group-modal v-if="show_automatic_group_modal" @close="show_automatic_group_modal = false">
    </automatic-group-modal>
    <rename-group-set-modal v-if="show_rename_group_set_modal" @close="show_rename_group_set_modal = false">
    </rename-group-set-modal>
    <div id="course-groups">
      <dashboard-sidebar :name="name" :enrolments="enrolments" :taing="taing" :instructing="instructing" />
      <course-sidebar :name="name" :people="true" />
      <div id="content">
        <nav-bar :course="course" people="true" edit_groups="true" />
        <p id="save-button" @click="save">Save</p>
        <div id="edit-course-groups">
          <div id="group-sets">
            <div id="group-set-header">
              <p id="group-set-title">Group Sets</p>
              <p id="new-group-set-button" @click="new_course_group_set">
                New Group Set
              </p>
            </div>
            <hr id="group-set-hr" />
            <div v-if="course_group_sets.length > 0">
              <div
                v-for="(group_set, index) in course_group_sets"
                :key="index"
                class="group_set"
              >
                <p
                  class="group-set-name"
                  @click="select_course_group_set(index)"
                >
                  {{ group_set.name }}
                </p>
                <div class="group-set-controls">
                  <p
                    class="group-set-rename-button"
                    @click="show_rename_group_set(index)"
                  >
                    Rename
                  </p>
                  <p
                    class="group-set-delete-button"
                    @click="delete_course_group_set(index)"
                  >
                    Delete
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div id="student-list">
            <div id="student-header">
              <p id="student-header-title">Unassigned Students</p>
              <p
                v-if="selected_course_group_set !== null"
                id="automatic-groups-button"
                @click="show_automatic_group"
              >
                Automatically Assign Groups
              </p>
            </div>
            <hr id="student-hr" />
            <div
              v-if="
                course_group_sets.length > 0 &&
                  selected_course_group_set !== null
              "
            >
              <draggable
                id="student-draggable"
                :list="
                  course_group_sets[selected_course_group_set]
                    .unassigned_students
                "
                group="people"
                @change="changed"
              >
                <div
                  v-for="s in course_group_sets[selected_course_group_set]
                    .unassigned_students"
                  :key="s.key"
                  class="student"
                >
                  {{ s.name }}
                </div>
              </draggable>
            </div>
          </div>
          <div id="groups">
            <div id="group-header">
              <p id="group-header-title">Groups</p>
              <p
                v-if="selected_course_group_set !== null"
                id="edit-group-button"
                @click="newGroup"
              >
                + Group
              </p>
            </div>
            <hr id="group-hr" />
            <!--<p-->
            <!--v-if="course_groups.active_course_groups.length > 0"-->
            <!--id="active-course-groups"-->
            <!--&gt;-->
            <!--Active Course Groups:-->
            <!--</p>-->
            <div
              v-if="
                course_group_sets.length > 0 &&
                  selected_course_group_set !== null
              "
            >
              <div
                v-for="g in course_group_sets[selected_course_group_set]
                  .course_groups"
                :key="g.id"
                @click="change_expand(`group-${g.id}`)"
                @change="changed"
              >
                <course-group-card
                  :id="g.id"
                  :ref="'group-' + g.id"
                  :passed_name="g.name"
                  :members="g.users"
                ></course-group-card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script>
/* eslint-disable no-console,camelcase,vue/no-unused-components,no-unused-vars,standard/computed-property-even-spacing,require-await */

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
import AutomaticGroupModal from '../components/automatic-group-modal'
import RenameGroupSetModal from '../components/rename-group-set-modal'
import DashboardSidebar from '../components/dashboard_sidebar'

export default {
  name: 'NewGroup',
  components: {
    NavBar,
    CourseSidebar,
    Footer,
    draggable,
    CourseGroupCard,
    AutomaticGroupModal,
    RenameGroupSetModal,
    'dashboard-sidebar': DashboardSidebar
    // ModalPlugin
  },
  data() {
    return {
      new_group_set_name: '',
      group_set_index: null,
      show_automatic_group_modal: false,
      show_rename_group_set_modal: false
    }
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
    const course_res = await axios
      .get(`https://${process.env.backend}:3000/courses`, {
        headers: {
          Authorization: context.store.state.authUser.id
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      })
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
      course: res.data.course_title,
      name: res.data.user_name,
      enrolments: course_res.data.enrolments,
      taing: course_res.data.taing,
      instructing: course_res.data.teaching
    }
  },
  fetch({ store, redirect }) {
    if (!store.state.authUser) {
      return redirect('/edu/login')
    }
  },
  created: function() {
    EventBus.$on('delete-group', data => {
      this.groups_changed = true
      const members = data.members
      const id = data.id
      for (const member of members) {
        this.course_group_sets[
          this.selected_course_group_set
        ].unassigned_students.push(member)
      }
      this.course_group_sets[
        this.selected_course_group_set
      ].course_groups = this.course_group_sets[
        this.selected_course_group_set
      ].course_groups.filter(course_group => {
        return course_group.id !== id
      })
      // await this.permanently_delete_group(id)

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
    EventBus.$on('rename-group', data => {
      this.groups_changed = true
      const name = data.name
      const id = data.id
      for (const course_group of this.course_group_sets[
        this.selected_course_group_set
      ].course_groups) {
        if (course_group.id === id) {
          course_group.name = name
        }
      }
    })

    EventBus.$on('save-automatically-create-groups', data => {
      this.students_per_group = data.students_per_group
      this.automatically_create_groups()
    })

    EventBus.$on('close-automatically-create-groups', data => {
      this.hide_automatic_group()
    })

    EventBus.$on('save-rename-group-set', data => {
      this.course_group_sets[this.group_set_index].name = data.new_group_set_name
      this.hide_rename_group_set()
    })

    EventBus.$on('close-automatically-create-groups', data => {
      this.hide_rename_group_set()
    })
  },
  methods: {
    changed() {
      this.groups_changed = true
    },
    new_course_group_set() {
      this.groups_changed = true
      this.selected_course_group_set = null
      this.course_group_sets.push({
        id: `placeholder_${Date.now()}`,
        name: 'New Group Set',
        course_groups: [],
        unassigned_students: this.all_students.slice()
      })
    },
    rename_course_group_set() {
      this.groups_changed = true
      this.course_group_sets[
        this.group_set_index
      ].name = this.new_group_set_name
      this.new_group_set_name = ''
      this.group_set_index = null
      this.hide_rename_group_set()
    },
    select_course_group_set(index) {
      this.selected_course_group_set = index
    },
    delete_course_group_set(index) {
      this.groups_changed = true
      this.selected_course_group_set = null
      this.course_group_sets.splice(index, 1)
    },
    newGroup() {
      this.groups_changed = true
      const id = `placeholder-${Date.now()}${Math.random()}`
      const g = { id: id, name: 'New Group', users: [] }
      this.course_group_sets[this.selected_course_group_set].course_groups.push(
        g
      )
      return id
    },
    change_expand(id) {
      try {
        this.$refs[id][0].change_expand()
      } catch (e) {}
    },
    show_automatic_group() {
      this.show_automatic_group_modal = true
    },
    hide_automatic_group() {
      this.show_automatic_group_modal = false
    },
    show_rename_group_set(index) {
      this.group_set_index = index
      this.show_rename_group_set_modal = true
    },
    hide_rename_group_set() {
      this.show_rename_group_set_modal = false
    },
    automatically_create_groups() {
      this.groups_changed = true
      const students_per_group = parseInt(this.students_per_group)

      if (isNaN(students_per_group) || students_per_group === 0)
        console.warn('Invalid number of students per group')
      else {
        while (
          this.course_group_sets[this.selected_course_group_set]
            .unassigned_students.length > 0
        ) {
          const id = `placeholder-${Date.now()}${Math.random()}`
          const group = { id: id, name: 'New Group', users: [] }

          if (
            this.course_group_sets[this.selected_course_group_set]
              .unassigned_students.length <
            2 * students_per_group
          ) {
            group.users = this.course_group_sets[
              this.selected_course_group_set
            ].unassigned_students.slice()

            this.course_group_sets[
              this.selected_course_group_set
            ].unassigned_students = []
          } else {
            for (let i = 0; i < students_per_group; i++) {
              group.users.push(
                this.course_group_sets[
                  this.selected_course_group_set
                ].unassigned_students.splice(
                  Math.floor(
                    Math.random() *
                      this.course_group_sets[this.selected_course_group_set]
                        .unassigned_students.length
                  ),
                  1
                )[0]
              )
            }
          }

          this.course_group_sets[
            this.selected_course_group_set
          ].course_groups.push(group)
        }
      }
      this.hide_automatic_group()
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
      console.log(this.course_group_sets)
      await axios.post(
        `https://${process.env.backend}:3000/courses/${
          this.$route.params.course_id
        }/course_groups`,
        this.course_group_sets,
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
}

#course-groups {
  display: flex;
  min-height: 100vh;
}

#content {
  display: block;
  margin-top: 5vh;
  margin-left: 7vw;
  width: 100%;
}

.group_set {
  display: flex;
  position: relative;
  margin-bottom: 0.5vh;
}

#edit-course-groups {
  display: flex;
  width: 100%;
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

#student-draggable {
  width: 100%;
  min-height: 20vh;
}

#group-sets,
#student-list,
#groups {
  margin-top: 1vh;
  min-width: 30%;
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
#save-button {
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

#save-button {
  width: 3.25vw;
  font-size: 2vh;
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
  font-size: 1.75vh;
  padding-top: 0.5vh;
  padding-bottom: 0.5vh;
  padding-left: 1vw;
  cursor: pointer;
}

.student:hover {
  background-color: #f5f5f5;
}
</style>
