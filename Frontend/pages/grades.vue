<template>
  <div>
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
            <input
              :placeholder="[[g.mark !== '' ? g.mark : g.submission_status]]"
              type="text"
              @change="updateGrade(s.student_key, g.assignment_id, $event)"
            />
          </td>
        </tr>
      </tbody>
    </table>
    <button @click="downloadGrades">Download Grades</button>
  </div>
</template>

<script>
/* eslint-disable no-console,camelcase,no-unused-vars */
import https from 'https'
import XLSX from 'xlsx'
import axios from 'axios'

export default {
  name: 'Grades',
  asyncData(context) {
    return axios
      .get(
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
      .then(res => {
        console.log(res.data)
        return {
          students: res.data.grades,
          assignments: res.data.assignments
        }
      })
      .catch(e => {
        console.log(e)
        return {
          students: [],
          assignments: []
        }
      })
  },
  methods: {
    updateGrade(student_key, assignment_id, event) {
      const mark = event.target.value

      axios
        .put(
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
        .catch(e => {
          console.log(e)
        })
    },
    downloadGrades() {
      axios
        .get(
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
        .then(res => {
          console.log(res.data)
          const grades = XLSX.utils.json_to_sheet(res.data)

          // A workbook is the name given to an Excel file
          const wb = XLSX.utils.book_new() // make Workbook of Excel

          // add Worksheet to Workbook
          // Workbook contains one or more worksheets
          XLSX.utils.book_append_sheet(wb, grades, 'grades') // sheetAName is name of Worksheet

          // export Excel file
          XLSX.writeFile(wb, 'grades.xlsx') // name of the file is 'book.xlsx'
        })
        .catch(e => {
          console.log(e)
        })
    }
  }
}
</script>

<style scoped>
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
  background-color: #2621b9;
  color: rgb(255, 255, 255);
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

.points {
  font-size: 10px;
}
</style>
