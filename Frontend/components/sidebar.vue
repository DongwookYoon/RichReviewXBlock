<template>
  <div id="sidebar">
    <p id="course-title">{{ title }}</p>
    <p id="course-description">{{ description }}</p>
    <p id="people" @click="go_to_people">
      People
    </p>
    <p id="grades" @click="go_to_grades">
      Grades
    </p>
    <p
      v-if="permissions === 'ta' || permissions === 'instructor'"
      id="new-assignment"
      @click="go_to_new_assignment"
    >
      + Assignment
    </p>
  </div>
</template>

<script>
/* eslint-disable no-console */
export default {
  name: 'Sidebar',
  props: {
    title: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    permissions: {
      type: String,
      default: ''
    }
  },
  methods: {
    go_to_people() {
      this.$router.push(`/courses/${this.$route.params.course_id}/users`)
    },
    go_to_grades() {
      this.$router.push(`/courses/${this.$route.params.course_id}/grades`)
    },
    go_to_new_assignment() {
      this.$router.push(
        `/courses/${this.$route.params.course_id}/assignments/new`
      )
    },
    go_to_course() {
      this.$router.push(`/courses/${this.$route.params.course_id}`)
    }
  }
}
</script>

<style scoped>
p {
  margin: 0;
}

#sidebar {
  color: #0c2343;
  margin-left: 2vw;
  margin-right: 5vw;
}

#course-title {
  margin-top: 2vh;
  font-size: 3.5vh;
}

#course-description {
  font-size: 1.75vh;
  width: 10vw;
  height: 10vh;
  margin-top: 2vh;
  overflow: hidden;
  text-overflow: ellipsis;
}

/*#sidebar {*/
/*font-size: 3.5vh;*/
/*color: #0c2343;*/
/*margin-top: 20vh;*/
/*margin-right: 5vw;*/
/*margin-left: 2vw;*/
/*min-width: 12vw;*/
/*}*/

#people,
#grades,
#new-assignment {
  margin-top: 5vh;
  cursor: pointer;
  font-size: 3.5vh;
}
</style>
