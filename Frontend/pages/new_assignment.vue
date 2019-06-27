<template>
  <div id="new-assignment">
    <course-sidebar />
    <div id="content">
      <b-alert v-model="showDismissibleAlert" variant="danger" dismissible>
        One or more files is required for a comment submission assignment.
      </b-alert>
      <h1 v-if="permissions !== 'instructor' && permissions !== 'ta'">401</h1>
      <div
        v-if="permissions === 'ta' || permissions === 'instructor'"
        id="assignment-grid"
      >
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
        <div id="type-div">
          <label id="type-label">Assignment type</label>
          <select id="type" v-model="assignment_data.type">
            <option value="document_submission">Document Submission</option>
            <option value="comment_submission">Comment Submission</option>
          </select>
        </div>
        <!--<div>-->
        <!--<label>Display Grade as</label>-->
        <!--<select v-model="assignment_data.display_grade_as">-->
        <!--<option>Points</option>-->
        <!--<option>Percentage</option>-->
        <!--<option>Complete/Incomplete</option>-->
        <!--<option>Letter Grade</option>-->
        <!--<option>Not Graded</option>-->
        <!--</select>-->
        <!--</div>-->
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
        <div id="group-assignment-div">
          <input
            id="group-assignment"
            v-model="assignment_data.group_assignment"
            type="checkbox"
          />
          <label id="group-assignment-label">Group assignment</label>
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
/* eslint-disable no-console,vue/no-unused-components */
import https from 'https'
import { Datetime } from 'vue-datetime'
import 'vue-datetime/dist/vue-datetime.css'
import axios from 'axios'
import Footer from '../components/footer'
import CourseSidebar from '../components/course_sidebar'

export default {
  name: 'NewAssignment',
  components: {
    CourseSidebar,
    Footer,
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
      },
      files: [],
      showDismissibleAlert: false
    }
  },
  async asyncData(context) {
    const res = await axios.get(
      `https://localhost:3000/courses/${
        context.params.course_id
      }/users/permissions`,
      {
        headers: {
          Authorization: context.app.$auth.user.sub
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )
    return {
      permissions: res.data.permissions
    }
  },
  methods: {
    go_to_course() {
      this.$router.push(`/courses/${this.$route.params.course_id}/`)
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
      if (this.assignment_data.type === 'comment_submission') {
        if (this.files.length === 0) {
          this.showDismissibleAlert = true
          return
        }
        const formData = new FormData()
        for (let i = 0; i < this.files.length; i++) {
          const file = this.files[i]
          formData.append('files[' + i + ']', file)
        }

        formData.append('assignment_data', JSON.stringify(this.assignment_data))

        await axios.post(
          `https://localhost:3000/courses/${
            this.$route.params.course_id
          }/assignments/comment_submission_assignment`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: this.$auth.user.sub
            },
            httpsAgent: new https.Agent({
              rejectUnauthorized: false
            })
          }
        )
        this.$router.push(`/courses/${this.$route.params.course_id}`)
      } else {
        await axios.post(
          `https://localhost:3000/courses/${
            this.$route.params.course_id
          }/assignments/document_submission_assignment`,
          { assignment_data: this.assignment_data },
          {
            headers: {
              Authorization: this.$auth.user.sub
            },
            httpsAgent: new https.Agent({
              rejectUnauthorized: false
            })
          }
        )
        this.$router.push(`/courses/${this.$route.params.course_id}`)
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
}

#content {
  display: block;
  margin-left: 7vw;
  margin-top: 7vh;
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
  width: 5vw;
  text-align: center;
  cursor: pointer;
}

#assignment-grid {
  display: block;
  font-size: 2vh;
  color: #0c2343;
}

#title {
  margin-bottom: 1vh;
  height: 3.75vh;
}

#title,
#description {
  width: 40vw;
  font-size: 1.75vh;
}

#description {
  height: 25vh;
  border: 1px solid lightgrey;
}

#points-div {
  margin-left: 10vw;
  margin-bottom: 1vh;
  margin-top: 1vh;
}

#type-div {
  margin-left: 4.9vw;
  margin-bottom: 1vh;
}

#type {
  cursor: pointer;
}

#count-towards-final,
#multiple-submissions,
#group-assignment,
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

#available-date-div {
  margin-left: 6.2vw;
}

#until-date-div {
  margin-left: 10.7vw;
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
