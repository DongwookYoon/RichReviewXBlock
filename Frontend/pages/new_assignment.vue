<template>
  <div class="container">
    <h1 v-if="permissions !== 'instructor' && permissions !== 'ta'">401</h1>
    <div
      v-if="permissions === 'ta' || permissions === 'instructor'"
      class="assignment-grid"
    >
      <input v-model="assignment_data.title" placeholder="title" />
      <input v-model="assignment_data.description" placeholder="Description" />
      <div>
        <label>Assignment type</label>
        <select v-model="assignment_data.type">
          <option value="document_submission">Document Submission</option>
          <option value="comment_submission">Comment Submission</option>
        </select>
      </div>
      <div>
        <label>Points</label>
        <input v-model="assignment_data.points" placeholder="0" />
      </div>
      <div>
        <label>Display Grade as</label>
        <select v-model="assignment_data.display_grade_as">
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
          v-model="assignment_data.count_toward_final_grade"
          type="checkbox"
        />
        <label>Count this assignment towards the final grade</label>
      </div>
      <div>
        <input
          id="allow_multiple_submissions_checkbox"
          v-model="assignment_data.allow_multiple_submissions"
          type="checkbox"
        />
        <label>Allow multiple submissions</label>
      </div>
      <div>
        <input
          id="group_assignment_checkbox"
          v-model="assignment_data.group_assignment"
          type="checkbox"
        />
        <label>Group assignment</label>
      </div>
      <div>
        <input
          id="hidden_checkbox"
          v-model="assignment_data.hidden"
          type="checkbox"
        />
        <label>Hidden</label>
      </div>
      <div>
        <label>Due date</label>
        <datetime
          v-model="assignment_data.due_date"
          type="datetime"
          use12-hour
        ></datetime>
        <label @click="due_date = ''">X</label>
      </div>
      <div>
        <label>Available from</label>
        <datetime
          v-model="assignment_data.available_date"
          type="datetime"
          use12-hour
        ></datetime>
        <label @click="available_date = ''">X</label>
      </div>
      <div>
        <label>Until</label>
        <datetime
          v-model="assignment_data.until_date"
          type="datetime"
          use12-hour
        ></datetime>
        <label @click="until_date = ''">X</label>
      </div>
      <button @click="save()">Save</button>
      <button @click="$router.push(`/courses/${$route.params.course_id}/`)">
        Cancel
      </button>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-console,vue/no-unused-components */

import { Datetime } from 'vue-datetime'
import 'vue-datetime/dist/vue-datetime.css'
import axios from 'axios'

export default {
  name: 'NewAssignment',
  components: {
    datetime: Datetime
  },
  data: function() {
    return {
      assignment_data: {
        title: '',
        description: '',
        points: 0,
        display_grade_as: 'Points',
        count_toward_final_grade: true,
        allow_multiple_submissions: true,
        group_assignment: false,
        hidden: false,
        due_date: '',
        available_date: '',
        until_date: '',
        type: 'document_submission'
      }
    }
  },
  asyncData(context) {
    return axios
      .get(
        `http://localhost:3000/courses/${
          context.params.course_id
        }/users/permissions`,
        {
          headers: {
            Authorization: context.app.$auth.user.sub
          }
        }
      )
      .then(res => {
        console.log(res.data)
        return {
          permissions: res.data.permissions
        }
      })
      .catch(e => {
        console.log(e)
        return { permissions: undefined }
      })
  },
  methods: {
    save() {
      axios
        .post(
          `http://localhost:3000/courses/${
            this.$route.params.course_id
          }/assignments`,
          { assignment_data: this.assignment_data },
          {
            headers: {
              Authorization: this.$auth.user.sub
            }
          }
        )
        .then(() => {
          this.$router.push(`/courses/${this.$route.params.course_id}`)
        })
        .catch(e => {
          console.log(e)
        })
    }
  }
}
</script>

<style scoped></style>
