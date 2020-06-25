<template>
  <div id="new-assignment">
    <loading :active.sync="loading"
             :is-full-page="true"
             color="#0c2343"></loading>
    <dashboard-sidebar :name="name" :enrolments="enrolments" :taing="taing" :instructing="instructing" />
    <course-sidebar :name="name" />
    <div id="content">
      <nav-bar :course="course" new_assignment="true" />
      <div id="assignment-grid">
        <div id="title-div">
          <input
            id="title"
            v-model="assignment_data.title"
            placeholder="Assignment Name"
          />
        </div>
        <div id="description-div">
          <textarea
            id="description"
            v-model="assignment_data.description"
            placeholder="Description"
          ></textarea>
        </div>
        <div id="points-div">
          <label id="points-label">Points</label>
          <input id="points" v-model="assignment_data.points" placeholder="0" />
        </div>
        <div id="weight-div">
          <label id="weight-label">Weight</label>
          <input id="weight" v-model="assignment_data.weight" placeholder="0" />
          <label id="weight-label2">% of final grade</label>
        </div>
        <div id="type-div">
          <label id="type-label">Assignment type</label>
          <select id="type" v-model="assignment_data.type">
            <option value="document_submission">Document Submission</option>
            <option value="comment_submission">Comment Submission</option>
          </select>
        </div>
        <div id="count-towards-final-div">
          <input
            id="count-towards-final"
            v-model="assignment_data.count_toward_final_grade"
            type="checkbox"
          />
          <label id="count-towards-final-label"
            >Count this assignment towards the final grade</label
          >
        </div>
        <div id="multiple-submissions-div">
          <input
            id="multiple-submissions"
            v-model="assignment_data.allow_multiple_submissions"
            type="checkbox"
          />
          <label id="multiple-submissions-label"
            >Allow multiple submissions</label
          >
        </div>
        <div id="late-submissions-div">
          <input
            id="late-submissions"
            v-model="assignment_data.allow_late_submissions"
            type="checkbox"
          />
          <label id="late-submissions-label">Allow late submissions</label>
        </div>
        <div id="group-assignment-div">
          <input
            id="group-assignment"
            v-model="assignment_data.group_assignment"
            type="checkbox"
          />
          <label id="group-assignment-label">Group assignment</label>
        </div>
        <div v-if="assignment_data.group_assignment" id="course-group-set-div">
          <select
            id="course-group-set-select"
            v-model="assignment_data.course_group_set"
          >
            <option
              v-for="option in course_group_sets"
              :key="option.key"
              :value="option.key"
            >
              {{ option.name }}
            </option>
          </select>
        </div>
        <div id="hidden-div">
          <input id="hidden" v-model="assignment_data.hidden" type="checkbox" />
          <label id="hidden-label">Hidden</label>
        </div>
        <div id="due-date-div">
          <label id="due-date-label">Due date</label>
          <datetime
            id="due-date"
            v-model="assignment_data.due_date"
            type="datetime"
            use12-hour
            title="Due Date"
          ></datetime>
          <p
            v-if="assignment_data.due_date !== ''"
            id="clear-due-date"
            @click="clear_due_date"
          >
            X
          </p>
        </div>
        <div id="dates">
          <div id="available-date-div">
            <label id="available-date-label">Available from</label>
            <datetime
              id="available-date"
              v-model="assignment_data.available_date"
              type="datetime"
              use12-hour
            ></datetime>
            <p
              v-if="assignment_data.available_date !== ''"
              id="clear-available-date"
              @click="clear_available_date"
            >
              X
            </p>
          </div>
          <div id="until-date-div">
            <label id="until-date-label">Until</label>
            <datetime
              id="until-date"
              v-model="assignment_data.until_date"
              type="datetime"
              use12-hour
            ></datetime>
            <p
              v-if="assignment_data.until_date !== ''"
              id="clear-until-date"
              @click="clear_until_date"
            >
              X
            </p>
          </div>
        </div>
        <hr id="button-hr" />
        <div id="button-div">
          <p id="cancel-button" @click="go_to_course">
            Cancel
          </p>
          <p id="save-button" @click="save()">Save</p>
        </div>
      </div>
    </div>
    <div v-if="assignment_data.type === 'comment_submission'" id="files-div">
      <div class="large-12 medium-12 small-12 cell">
        <label id="files-label">Files </label>
        <hr id="files-hr" />
        <input
          id="files"
          ref="files"
          type="file"
          multiple
          @change="handleFileUpload()"
        />
      </div>
      <div class="large-12 medium-12 small-12 cell">
        <div v-for="(file, key) in files" :key="key" class="file-listing">
          <p class="file">{{ file.name }}</p>
          <p class="remove-file" @click="removeFile(key)">Remove</p>
        </div>
      </div>
      <br />
      <div class="large-12 medium-12 small-12 cell">
        <p id="add-files-button" @click="addFiles()">Add Files</p>
      </div>
      <br />
    </div>
    <Footer />
  </div>
