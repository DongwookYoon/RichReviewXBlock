<template>
  <div id="grades">
    <course-sidebar :name="name" :grades="true" />
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
            <th
              v-for="a in assignments"
              :key="a.key"
              @click="go_to_assignment(a.id)"
            >
              <div>
                {{ a.title }}
              </div>
              <div class="points">Out of {{ a.points }}</div>
              <div class="weights">Worth {{ a.weight }}% of final grade</div>
              <div
                v-if="!a.count_toward_final_grade"
                class="count-toward-final"
              >
                *Doesn't count toward final grade
              </div>
            </th>
            <th>
              <div>Total</div>
              <!--<div class="points">Out of {{ total_assignment_points }}</div>-->
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
                @keypress="isNumber($event)"
                @change="updateGrade(s.student_key, g.assignment_id, $event)"
              />
            </td>
            <td>{{ calculate_total(s.grades) }}%</td>
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
    if (!context.store.state.authUser) return

    const res = await axios.get(
      `https://${process.env.backend}:3000/courses/${
        context.params.course_id
      }/grades`,
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
      students: res.data.grades,
      assignments: res.data.assignments,
      permissions: res.data.permissions,
      course: res.data.course_title,
      total_assignment_points: res.data.total_assignment_points,
      name: res.data.user_name || ''
    }
  },
  fetch({ store, redirect }) {
    if (!store.state.authUser) {
      return redirect('/edu/login')
    }
  },
  methods: {
    async updateGrade(student_key, assignment_id, event) {
      console.log(event)
      if (this.permissions === 'instructor' || this.permissions === 'ta') {
        const mark = parseInt(event.target.value)

        if (isNaN(mark) || (event.target.value.match(/\./g) || []).length > 1) {
          alert('A grade must be a number, but may include a decimal')
          return
        }

        for (const student of this.students) {
          if (student.student_key === student_key) {
            for (const grade of student.grades) {
              if (grade.assignment_id === assignment_id) {
                grade.mark = mark
                break
              }
            }
            break
          }
        }

        await axios.put(
          `https://${process.env.backend}:3000/courses/${
            this.$route.params.course_id
          }/grades/${assignment_id}`,
          {
            student_key: student_key,
            mark: mark
          },
          {
            headers: {
              Authorization: this.$store.state.authUser.id
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
        `https://${process.env.backend}:3000/courses/${
          this.$route.params.course_id
        }/grades/csv`,
        {
          headers: {
            Authorization: this.$store.state.authUser.id
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
    },
    calculate_total(grades) {
      let total = 0
      if (isNaN(this.total_assignment_points) || this.total_assignment_points === 0)
        return 0

      for (const grade of grades) {
        if (grade.mark !== '' && grade.count_toward_final_grade) {
          total += grade.mark * (grade.weight / 100)
        }
      }

      if (isNaN(total))
        return 0

      return Math.round(((total * 100) / this.total_assignment_points) * 100) / 100
    },
    isNumber: function(evt) {
      evt = evt || window.event
      const charCode = evt.which ? evt.which : evt.keyCode
      if (
        charCode > 31 &&
        (charCode < 48 || charCode > 57) &&
        charCode !== 46
      ) {
        evt.preventDefault()
      } else {
        return true
      }
    },
    go_to_assignment(id) {
      this.$router.push(
        `/edu/courses/${this.$route.params.course_id}/assignments/${id}`
      )
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
  margin-bottom: 50px;
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

.points,
.weights {
  font-size: 10px;
}

.count-toward-final {
  font-size: 8px;
}
</style>
