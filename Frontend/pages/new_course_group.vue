<template>
  <div>
    <Header />
    <h1 v-if="permissions !== 'instructor' && permissions !== 'ta'">401</h1>
    <modal width="35%" height="20%" name="Automatic Group Assignment">
      <div id="modal-div">
        <p id="students-per-group-label">Students per group:</p>
        <input id="students-per-group-input" v-model="students_per_group" />
      </div>
      <div id="modal-footer">
        <p id="modal-continue-button" @click="automatically_create_groups">
          Continue
        </p>
        <p id="modal-cancel-button" @click="hide">Cancel</p>
      </div>
    </modal>
    <div
      v-if="permissions === 'instructor' || permissions === 'ta'"
      id="context"
    >
      <div id="student-list">
        <div id="student-header">
          <p id="student-header-title">Unassigned Students</p>
          <p id="automatic-groups-button" @click="show">
            Automatically Assign Groups
          </p>
        </div>
        <hr id="student-hr" />
        <draggable
          id="student-draggable"
          :list="unassigned_students"
          group="people"
        >
          <div v-for="s in unassigned_students" :key="s.key" class="student">
            {{ s.name }}
          </div>
        </draggable>
      </div>
      <div id="groups">
        <div id="group-header">
          <p id="group-header-title">Groups</p>
          <p id="new-group-button" @click="newGroup">+ Group</p>
          <p id="save-button" @click="save">Save</p>
        </div>
        <hr id="group-hr" />
        <div
          v-for="g in course_groups.active_course_groups"
          :key="g.id"
          @click="change_expand(`group-${g.id}`)"
        >
          <course-group-card
            :ref="'group-' + g.id"
            :passed_name="g.name"
            :members="g.members"
          ></course-group-card>
        </div>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script>
/* eslint-disable no-console,camelcase */

import https from 'https'
import sha1 from 'sha1'
import draggable from 'vuedraggable'
import axios from 'axios'
import Header from '../components/Header'
import Footer from '../components/footer'
import { EventBus } from '../plugins/event-bus'
import CourseGroupCard from '../components/course_group_card'

export default {
  name: 'NewGroup',
  components: { Footer, Header, draggable, CourseGroupCard },
  asyncData(context) {
    return axios
      .get(
        `https://localhost:3000/courses/${
          context.params.course_id
        }/users/unassigned`,
        {
          headers: {
            Authorization: context.app.$auth.user.sub
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      )
      .then(res => {
        console.log(res.data)
        console.log(res.data.groups)
        const group_ids = []
        for (const group of res.data.groups.active_course_groups) {
          group_ids.push(group.id)
        }
        return {
          unassigned_students: res.data.unassigned_students,
          course_groups: res.data.groups,
          permissions: res.data.permissions,
          group_ids: group_ids,
          show_modal: false,
          students_per_group: ''
        }
      })
      .catch(e => {
        console.log(e)
        return {
          unassigned_students: [],
          course_groups: {},
          permissions: '',
          group_ids: [],
          show_modal: false,
          students_per_group: ''
        }
      })
  },
  created: function() {
    EventBus.$on('delete-group', members => {
      console.log(members)
      console.log('Called')
      for (const member of members) {
        this.unassigned_students.push(member)
      }
    })
  },
  methods: {
    newGroup() {
      const id = `placeholder-${sha1(Math.random())}`
      const g = { id: id, name: 'New Group', members: [] }
      this.group_ids.push(id)
      this.course_groups.active_course_groups.push(g)
      return id
    },
    change_expand(id) {
      this.$refs[id][0].change_expand()
    },
    show() {
      this.$modal.show('Automatic Group Assignment')
    },
    hide() {
      this.$modal.hide('Automatic Group Assignment')
    },
    automatically_create_groups() {
      const students_per_group = parseInt(this.students_per_group)

      if (isNaN(students_per_group) || students_per_group === 0)
        console.warn('Invalid number of students per group')
      else {
        let number_of_groups =
          this.unassigned_students.length / students_per_group

        while (this.unassigned_students.length > 0) {
          const group_id = this.newGroup()

          if (number_of_groups >= 2) {
            for (const group of this.course_groups.active_course_groups) {
              if (group.id === group_id) {
                for (let i = 0; i < students_per_group; i++) {
                  group.members.push(this.unassigned_students.pop())
                }
              }
            }
          }

          if (number_of_groups < 2) {
            for (const group of this.course_groups.active_course_groups) {
              if (group.id === group_id) {
                for (let i = 0; i < this.unassigned_students.length; i++) {
                  group.members.push(this.unassigned_students.pop())
                  i--
                }
              }
            }
          }

          number_of_groups -= 1
        }
      }
      this.hide()
    },
    save() {
      const all_group_data = []
      for (const group_id of this.group_ids) {
        const group_data = this.$refs[`group-${group_id}`][0].get_data()
        group_data.id = group_id
        all_group_data.push(group_data)
      }
      console.log(all_group_data)
      axios
        .post(
          `https://localhost:3000/courses/${
            this.$route.params.course_id
          }/course_groups`,
          all_group_data,
          {
            headers: {
              Authorization: this.$auth.user.sub
            },
            httpsAgent: new https.Agent({
              rejectUnauthorized: false
            })
          }
        )
        .then(() => {
          window.location.reload(true)
        })
        .catch(e => {
          console.warn(e)
        })
    }
  }
}
</script>

<style scoped>
p {
  margin: 0;
}

#group-hr {
  width: 45vw;
}

#student-hr {
  width: 40vw;
  margin-right: 5vw;
}

#context {
  margin-top: 5vh;
  display: flex;
}

#modal-div,
#modal-footer {
  display: flex;
}

#modal-div {
  margin-top: 5vh;
  margin-left: 2vw;
}

#modal-footer {
  margin-top: 2vh;
  margin-left: -3vw;
}

#students-per-group-label {
  margin-right: 1vw;
}

#students-per-group-input {
  text-align: right;
}

#students-per-group-label,
#students-per-group-input {
  color: #0c2343;
  font-size: 3vh;
}

#student-draggable {
  width: 100%;
  min-height: 20vh;
}

#student-list {
  margin-top: 1vh;
  margin-left: 5vw;
}

#groups {
  margin-top: 1vh;
}

#student-header,
#group-header {
  display: flex;
}

#automatic-groups-button,
#new-group-button,
#save-button,
#modal-continue-button,
#modal-cancel-button {
  font-size: 2.5vh;
  color: white;
  background-color: #0c2343;
  border-radius: 0.5vh;
  padding-left: 0.5vw;
  padding-right: 0.5vw;
  margin-top: 0.33vh;
  margin-bottom: 0.33vh;
}

#modal-continue-button {
  margin-right: 0.5vw;
  margin-left: 25vw;
}

#modal-cancel-button {
  background-color: #595959;
}

#new-group-button {
  margin-right: 1vw;
}

#student-header-title,
.student,
#group-header-title {
  color: #0c2343;
}

#student-header-title {
  font-size: 3vh;
  width: 21.5vw;
}

#group-header-title {
  font-size: 3vh;
  width: 30vw;
}

.student {
  font-size: 2vh;
  padding-top: 0.5vh;
  padding-bottom: 0.5vh;
  padding-left: 1vw;
  width: 40.5vw;
}

.student:hover {
  background-color: #f5f5f5;
}
</style>
