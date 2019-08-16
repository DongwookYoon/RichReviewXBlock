<template>
  <div id="assignment">
    <course-sidebar />
    <b-alert v-model="showDismissibleAlert" variant="danger" dismissible>
      One or more files is required for a submission.
    </b-alert>
    <modal width="60%" height="50%" name="Assignment Extensions">
      <div id="modal-div">
        <div id="student-list-div">
          <p
            v-for="s in student_or_group_list"
            :key="s.key"
            class="student-or-group"
            :style="
              selected_user_key === s.key ? selected_style : default_style
            "
            @click="select_student(s.key, s.name)"
          >
            {{ s.name }}
          </p>
        </div>
        <div id="date-div">
          <p>Extension Date</p>
          <datetime
            v-model="extension_date"
            class="extension-date"
            type="datetime"
            use12-hour
            title="Due Date"
          ></datetime>
          <button @click="add_extension">Add</button>
        </div>
        <div id="extension-div">
          <div v-for="e in extensions" :key="e.key" class="extension">
            <p class="extension-name">{{ e.name }}</p>
            <datetime
              v-model="e.date"
              class="extension-date"
              type="datetime"
              use12-hour
              title="Due Date"
            ></datetime>
          </div>
        </div>
      </div>
      <div id="modal-footer">
        <p id="modal-continue-button" @click="save_extensions">
          Save
        </p>
        <p id="modal-cancel-button" @click="hide">Cancel</p>
      </div>
    </modal>
    <div id="content">
      <nav-bar :course="course" :assignment="assignment.title.toString()" />
      <div id="assignment-header">
        <p id="assignment-title">{{ assignment.title }}</p>
        <div
          v-if="permissions === 'instructor' || permissions === 'ta'"
          class="assignment-controls"
        >
          <button @click="show">Extensions</button>
          <button id="edit-button" @click="go_to_edit_assignment">Edit</button>
          <button id="submissions-button" @click="got_to_submissions">
            Submissions
          </button>
          <button
            v-if="grader_submission_id !== ''"
            id="grader-button"
            @click="go_to_grader"
          >
            Grader
          </button>
          <button id="delete-button" @click="delete_assignment">Delete</button>
        </div>
        <div v-if="permissions === 'student'" class="assignment-controls">
          <button
            v-if="submission_status && submission_status !== 'Not Submitted'"
            id="view-submission-button"
            @click="go_to_current_submission"
          >
            View Submission
          </button>
          <button
            v-if="show_start_assignment"
            id="start-assignment-button"
            @click="go_to_submitter"
          >
            Start Assignment
          </button>
        </div>
      </div>
      <hr />
      <div id="assignment-details">
        <div class="assignment-details-row">
          <div id="due-date-div">
            <p id="due-header">Due</p>
            <p id="due-date">
              {{
                assignment.due_date === ' '
                  ? ''
                  : format_date(assignment.due_date)
              }}
            </p>
          </div>
          <div id="points-div">
            <p id="points-header">Points</p>
            <p id="points">{{ assignment.points }}</p>
          </div>
        </div>
        <div class="assignment-details-row">
          <div id="available-div">
            <p id="available-header">Available</p>
            <p id="available-date">
              {{
                assignment.available_date === ''
                  ? ' '
                  : format_date(assignment.available_date)
              }}
            </p>
            <p
              v-if="
                assignment.available_date !== '' || assignment.until_date !== ''
              "
              id="available-divider"
            >
              -
            </p>
            <p id="until-date">
              {{
                assignment.until_date === ''
                  ? ' '
                  : format_date(assignment.until_date)
              }}
            </p>
          </div>
        </div>
        <div class="assignment-details-row">
          <div id="group-assignment-div">
            <p id="group-assignment-header">Group Assignment</p>
            <p id="group-assignment">
              {{ assignment.group_assignment === true ? 'Yes' : 'No' }}
            </p>
          </div>
          <div id="multiple-submissions-div">
            <p id="multiple-submissions-header">Multiple Submissions Allowed</p>
            <p id="multiple-submissions">
              {{
                assignment.allow_multiple_submissions === true ? 'Yes' : 'No'
              }}
            </p>
          </div>
        </div>
      </div>
      <hr />
      <p id="assignment-description">{{ assignment.description }}</p>
      <div
        v-if="
          viewer_link !== '' &&
            assignment.type === 'comment_submission' &&
            permissions === 'student'
        "
      ></div>
      <div
        v-if="
          viewer_link !== '' &&
            assignment.type === 'document_submission' &&
            permissions === 'student'
        "
      ></div>
      <div v-if="show_files">
        <div id="files-div">
          <div class="large-12 medium-12 small-12 cell">
            <label id="files-label">Files </label>
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
        <div class="large-12 medium-12 small-12 cell">
          <p
            v-if="files.length > 0"
            id="submit-button"
            @click="submitAssignment()"
          >
            Submit
          </p>
        </div>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script>