</template>

<script>
/* eslint-disable no-console,vue/no-unused-components,camelcase */
import https from 'https'
import { Datetime } from 'vue-datetime'
import 'vue-datetime/dist/vue-datetime.css'
import axios from 'axios'
import Footer from '../components/footer'
import CourseSidebar from '../components/course_sidebar'
import NavBar from '../components/nav_bar'
import Loading from 'vue-loading-overlay';
import 'vue-loading-overlay/dist/vue-loading.css';
import DashboardSidebar from '../components/dashboard_sidebar'

export default {
  name: 'NewAssignment',
  components: {
    NavBar,
    CourseSidebar,
    Footer,
    datetime: Datetime,
    Loading,
    'dashboard-sidebar': DashboardSidebar
  },
  data: function() {
    return {
      assignment_data: {
        title: '',
        description: '',
        points: 0,
        weight: 0,
        display_grade_as: 'Points',
        count_toward_final_grade: true,
        allow_multiple_submissions: true,
        allow_late_submissions: false,
        group_assignment: false,
        hidden: false,
        due_date: '',
        available_date: '',
        until_date: '',
        type: 'document_submission',
        course_group_set: 'default'
      },
      files: [],
      changesSaved: false,
      loading: false
    }
  },
  async asyncData(context) {
    if (!context.store.state.authUser) return

    const permission_res = await axios.get(
      `https://${process.env.backend}:3000/courses/${
        context.params.course_id
      }/users/permissions`,
      {
        headers: {
          Authorization: context.store.state.authUser.id
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )

    const course_res = await axios.get(
      `https://${process.env.backend}:3000/courses/${context.params.course_id}`,
      {
        headers: {
          Authorization: context.store.state.authUser.id
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )
    const enrolment_res = await axios
      .get(`https://${process.env.backend}:3000/courses`, {
        headers: {
          Authorization: context.store.state.authUser.id
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      })

    const default_value = {
      key: 'default',
      name: 'Please select a group set'
    }
    const course_group_sets = [default_value].concat(
      course_res.data.course.course_group_sets
    )

    return {
      permissions: permission_res.data.permissions,
      course: course_res.data.course.title,
      course_group_sets: course_group_sets,
      name: course_res.data.user_name || '',
      enrolments: enrolment_res.data.enrolments,
      taing: enrolment_res.data.taing,
      instructing: enrolment_res.data.teaching
    }
  },
  fetch({ store, redirect }) {
    if (!store.state.authUser) {
      return redirect('/edu/login')
    }
  },
  methods: {
    go_to_course() {
      this.$router.push(`/edu/courses/${this.$route.params.course_id}/`)
    },
    clear_due_date() {
      this.assignment_data.due_date = ''
    },
    clear_available_date() {
      this.assignment_data.available_date = ''
    },
    clear_until_date() {
      this.assignment_data.until_date = ''
    },
    async save() {
      if (
        this.assignment_data.group_assignment &&
        this.assignment_data.course_group_set === 'default'
      ) {
        alert('A group assignment requires a group set')
        return
      }
      this.changesSaved = true
      try {
        if (this.assignment_data.type === 'comment_submission') {
          if (this.files.length === 0) {
            alert('One or more files is required for a comment submission assignment')
            return
          }
          this.loading = true
          const formData = new FormData()
          for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i]
            if (file.type !== 'application/pdf') {
              alert('Files must be in pdf format')
              return
            }
            formData.append(`file-${i}`, file)
          }

          formData.append('assignment_data', JSON.stringify(this.assignment_data))

          await axios.post(
            `https://${process.env.backend}:3000/courses/${
              this.$route.params.course_id
              }/assignments/comment_submission_assignment`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: this.$store.state.authUser.id
              },
              httpsAgent: new https.Agent({
                rejectUnauthorized: false
              })
            }
          )
          this.$router.push(`/edu/courses/${this.$route.params.course_id}`)
        } else {
          this.loading = true
          await axios.post(
            `https://${process.env.backend}:3000/courses/${
              this.$route.params.course_id
              }/assignments/document_submission_assignment`,
            { assignment_data: this.assignment_data },
            {
              headers: {
                Authorization: this.$store.state.authUser.id
              },
              httpsAgent: new https.Agent({
                rejectUnauthorized: false
              })
            }
          )
          this.$router.push(`/edu/courses/${this.$route.params.course_id}`)
        }
      } catch (e) {
        this.loading = false
        window.alert(e.response.data.message)
      }
    },
    addFiles() {
      this.$refs.files.click()
    },
    removeFile(key) {
      this.files.splice(key, 1)
    },
    handleFileUpload() {
      const uploadedFiles = this.$refs.files.files

      for (let i = 0; i < uploadedFiles.length; i++) {
        this.files.push(uploadedFiles[i])
      }
    }
  },
  beforeRouteLeave(to, from, next) {
    if (!this.changesSaved) {
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

#file-alert {
  width: 50%;
}

input[type='file'] {
  position: absolute;
  top: -500px;
}

hr {
  margin: 0 0 1vh;
  color: lightgrey;
  border-color: lightgrey;
  background-color: lightgrey;
}

#new-assignment {
  display: flex;
  min-height: 100vh;
}

#content {
  display: block;
  margin-left: 7vw;
  margin-top: 5vh;
  width: 50vw;
}

#files-div {
  margin-top: 7vh;
}

