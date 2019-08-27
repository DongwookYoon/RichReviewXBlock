<template>
  <div id="all-groups">
    <sidebar :name="name" />
    <div id="content">
      <div id="all-groups-header">
        <p id="all-groups-text">All Groups</p>
        <hr />
      </div>
      <div id="groups">
        <table id="groups-table">
          <thead id="groups-header">
            <tr>
              <th id="name-header">Group</th>
              <th id="members-header">Members</th>
              <th id="course-header">Course</th>
            </tr>
          </thead>
          <tbody class="groups-body">
            <tr
              v-for="g in groups"
              :key="g.key"
              class="group-row"
              @click="go_to_course_group(g.course_id, g.course_group_id)"
            >
              <td class="group-name">{{ g.name }}</td>
              <td class="group-members">{{ g.members }}</td>
              <td class="group-course">{{ g.course }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script>
/* eslint-disable camelcase,no-console */

import https from 'https'
import axios from 'axios'
import Footer from '../components/footer'
import Sidebar from '../components/dashboard_sidebar'

export default {
  name: 'AllUserGroups',
  components: { Sidebar, Footer },
  async asyncData(context) {
    if (!context.store.state.authUser) {
      return
    }
    const res = await axios.get(
      `https://${
        process.env.backend
      }:3000/courses/0/course_groups/all_user_course_groups`,
      {
        headers: {
          Authorization: context.store.state.authUser.id
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )

    const groups = res.data.groups
    console.log(groups)
    return {
      groups,
      name: res.data.user_name
    }
  },
  fetch({ store, redirect }) {
    if (!store.state.authUser) {
      return redirect('/edu/login')
    }
  },
  methods: {
    go_to_course_group(course_id, course_group_id) {
      this.$router.push(
        `/edu/courses/${course_id}/course_groups/${course_group_id}`
      )
    }
  }
}
</script>

<style scoped>
@import '../node_modules/bootstrap/dist/css/bootstrap.css';

p {
  margin-right: 5vw;
}

td {
  padding-top: 1vh;
  padding-bottom: 1vh;
}

table {
  margin-bottom: 5vh;
}

hr {
  width: 60vw;
}

#all-groups {
  display: flex;
}

#content {
  display: block;
  margin-top: 10vh;
  margin-left: 7vw;
}

.group-row:hover {
  background-color: #f5f5f5;
}

#all-groups-header {
  font-size: 3vh;
  color: #0c2343;
}

#groups-table {
  font-size: 2vh;
  color: #0c2343;
  margin-top: 5vh;
}

#groups-header {
  font-size: 2.75vh;
  padding-right: 3vw;
}

.groups-body {
  font-size: 2.5vh;
}

#name-header {
  width: 20vw;
}

#members-header {
  width: 20vw;
  text-align: center;
  padding-right: 5vw;
}

#course-header {
  padding-right: 5vw;
}

.group-row {
  cursor: pointer;
}

.group-name {
  width: 20vw;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 5vw;
}

.group-members {
  text-align: center;
  padding-right: 5vw;
}
</style>