/* eslint-disable no-console,camelcase,vue/no-unused-components */

import https from 'https'
import axios from 'axios'
import { Datetime } from 'vue-datetime'
import Footer from '../components/footer'
import CourseSidebar from '../components/course_sidebar'
import NavBar from '../components/nav_bar'
import ModalPlugin from '../node_modules/bootstrap-vue'

export default {
  name: 'Assignment',
  components: {
    NavBar,
    CourseSidebar,
    Footer,
    ModalPlugin,
    datetime: Datetime
  },
  data: function() {
    return {
      showDismissibleAlert: false,
      selected_style: { color: 'white', 'background-color': '#0c2343' },
      default_style: { color: '#0c2343', 'background-color': 'white' }
    }
  },
  computed: {
    show_files: function() {
      return (
        this.assignment.type === 'document_submission' &&
        this.permissions === 'student' &&
        (this.submission_status === 'Not Submitted' ||
          this.assignment.allow_multiple_submissions) &&
        (this.assignment.due_date === '' ||
          (this.assignment.due_date !== '' &&
            Date.now() < new Date(this.assignment.due_date)) ||
          this.assignment.allow_late_submissions ||
          (this.extension_date && Date.now() < new Date(this.extension_date)))
      )
    },
    show_start_assignment: function() {
      return (
        this.viewer_link !== '' &&
        this.assignment.type === 'comment_submission' &&
        this.permissions === 'student' &&
        (this.submission_status === 'Not Submitted' ||
          this.assignment.allow_multiple_submissions) &&
        (this.assignment.due_date === '' ||
          (this.assignment.due_date !== '' &&
            Date.now() < new Date(this.assignment.due_date)) ||
          this.assignment.allow_late_submissions ||
          (this.extension_date && Date.now() < new Date(this.extension_date)))
      )
    }
  },
  async asyncData(context) {
    if (!context.store.state.authUser) return

    const res = await axios.get(
      `https://${process.env.backend}:3000/courses/${
        context.params.course_id
      }/assignments/${context.params.assignment_id}`,
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
      permissions: res.data.permissions,
      assignment: res.data.assignment,
      viewer_link: res.data.link,
      files: [],
      grader_link: res.data.grader_link,
      grader_submission_id: res.data.grader_submission_id,
      course: res.data.course_title,
      submission_status: res.data.submission_status,
      student_or_group_list: res.data.student_or_group_list,
      extensions: res.data.assignment.extensions,
      selected_user_name: '',
      selected_user_key: '',
      extension_date: res.data.extension_date
    }
  },
  fetch({ store, redirect }) {
    if (!store.state.authUser) {
      return redirect('/edu/login')
    }
  },
  methods: {
    go_to_edit_assignment() {
      this.$router.push(
        `/edu/courses/${this.$route.params.course_id}/assignments/${
          this.$route.params.assignment_id
        }/edit`
      )
    },
    got_to_submissions() {
      this.$router.push(
        `/edu/courses/${this.$route.params.course_id}/assignments/${
          this.$route.params.assignment_id
        }/submissions`
      )
    },
    go_to_grader() {
      window.open(
        `/edu/courses/${this.$route.params.course_id}/assignments/${
          this.$route.params.assignment_id
        }/submissions/${this.grader_submission_id}/grader?${this.grader_link}`
      )
    },
    go_to_submitter() {
      window.open(
        `/edu/courses/${this.$route.params.course_id}/submitter?${
          this.viewer_link
        }`
      )
    },
    go_to_current_submission() {
      window.open(
        `/edu/courses/${this.$route.params.course_id}/viewer?${
          this.viewer_link
        }`
      )
    },
    show() {
      this.$modal.show('Assignment Extensions')
    },
    hide() {
      this.$modal.hide('Assignment Extensions')
    },
    select_student(key, name) {
      this.selected_user_key = key
      this.selected_user_name = name
    },
    add_extension() {
      if (
        this.selected_user_key === '' ||
        this.selected_user_name === '' ||
        this.extension_date === ''
      )
        return

      this.extensions.push({
        user: this.selected_user_key,
        date: this.extension_date,
        name: this.selected_user_name
      })

      this.student_or_group_list = this.student_or_group_list.filter(user => {
        return user.key !== this.selected_user_key
      })

      this.selected_user_key = ''
      this.extension_date = ''
      this.selected_user_name = ''
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
    },
    async save_extensions() {
      await axios.post(
        `https://${process.env.backend}:3000/courses/${
          this.$route.params.course_id
        }/assignments/${this.$route.params.assignment_id}/extensions`,
        this.extensions,
        {
          headers: {
            Authorization: this.$store.state.authUser.id
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      )

      this.hide()
    },
    async delete_assignment() {
      await axios.delete(
        `https://${process.env.backend}:3000/courses/${
          this.$route.params.course_id
        }/assignments/${this.$route.params.assignment_id}`,
        {
          headers: {
            Authorization: this.$store.state.authUser.id
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      )
      this.$router.push(`/edu/courses/${this.$route.params.course_id}/`)
    },
    async submitAssignment() {
      if (this.files.length === 0) {
        this.showDismissibleAlert = true
        return
      }
      const formData = new FormData()
      for (let i = 0; i < this.files.length; i++) {
        const file = this.files[i]
        if (file.type !== 'application/pdf') {
          alert('Files must be in pdf format')
          return
        }
        formData.append('files[' + i + ']', file)
      }

      await axios.post(
        `https://${process.env.backend}:3000/courses/${
          this.$route.params.course_id
        }/assignments/${this.$route.params.assignment_id}/document_submissions`,
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
    }
  }
}
</script>

<style scoped>
@import '../node_modules/bootstrap/dist/css/bootstrap.css';

input[type='file'] {
  position: absolute;
  top: -500px;
}

hr {
  width: 60vw;
}

#assignment {
  display: flex;
}

#content {
  display: block;
  margin-left: 7vw;
  margin-top: 5vh;
}

#assignment-header,
.assignment-controls {
  display: flex;
}

.assignment-controls {
  margin-top: 0.65vh;
  right: 0;
  position: absolute;
  margin-right: 22vw;
}

#student-list-div {
  overflow-y: scroll;
  width: 30%;
  margin-right: 3%;
}

.student-or-group {
  cursor: pointer;
}

#date-div {
  width: 30%;
  margin-right: 3%;
}

.extension {
  display: flex;
}

.extension-name {
  margin-right: 5px;
}

#edit-button,
#submissions-button,
#grader-button,
#delete-button,
#view-submission-button,
#start-assignment-button {
  font-size: 2vh;
  background-color: #0c2343;
  border-radius: 0.5vh;
  color: white;
  padding-right: 0.5vw;
  padding-left: 0.5vw;
  margin-bottom: 0;
  height: 4.25vh;
}

