<script src="../../../../Downloads/ToKeep/linter/.eslintrc.js"></script>
<template>
  <div>
    <h1>RichReview LMS Admin</h1>
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
    console.log('log')
    console.log(context.store.state)

    const res = await axios.get(`https://${process.env.backend}:3000/courses`, {
      headers: {
        Authorization: context.store.state.authUser.id
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    })
    console.log(res.data)

    return {
      enrolments: res.data.enrolments,
      taing: res.data.taing,
      instructing: res.data.teaching,
      assignments: res.data.assignments,
      auth: context.store.state.authUser
    }
  },
  async fetch({ store, redirect }) {
    if (!store.state.authUser) {
      return redirect('/edu/login')
    }
    const res = await axios.get(
      `https://${process.env.backend}:3000/dbs/is_admin`,
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
    go_to_dashboard() {
      this.$router.push('/edu/dashboard')
    },
    go_to_all_assignments() {
      this.$router.push('/edu/all-assignments')
    },
    go_to_all_groups() {
      this.$router.push('/edu/all-groups')
    },
    go_to_all_grades() {
      this.$router.push('/edu/all-grades')
    },
    async logout() {
      await this.$auth.logout()
      this.$router.push('/edu')
    }
  }
}
</script>
