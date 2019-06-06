<template>
  <div>
    <Header />
    <h1 v-if="permissions !== 'instructor' && permissions !== 'ta'">401</h1>
    <div v-if="permissions === 'instructor' || permissions === 'ta'">
      <div v-if="!group_creation_mode" id="group-creation-mode">
        <p
          id="manually-create-groups-option"
          @click="group_creation_mode = 'manual'"
        >
          Manually Create Groups
        </p>
        <p id="or">or</p>
        <p
          id="automatically-create-groups-option"
          @click="group_creation_mode = 'automatic'"
        >
          Automatically Assign Groups
        </p>
      </div>
      <div
        v-if="
          group_creation_mode === 'manual' &&
            (permissions === 'instructor' || permissions === 'ta')
        "
      >
        <div
          v-if="permissions === 'instructor' || permissions === 'ta'"
          id="content"
        >
          <div id="group-info">
            <input id="group-name" placeholder="Group Name" />
            <p id="add-group-button">Add</p>
          </div>
          <div id="students-and-groups">
            <div id="student-list">
              <p id="student-header">Students</p>
              <hr />
              <div v-for="s in users.Student" :key="s.key">
                <p class="student">{{ s.name }}</p>
              </div>
            </div>
            <div id="groups">
              <p id="group-header">Groups</p>
              <hr />
              <p id="current-groups-header">Current Groups:</p>
              <div v-for="g in course_groups.active_course_groups" :key="g.key">
                <p class="group">{{ g.name }}</p>
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
/* eslint-disable no-console */

import https from 'https'
import axios from 'axios'
import Header from '../components/Header'
import Footer from '../components/footer'

export default {
  name: 'NewGroup',
  components: { Footer, Header },
  data: function() {
    return {
      group_data: {
        name: '',
        users: []
      },
      count: 1
    }
  },
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
          course_groups: res.data.groups,
          permissions: res.data.permissions,
          group_creation_mode: undefined
        }
      })
      .catch(e => {
        console.log(e)
        return {
          users: {},
          course_groups: {},
          permissions: '',
          group_creation_mode: undefined
        }
      })
  },
  methods: {
    addGroup() {
      console.log('')
    },
    save() {
      axios
        .post(
          `https://localhost:3000/courses/${
            this.$route.params.course_id
          }/course_groups`,
          { group_data: this.group_data },
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
          this.$router.push(`/courses/${this.$route.params.course_id}/users`)
        })
        .catch(e => {
          console.log(e)
        })
    }
  }
}
</script>

<style scoped>
p {
  margin: 0;
}

#group-creation-mode {
  display: flex;
  position: absolute;
  margin-top: 40vh;
  margin-left: 27vw;
}

#manually-create-groups-option,
#automatically-create-groups-option {
  font-size: 3vh;
  color: white;
  background-color: #0c2343;
  padding-left: 1vw;
  padding-right: 1vw;
  border-radius: 0.5vw;
}

#or {
  font-size: 2.5vh;
  margin-top: 0.25vh;
  margin-left: 1vw;
  margin-right: 1vw;
}

#group-info {
  margin-left: 38vw;
  margin-top: 4vh;
  display: flex;
}

#group-name {
  font-size: 2vh;
  width: 20vw;
  color: #0c2343;
  margin-right: 2vw;
}

#add-group-button {
  font-size: 2vh;
  color: white;
  background-color: #0c2343;
  padding-left: 1vw;
  padding-right: 1vw;
  padding-top: 0.33vh;
  border-radius: 0.5vw;
}

#content {
  display: block;
}

#students-and-groups {
  display: flex;
}

#student-list {
  margin-top: 1vh;
  margin-left: 5vw;
}

#groups {
  margin-top: 1vh;
}

#student-header,
.student,
#group-header {
  color: #0c2343;
}

#student-header,
#group-header {
  font-size: 3vh;
  width: 45vw;
}

#current-groups-header {
  font-size: 2.5vh;
  color: #0c2343;
}

.student {
  font-size: 2vh;
  padding-top: 0.5vh;
  padding-bottom: 0.5vh;
  width: 40.5vw;
}

.student:hover {
  background-color: #f5f5f5;
}

.group {
  font-size: 2.25vh;
  padding-top: 0.5vh;
  padding-bottom: 0.5vh;
  color: #0c2343;
  padding-left: 10vw;
}
</style>