#submissions-button,
#grader-button,
#delete-button,
#view-submission-button,
#start-assignment-button {
  margin-left: 0.5vw;
}

#assignment-title {
  font-size: 3vh;
  color: #0c2343;
  margin-bottom: 0;
}

.assignment-details-row {
  display: flex;
}

#due-date-div,
#points-div,
#available-div,
#group-assignment-div,
#multiple-submissions-div {
  display: flex;
  color: #0c2343;
}

#due-header,
#points-header,
#available-header,
#group-assignment-header,
#multiple-submissions-header {
  font-weight: bold;
  margin-right: 0.5vw;
  font-size: 2vh;
}

#due-date,
#group-assignment {
  margin-right: 2vw;
}

#due-date,
#points,
#available-date,
#available-divider,
#group-assignment,
#multiple-submissions {
  font-size: 2vh;
}

#available-divider {
  margin-left: 0.5vw;
  margin-right: 0.5vw;
}

#group-assignment-header,
#group-assignment,
#multiple-submissions-header,
#multiple-submissions {
  margin-bottom: 0;
}

#assignment-description {
  color: #0c2343;
}

#files-div {
  margin-top: 7vh;
}

#files-label {
  font-size: 2vh;
}

.file-listing {
  display: flex;
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
  width: 5vw;
  text-align: center;
  cursor: pointer;
}

#submit-button {
  border-radius: 0.5vh;
  cursor: pointer;
  color: white;
  background-color: #0c2343;
  width: 5vw;
  font-size: 2.5vh;
  text-align: center;
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
  margin-right: 1vw;
  position: absolute;
  bottom: 0;
  right: 0;
}

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
  cursor: pointer;
}

#modal-continue-button {
  margin-right: 0.5vw;
}

#modal-cancel-button {
  background-color: #595959;
}
</style>
