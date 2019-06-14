<template>
  <div>
    <Header />
    <div id="tab-buttons">
      <p
        id="people-button"
        :style="{ color: people_tab ? '#0c2343' : 'grey' }"
        @click="changeToPeopleTab"
      >
        People
      </p>
      <p id="divider">|</p>
      <p
        id="group-button"
        :style="{ color: people_tab ? 'grey' : '#0c2343' }"
        @click="changeToGroupsTab"
      >
        Groups
      </p>
      <p
        v-if="
          !people_tab && (permissions === 'instructor' || permissions === 'ta')
        "
        id="edit-group-button"
        @click="go_to_edit_groups"
      >
        Edit Groups
      </p>
    </div>
    <div v-if="people_tab" id="people">
      <table>
        <thead id="people-header">
          <tr>
            <th id="name-header">Name</th>
            <th id="course-header">Course</th>
            <th id="role-header">Role</th>
          </tr>
        </thead>
        <tbody v-for="(user_list, role) in users" :key="role">
          <tr v-for="user in user_list" :key="user.key" class="user-row">
            <td>
              <p class="user-name">{{ user.name }}</p>
            </td>
            <td>
              <p class="course-title">{{ course_title }}</p>
            </td>
            <td>
              <p class="role">{{ role }}</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="!people_tab" id="groups">
      <table>
        <thead id="group-header-title">
          <tr>
            <th id="group-name-header">Name</th>
            <th id="active-header">Active</th>
            <th id="user-count-header">Users</th>
          </tr>
        </thead>
        <tbody
          v-for="(group_list, groupe_type) in course_groups"
          :key="groupe_type"
        >
          <tr
            v-for="group in group_list"
            :key="group.key"
            class="group-row"
            @click="go_to_group(group.id)"
          >
            <td>
              <p class="group-name">{{ group.name }}</p>
            </td>
            <td>
              <p class="active">
                {{ groupe_type === 'active_course_groups' ? 'Yes' : 'No' }}
              </p>
            </td>
            <td>
              <p v-if="group.member_count === 1" class="user-count">
                {{ group.member_count }} student
              </p>
              <p v-if="group.member_count !== 1" class="user-count">
                {{ group.member_count }} students
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <Footer />
  </div>
</template>

<script>
/* eslint-disable no-console */

import https from 'https'
import axios from 'axios'
import Header from '../components/Header'
import Footer from '../components/footer'

export default {
  name: 'People',
  components: { Footer, Header },
  asyncData(context) {
    return axios
      .get(`https://localhost:3000/courses/${context.params.course_id}/users`, {
        headers: {
          Authorization: context.app.$auth.user.sub
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      })
      .then(res => {
        console.log(res.data)
        console.log(res.data.groups)
        return {
          users: {
            Instructor: res.data.users.instructors,
            Ta: res.data.users.tas,
            Student: res.data.users.students
          },
          course_title: res.data.course_title,
          course_groups: res.data.groups,
          permissions: res.data.permissions,
          people_tab: true
        }
      })
      .catch(e => {
        console.log(e)
        return {
          users: {},
          course_title: '',
          course_groups: {},
          permissions: '',
          people_tab: false
        }
      })
  },
  methods: {
    go_to_edit_groups() {
      this.$router.push(
        `/courses/${this.$route.params.course_id}/course_groups/new`
      )
    },
    go_to_group(id) {
      this.$router.push(
        `/courses/${this.$route.params.course_id}/course_groups/${id}`
      )
    },
    changeToPeopleTab() {
      this.people_tab = true
    },
    changeToGroupsTab() {
      this.people_tab = false
    }
  }
}
</script>

<style scoped>
p {
  margin: 0;
}

td {
  padding-top: 1vh;
  padding-bottom: 1vh;
}

.user-row:hover {
  background-color: #f5f5f5;
}

.group-row:hover {
  background-color: #f5f5f5;
}

thead {
  border-bottom: 1px solid #0c2343;
}

#tab-buttons {
  display: flex;
  margin-left: 10vw;
  margin-top: 6vh;
}

#people-button,
#divider,
#group-button,
#edit-group-button {
  font-size: 2.5vh;
  margin-right: 1vw;
}

#people-button {
  cursor: pointer;
}

#divider {
  color: #0c2343;
}

#group-button {
  margin-right: 65vw;
  cursor: pointer;
}

#edit-group-button {
  color: white;
  background-color: #0c2343;
  padding-left: 0.5vw;
  padding-right: 0.5vw;
  border-radius: 0.5vw;
  cursor: pointer;
}

#people,
#groups {
  margin-left: 10vw;
  margin-top: 2vh;
}

#name-header,
#course-header,
#role-header,
#group-name-header,
#active-header,
#user-count-header {
  font-size: 2.5vh;
  color: #0c2343;
}

.user-row,
.group-row {
  cursor: pointer;
}

.user-name,
.course-title,
.role,
.group-name,
.active,
.user-count {
  font-size: 2vh;
  color: #0c2343;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

#name-header,
.user-name,
#group-name-header,
.group-name {
  margin-right: 5vw;
  width: 33vw;
}

#course-header,
.course-title,
#active-header,
.active {
  margin-right: 5vw;
  text-align: left;
  width: 23vw;
}

#role-header,
.role,
#user-count-header,
.user-count {
  width: 15vw;
}
</style>