.file-listing {
  display: flex;
}

#files-hr {
  width: 15vw;
}

.file {
  width: 10vw;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0 1vw 0 0;
}

.remove-file {
  color: red;
  cursor: pointer;
}

#add-files-button {
  color: white;
  background-color: #0c2343;
  border-radius: 0.5vh;
  width: 5.5vw;
  text-align: center;
  cursor: pointer;
}

#assignment-grid {
  display: block;
  font-size: 0.85rem;
  color: #0c2343;
}

#title {
  min-height: 1.3rem;
  margin-bottom: 1vh;
  height: 3.75vh;
}

#title,
#description {
  width: 40vw;
  font-size: 0.9rem;
}

#hidden-div {
  display: none;
}

#description {
  min-height: 4rem;
  height: 20vh;
  border: 1px solid lightgrey;
}

#points-div, #weight-div {
  margin-bottom: 1vh;
  margin-top: 1vh;
}

#points-div {
  margin-left: 9.6rem;
}

#weight-div {
  margin-left: 9.2rem;
}

#type-div {
  margin-left: 5.5rem;
  margin-bottom: 1vh;
}

#type {
  cursor: pointer;
}

#count-towards-final,
#multiple-submissions,
#late-submissions,
#group-assignment,
#course-group-set-select,
#hidden {
  margin-left: 13.4vw;
}

#due-date-div,
#available-date-div,
#until-date-div {
  display: flex;
}

#due-date-div {
  margin-left: 8.7vw;
  margin-top: 1vh;
}

#dates {
  display: flex;
}

#available-date-div {
  /*margin-left: 6.2vw;*/
  margin-left: 2vw;
}

#until-date-div {
  /*margin-left: 10.7vw;*/
  margin-left: 2vw;
}

#due-date-div,
#available-date-div,
#until-date-div {
  margin-bottom: 1vh;
}

#due-date-label,
#available-date-label,
#until-date-label {
  margin-right: 0.5vw;
}

#clear-due-date,
#clear-available-date,
#clear-until-date {
  margin-left: 0.5vw;
  color: red;
  cursor: pointer;
}

#button-hr {
  margin-top: 2vh;
  margin-bottom: 2vh;
  width: 40vw;
}

#button-div {
  display: flex;
  margin-left: 30vw;
  margin-bottom: 50px;
}

#save-button,
#cancel-button {
  border-radius: 0.5vh;
  padding-left: 1vw;
  padding-right: 1vw;
  cursor: pointer;
}

#save-button {
  color: white;
  background-color: #0c2343;
}

#cancel-button {
  color: black;
  background-color: lightgrey;
}

#cancel-button {
  margin-right: 0.5vw;
}
</style>
