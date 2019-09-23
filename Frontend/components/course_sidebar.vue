<template>
  <div id="sidebar">
    <!--<div v-if="name !== ''" id="name-div">-->
      <!--<p class="logged-in-text">Logged in as</p>-->
      <!--<p class="logged-in-text">{{ name }}</p>-->
      <!--<div id="logout" @click="logout">-->
        <!--<img id="logout-icon" src="/logout.png" />-->
        <!--&lt;!&ndash;<p v-if="name !== ''" class="header-logout">Logout of</p>&ndash;&gt;-->
        <!--&lt;!&ndash;<p v-if="name !== ''" class="header-logout">{{ name }}</p>&ndash;&gt;-->
        <!--&lt;!&ndash;<p v-if="name === ''" class="header-logout">Logout</p>&ndash;&gt;-->
        <!--<p class="header-logout">Logout</p>-->
      <!--</div>-->
      <!--<hr />-->
    <!--</div>-->
    <!--<div id="sb_dashboard"-->
         <!--:style="{-->
        <!--'background-color': dashboard_background_color,-->
        <!--color: dashboard_color-->
      <!--}"-->
         <!--@click="go_to_dashboard"-->
    <!--&gt;-->
      <!--<img id="dashboard-icon" src="/dashboard.png" />-->
      <!--<p id="header-dashboard">-->
        <!--Dashboard-->
      <!--</p>-->
    <!--</div>-->
    <div
      id="assignments"
      :style="{
        'background-color': assignments_background_color,
        color: assignments_color
      }"
      @click="go_to_all_assignments"
    >
      <!--<img v-if="!assignments" id="assignment-icon" src="/assignment.png" />-->
      <!--<img-->
        <!--v-if="assignments"-->
        <!--id="assignment-icon-white"-->
        <!--src="/assignment-white.png"-->
      <!--/>-->
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
      <!--<img v-if="!people" id="group-icon" src="/group.png" />-->
      <!--<img v-if="people" id="group-icon-white" src="/group-white.png" />-->
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
      <!--<img v-if="!grades" id="grade-icon" src="/grade.png" />-->
      <!--<img v-if="grades" id="grade-icon-white" src="/grade-white.png" />-->
      <p id="header-grades">Grades</p>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-console */
export default {
  name: 'CourseSidebar',
  props: {
    name: {
      type: String,
      default: ''
    },
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
      dashboard_background_color: 'white',
      dashboard_color: '#0c2343',
      assignments_background_color: 'white',
      assignments_color: '#0c2343',
      people_background_color: 'white',
      people_colour: '#0c2343',
      grades_background_color: 'white',
      grades_color: '#0c2343'
    }
  },
  mounted: function() {
    // if (this.assignments) {
    //   this.assignments_background_color = '#0c2343'
    //   this.assignments_color = 'white'
    // }
    if (this.$route.fullPath.includes('assignments') || this.assignments) {
      this.assignments_background_color = '#0c2343'
      this.assignments_color = 'white'
    }

    if (this.$route.fullPath.includes('course_groups') || this.people) {
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
      this.$router.push('/edu/dashboard')
    },
    go_to_all_assignments() {
      this.$router.push(`/edu/courses/${this.$route.params.course_id}`)
    },
    go_to_people() {
      this.$router.push(
        `/edu/courses/${this.$route.params.course_id}/users`
      )
    },
    go_to_all_grades() {
      this.$router.push(
        `/edu/courses/${this.$route.params.course_id}/grades`
      )
    },
    logout() {
      this.$store.dispatch('logout')
      window.open('/logout_saml', '_self')
      // await this.$auth.logout()
      // this.$router.push('/education')
    }
  }
}
</script>

<style scoped>

p {
  margin: 0;
}

#sidebar {
  width: 100px;
  margin-left: 20px;
  margin-top: 27vh;
}

#header-assignments,
#header-people,
#header-grades {
  font-size: 1rem;
  text-align: center;
}

#assignments,
#people,
#grades {
  margin-top: 50px;
  cursor: pointer;
  border-radius: 5px;
}
</style>
