<script src="../../../../Downloads/ToKeep/linter/.eslintrc.js"></script>
<template>
  <div>
    <h1>RichReview LMS Admin</h1>
    <h2>Users</h2>

    <table>
      <tr>
        <th>Type</th>
        <th>ID</th>
        <th>Email</th>
        <th>Display Name</th>
        <th>Teaching</th>
        <th>Enrollments</th>
      </tr>
      <tr v-for="u of user_data" :key="u.key">
        <td>{{ u.auth_type }}</td>
        <td>{{ u.id }}</td>
        <td>{{ u.email }}</td>
        <td>{{ u.display_name }}</td>
        <td><button class="users_table_button" @click="add_user_to_course(u.id)">+</button> <button class="users_table_button">−</button> {{ u.teaching }}</td>
        <td><button class="users_table_button">+</button> <button class="users_table_button">−</button> {{ u.enrolments }}</td>
      </tr>
    </table>
    <h2>Courses</h2>
    <table>
      <tr>
        <th>ID</th>
        <th>Instructors</th>
        <th>TAs</th>
      </tr>
      <tr v-for="c of course_data" :key="c.key">
        <td>{{ c.id }}</td>
        <td><button class="users_table_button">+</button> <button class="users_table_button">−</button> {{ c.instructors }}</td>
        <td><button class="users_table_button">+</button> <button class="users_table_button">−</button> {{ c.tas }}</td>
      </tr>
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

    const res_user_data = await axios.get(`https://${process.env.backend}:3000/admin/all_user_data`, {
      headers: {
        Authorization: context.store.state.authUser.id
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    })
    res_user_data.data.user_data.sort( function compare( a, b ) {
      if ( a.display_name < b.display_name ){
        return -1;
      }
      if ( a.display_name > b.display_name ){
        return 1;
      }
      return 0;
    } );

    const res_course_data = await axios.get(`https://${process.env.backend}:3000/admin/all_course_data`, {
      headers: {
        Authorization: context.store.state.authUser.id
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    })
    res_course_data.data.course_data.sort( function compare( a, b ) {
      if ( a.id < b.id ){
        return -1;
      }
      if ( a.id > b.id ){
        return 1;
      }
      return 0;
    } );

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
    add_user_to_course(id){
      window.prompt("Add " + id + " to the course",'course id');
    }
  }
}
</script>
<style>
  body {
    margin: 0px 20px 21px 20px;
  }
  td, th{
    padding: 1px 4px;
  }
  .users_table_button {
    padding: 1px 4px 2px 4px;
    line-height: normal;
  }
</style>
