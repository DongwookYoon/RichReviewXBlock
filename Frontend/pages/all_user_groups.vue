<template>
  <div>
    <Header />
    <div>
      <div
        v-for="cg in course_group_data"
        :key="cg.key"
        class="course-group"
        @click="go_to_course_group(cg.course_id, cg.course_group_id)"
      >
        <p>{{ cg.name }}</p>
        <p>{{ cg.course }}</p>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script>
/* eslint-disable camelcase */

import https from 'https'
import axios from 'axios'
import Header from '../components/Header'
import Footer from '../components/footer'
export default {
  name: 'AllUserGroups',
  components: { Footer, Header },
  async asyncData(context) {
    const res = await axios.get(
      `https://localhost:3000/courses/0/course_groups/all_user_course_groups`,
      {
        headers: {
          Authorization: context.app.$auth.user.sub
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )

    const course_group_data = res.data
    return {
      course_group_data
    }
  },
  methods: {
    go_to_course_group(course_id, course_group_id) {
      this.$router.push(
        `/courses/${course_id}/course_groups/${course_group_id}`
      )
    }
  }
}
</script>

<style scoped>
p {
  margin-right: 5vw;
}

.course-group {
  display: flex;
}
</style>
