<template>
  <div id="sidebar">
    <img id="logo" src="/loading-icon.png" @click="go_to_dashboard" />
    <div
      id="assignments"
      :style="{
        'background-color': assignments_background_color,
        color: assignments_color
      }"
      @click="go_to_all_assignments"
    >
      <img v-if="!assignments" id="assignment-icon" src="/assignment.png" />
      <img
        v-if="assignments"
        id="assignment-icon-white"
        src="/assignment-white.png"
      />
      <p id="header-assignments">
        Assignments
      </p>
    </div>
    <div
      id="people"
      :style="{
        'background-color': people_background_color,
        color: people_colour
      }"
      @click="go_to_people"
    >
      <img v-if="!people" id="group-icon" src="/group.png" />
      <img v-if="people" id="group-icon-white" src="/group-white.png" />
      <p id="header-people">People</p>
    </div>
    <div
      id="grades"
      :style="{
        'background-color': grades_background_color,
        color: grades_color
      }"
      @click="go_to_all_grades"
    >
      <img v-if="!grades" id="grade-icon" src="/grade.png" />
      <img v-if="grades" id="grade-icon-white" src="/grade-white.png" />
      <p id="header-grades">Grades</p>
    </div>
    <div id="logout" @click="logout">
      <img id="logout-icon" src="/logout.png" />
      <p id="header-logout">Logout</p>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-console */
export default {
  name: 'CourseSidebar',
  props: {
    assignments: {
      type: Boolean,
      default: false
    },
    people: {
      type: Boolean,
      default: false
    },
    grades: {
      type: Boolean,
      default: false
    }
  },
  data: function() {
    return {
      assignments_background_color: 'white',
      assignments_color: '#0c2343',
      people_background_color: 'white',
      people_colour: '#0c2343',
      grades_background_color: 'white',
      grades_color: '#0c2343'
    }
  },
  mounted: function() {
    console.log(this.$route)
    if (this.assignments) {
      this.assignments_background_color = '#0c2343'
      this.assignments_color = 'white'
    }

    if (this.people) {
      this.people_background_color = '#0c2343'
      this.people_colour = 'white'
    }

    if (this.grades) {
      this.grades_background_color = '#0c2343'
      this.grades_color = 'white'
    }
  },
  methods: {
    go_to_dashboard() {
      this.$router.push('/education/dashboard')
    },
    go_to_all_assignments() {
      this.$router.push(`/education/courses/${this.$route.params.course_id}`)
    },
    go_to_people() {
      this.$router.push(
        `/education/courses/${this.$route.params.course_id}/users`
      )
    },
    go_to_all_grades() {
      this.$router.push(
        `/education/courses/${this.$route.params.course_id}/grades`
      )
    },
    async logout() {
      await this.$auth.logout()
      this.$router.push('/education')
    }
  }
}
</script>

<style scoped>
@import '../node_modules/bootstrap/dist/css/bootstrap.css';

#logo {
  vertical-align: middle;
  text-align: left;
  padding-left: 1vw;
  padding-top: 1vw;
  width: 10vw;
  cursor: pointer;
}

#assignment-icon,
#assignment-icon-white,
#group-icon,
#group-icon-white,
#grade-icon,
#grade-icon-white,
#logout-icon {
  width: 2vw;
  margin-left: 4.6vw;
}

#header-assignments,
#header-people,
#header-grades,
#header-logout {
  width: 11vw;
  font-size: 3vh;
  text-align: center;
}

#assignments,
#people,
#grades,
#logout {
  margin-top: 7vh;
  cursor: pointer;
  border-radius: 0 0.5vh 0.5vh 0;
  padding-top: 1vh;
}

#header-logout {
  color: #0c2343;
}
</style>
