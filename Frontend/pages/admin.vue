<template>
  <div id="admin">
    <h1>RichReview LMS Admin</h1>
    <h2>Users</h2>
    <table>
      <thead>
        <tr>
          <th>Type</th>
          <th>ID</th>
          <th>Email</th>
          <th>Display Name</th>
          <th>Teaching</th>
          <th>Enrollments</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in user_data" :key="u.key">
          <td>{{ u.auth_type }}</td>
          <td>{{ u.id }}</td>
          <td>{{ u.email }}</td>
          <td>{{ u.display_name }}</td>
          <td>
            <button class="users_table_button" @click="add_instructor_to_course(u.id)">+</button>
            <button class="users_table_button" @click="remove_instructor_from_course(u.id)">−</button>
            {{ u.teaching }}</td>
          <td>{{ u.enrolments }}</td>
        </tr>
      </tbody>
    </table>

    <h2>Courses</h2>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Instructors</th>
          <th>TAs</th>
          <th>Active Students</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in course_data" :key="c.key">
          <td>{{ c.id }}</td>
          <td>{{ c.instructors }}</td>
          <td>{{ c.tas }}</td>
          <td><button class="users_table_button" @click="add_student_to_course(c.id)">+</button> <button class="users_table_button" @click="block_student_from_course(c.id)">−</button> {{ c.active_students }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
module.exports = {}
</script>

<script>
/* eslint-disable require-await,no-unused-vars,no-console,prettier/prettier,no-undef,camelcase */

import https from 'https'
import axios from 'axios'
import Footer from '../components/footer'
import CourseCard from '../components/course-card'
import UpcomingAssignment from '../components/upcoming-assignment'
import Sidebar from '../components/dashboard_sidebar'

export default {
  async asyncData(context) {
    if (!context.store.state.authUser) return

    //get user data
    const res_user_data = await axios.get(`https://${process.env.backend}:3000/admin/all_user_data`, {
      headers: {
        Authorization: context.store.state.authUser.id
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    })
    //sort by name
    res_user_data.data.user_data.sort( function compare( a, b ) {
      if ( a.display_name < b.display_name ){
        return -1;
      }
      if ( a.display_name > b.display_name ){
        return 1;
      }
      return 0;
    } );
    // format lists of active students and instructors: add spaces between ids and remove 'usr:'
    function format_user_array_string(s){
      s = JSON.stringify(JSON.parse(s), null, 1)
      return s.substr(1, s.length-2).replace(/crs:/g, '').trim()
    }
    for(let u of res_user_data.data.user_data){
      u.teaching = format_user_array_string(u.teaching);
      u.enrolments = format_user_array_string(u.enrolments);
    }

    //get course data
    const res_course_data = await axios.get(`https://${process.env.backend}:3000/admin/all_course_data`, {
      headers: {
        Authorization: context.store.state.authUser.id
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    })
    //sort by course id
    res_course_data.data.course_data.sort( function compare( a, b ) {
      if ( a.id < b.id ){
        return -1;
      }
      if ( a.id > b.id ){
        return 1;
      }
      return 0;
    } );

    // format lists of active students and instructors: add spaces between ids and remove 'usr:'
    function format_course_array_string(s){
      s = JSON.stringify(JSON.parse(s), null, 1)
      return s.substr(1, s.length-2).replace(/usr:/g, '').trim()
    }
    for(let c of res_course_data.data.course_data){
      c.active_students = format_course_array_string(c.active_students);
      c.instructors = format_course_array_string(c.instructors);
    }

    return {
      user_data: res_user_data.data.user_data,
      course_data: res_course_data.data.course_data,
      auth: context.store.state.authUser
    }
  },
  async fetch({ store, redirect }) {
    if (!store.state.authUser) {
      return redirect('/edu/login')
    }
    const res = await axios.get(
      `https://${process.env.backend}:3000/admin/is_admin`,
      {
        headers: {
          Authorization: store.state.authUser.id
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )
    console.log('is_admin:' + res.data)
    if (!res.data) return redirect('/edu/dashboard')
  },
  methods: {
    async add_instructor_to_course(user_id){
      let course_id = window.prompt("Add " + user_id + " as an instructor to course",'<course id>');
      if(course_id){
        try{
          console.log("Try: adding", user_id, "as an instructor to course", course_id)
          let res = await axios.post(
                  `https://${process.env.backend}:3000/admin/add_instructor_to_course`,
                  { user_id: user_id, course_id: course_id },
                  {
                    headers: {
                      Authorization: this.$store.state.authUser.id
                    },
                    httpsAgent: new https.Agent({
                      rejectUnauthorized: false
                    })
                  }
          )
          console.log("Succeed: adding", user_id, "as an instructor to course", course_id)
          window.location.reload(false)
        }
        catch(e){
          console.log("Error: adding", user_id, "as an instructor to course", course_id)
          console.error(e)
        }
      }
    },
    async remove_instructor_from_course(user_id){
      let course_id = window.prompt("Remove instructor", user_id, "from course",'<course id>');
      if(course_id){
        try{
          console.log("Try: removing instructor", user_id, "from course", course_id)
          let res = await axios.post(
                  `https://${process.env.backend}:3000/admin/remove_instructor_from_course`,
                  { user_id: user_id, course_id: course_id },
                  {
                    headers: {
                      Authorization: this.$store.state.authUser.id
                    },
                    httpsAgent: new https.Agent({
                      rejectUnauthorized: false
                    })
                  }
          )
          console.log("Succeed: removing instructor", user_id, "from course", course_id)
          window.location.reload(false)
        }
        catch(e){
          console.log("Error: removing instructor", user_id, "from course", course_id)
          console.error(e)
        }
      }
    },
    async add_student_to_course(course_id){
      let user_id = window.prompt("Add " + course_id + " as a student to course",'<user id>');
      if(user_id){
        try{
          console.log("Try: adding", course_id, "as a student to course", user_id)
          let res = await axios.post(
                  `https://${process.env.backend}:3000/admin/add_student_to_course`,
                  { user_id: user_id, course_id: course_id },
                  {
                    headers: {
                      Authorization: this.$store.state.authUser.id
                    },
                    httpsAgent: new https.Agent({
                      rejectUnauthorized: false
                    })
                  }
          )
          console.log("Succeed: adding", course_id, "as a student to course", user_id)
          window.location.reload(false)
        }
        catch(e){
          console.log("Error: adding", course_id, "as a student to course", user_id)
          console.error(e)
        }
      }
    },
    async block_student_from_course(course_id){
      let user_id = window.prompt("Block student", course_id, "from course",'<user id>');
      if(user_id){
        try{
          console.log("Try: blocking student", course_id, "from course", user_id)
          let res = await axios.post(
                  `https://${process.env.backend}:3000/admin/block_student_from_course`,
                  { user_id: user_id, course_id: course_id },
                  {
                    headers: {
                      Authorization: this.$store.state.authUser.id
                    },
                    httpsAgent: new https.Agent({
                      rejectUnauthorized: false
                    })
                  }
          )
          console.log("Succeed: blocking student", course_id, "from course", user_id)
          window.location.reload(false)
        }
        catch(e){
          console.log("Error: blocking student", course_id, "from course", user_id)
          console.error(e)
        }
      }
    }
  }
}
</script>
<style scoped>
  body {
    margin: 0px 20px 21px 20px;
  }
  tr {
    border-bottom: 1px solid #e8e8e8;
  }
  td, th{
    padding: 1px 4px;
  }
  .users_table_button {
    padding: 1px 4px 2px 4px;
    line-height: normal;
  }
</style>
