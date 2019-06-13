<template>
  <div class="container">
    <h1 v-if="permissions !== 'instructor' && permissions !== 'ta'">401</h1>
    <div
      v-if="permissions === 'ta' || permissions === 'instructor'"
      class="assignment-grid"
    >
      <input v-model="edits.title" placeholder="edits.title" />
      <input v-model="edits.description" placeholder="Description" />
      <div>
        <label>Points</label>
        <input v-model="edits.points" placeholder="0" />
      </div>
      <div>
        <label>Display Grade as</label>
        <select v-model="edits.display_grade_as">
          <option disabled value="">Please select one</option>
          <option>Points</option>
          <option>Percentage</option>
          <option>Complete/Incomplete</option>
          <option>Letter Grade</option>
          <option>Not Graded</option>
        </select>
      </div>
      <div>
        <input
          id="do_not_count_towards_final_checkbox"
          v-model="edits.count_toward_final_grade"
          type="checkbox"
        />
        <label>Count this assignment towards the final grade</label>
      </div>
      <div>
        <input
          id="allow_multiple_submissions_checkbox"
          v-model="edits.allow_multiple_submissions"
          type="checkbox"
        />
        <label>Allow multiple submissions</label>
      </div>
      <div>
        <input
          id="group_assignment_checkbox"
          v-model="edits.group_assignment"
          type="checkbox"
        />
        <label>Group assignment</label>
      </div>
      <div>
        <input id="hidden_checkbox" v-model="edits.hidden" type="checkbox" />
        <label>Hidden</label>
      </div>
      <div>
        <label>Due date</label>
        <datetime
          v-model="edits.due_date"
          type="datetime"
          use12-hour
        ></datetime>
        <label @click="edits.due_date = ''">X</label>
      </div>
      <div>
        <label>Available from</label>
        <datetime
          v-model="edits.available_date"
          type="datetime"
          use12-hour
        ></datetime>
        <label @click="edits.available_date = ''">X</label>
      </div>
      <div>
        <label>Until</label>
        <datetime
          v-model="edits.until_date"
          type="datetime"
          use12-hour
        ></datetime>
        <label @click="edits.until_date = ''">X</label>
      </div>
      <button @click="edit()">Save</button>
      <button @click="go_to_assignment">
        Cancel
      </button>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-console */
import https from 'https'
import { Datetime } from 'vue-datetime'
import 'vue-datetime/dist/vue-datetime.css'
import axios from 'axios'

export default {
  name: 'EditAssignment',
  components: {
    datetime: Datetime
  },
  asyncData(context) {
    console.log({ context })
    return axios
      .get(
        `https://localhost:3000/courses/${
          context.params.course_id
        }/assignments/${context.params.assignment_id}/edit`,
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
        return {
          edits: {
            title: res.data.title,
            description: res.data.description,
            points: res.data.points,
            display_grade_as: res.data.display_grade_as,
            count_toward_final_grade: res.data.count_toward_final_grade,
            allow_multiple_submissions: res.data.allow_multiple_submissions,
            group_assignment: res.data.group_assignment,
            hidden: res.data.hidden,
            due_date: context.app.is_date(res.data.due_date)
              ? new Date(res.data.due_date).toISOString()
              : '',
            available_date: context.app.is_date(res.data.available_date)
              ? new Date(res.data.available_date).toISOString()
              : '',
            until_date: context.app.is_date(res.data.until_date)
              ? new Date(res.data.until_date).toISOString()
              : ''
          },
          permissions: res.data.permissions
        }
      })
      .catch(e => {
        console.log(e)
        return { permissions: undefined }
      })
  },
  methods: {
    go_to_assignment() {
      this.$router.push(
        `/courses/${this.$route.params.course_id}/assignments/${
          this.$route.params.assignment_id
        }`
      )
    },
    edit() {
      axios
        .put(
          `https://localhost:3000/courses/${
            this.$route.params.course_id
          }/assignments/${this.$route.params.assignment_id}`,
          { edits: this.edits },
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
          this.$router.push(
            `/courses/${this.$route.params.course_id}/assignments/${
              this.$route.params.assignment_id
            }`
          )
        })
        .catch(e => {
          console.log(e)
        })
    }
  }
}
</script>

<style scoped>
.assignment-grid {
  display: grid;
}
</style>
