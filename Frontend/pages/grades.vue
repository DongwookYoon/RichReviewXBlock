<template>
  <div id="grades">
    <course-sidebar :grades="true" />
    <div id="content">
      <nav-bar :course="course" grades="true" />
      <button
        v-if="permissions === 'instructor' || permissions === 'ta'"
        id="download-grades-btn"
        @click="downloadGrades"
      >
        Download Grades
      </button>
      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th v-for="a in assignments" :key="a.key">
              <div>
                {{ a.title }}
              </div>
              <div class="points">Out of {{ a.points }}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in students" :key="s.key">
            <td>{{ s.name }}</td>
            <td v-for="g in s.grades" :key="g.key">
              <p v-if="permissions === 'student'">
                {{ g.mark !== '' ? g.mark : g.submission_status }}
              </p>
              <input
                v-if="permissions === 'ta' || permissions === 'instructor'"
                :placeholder="[[g.mark !== '' ? g.mark : g.submission_status]]"
                type="text"
                @change="updateGrade(s.student_key, g.assignment_id, $event)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <Footer />
  </div>
</template>

<script>
/* eslint-disable no-console,camelcase,no-unused-vars */
import https from 'https'
import XLSX from 'xlsx'
import axios from 'axios'
import CourseSidebar from '../components/course_sidebar'
import NavBar from '../components/nav_bar'
import Footer from '../components/footer'

export default {
  name: 'Grades',
  components: { Footer, NavBar, CourseSidebar },
  async asyncData(context) {
    const res = await axios.get(
      `https://localhost:3000/courses/${context.params.course_id}/grades`,
      {
        headers: {
          Authorization: context.app.$auth.user.sub
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )
    console.log(res.data)
    return {
      students: res.data.grades,
      assignments: res.data.assignments,
      permissions: res.data.permissions,
      course: res.data.course_title
    }
  },
  methods: {
    async updateGrade(student_key, assignment_id, event) {
      if (this.permissions === 'instructor' || this.permissions === 'ta') {
        const mark = event.target.value

        await axios.put(
          `https://localhost:3000/courses/${
            this.$route.params.course_id
          }/grades/${assignment_id}`,
          {
            student_key: student_key,
            mark: mark
          },
          {
            headers: {
              Authorization: this.$auth.user.sub
            },
            httpsAgent: new https.Agent({
              rejectUnauthorized: false
            })
          }
        )
      }
    },
    async downloadGrades() {
      const res = await axios.get(
        `https://localhost:3000/courses/${
          this.$route.params.course_id
        }/grades/csv`,
        {
          headers: {
            Authorization: this.$auth.user.sub
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      )

      const grades = XLSX.utils.json_to_sheet(res.data)

      // A workbook is the name given to an Excel file
      const wb = XLSX.utils.book_new() // make Workbook of Excel

      // add Worksheet to Workbook
      // Workbook contains one or more worksheets
      XLSX.utils.book_append_sheet(wb, grades, 'grades') // sheetAName is name of Worksheet

      // export Excel file
      XLSX.writeFile(wb, 'grades.xlsx') // name of the file is 'book.xlsx'
    }
  }
}
</script>

<style scoped>
@import '../node_modules/bootstrap/dist/css/bootstrap.css';

p {
  margin: 0;
}

body {
  font-family: Helvetica Neue, Arial, sans-serif;
  font-size: 14px;
  color: #ffffff;
}

table {
  border: 1px solid #000000;
  border-radius: 3px;
  background-color: #fff;
  text-align: center;
}

th {
  background-color: #0c2343;
  color: white;
  cursor: pointer;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  text-align: center;
}

td {
  background-color: #f9f9f9;
  border: 1px solid #000000;
}

th,
td {
  min-width: 120px;
  padding: 10px 20px;
}

#grades {
  display: flex;
}

#content {
  display: block;
  margin-top: 5vh;
  margin-left: 7vw;
}

#download-grades-btn {
  border-radius: 0.5vh;
  cursor: pointer;
  color: white;
  background-color: #0c2343;
  font-size: 2vh;
  text-align: center;
  margin-bottom: 1vh;
}

.points {
  font-size: 10px;
}
</style>
