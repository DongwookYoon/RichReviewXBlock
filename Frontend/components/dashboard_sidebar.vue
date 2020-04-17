<template>
  <div>
    <div id="sidebar">
      <div v-if="name !== ''" id="name-div">
        <p class="logged-in-text">Logged in as</p>
        <p class="logged-in-text">{{ name }}</p>
        <div id="logout" @click="logout">
          <img id="logout-icon" src="/logout-white.png" />
          <p class="header-logout">Logout</p>
        </div>
        <hr />
      </div>
      <div id="sb_dashboard"
        :style="{
          'background-color': dashboard_background_color,
          color: dashboard_color
        }"
              @click="go_to_dashboard"
      >
        <img v-if="sbdashboard" id="dashboard-icon" src="/dashboard.png" />
        <img v-if="!sbdashboard" id="dashboard-icon-white" src="/dashboard-white.png" />
        <p id="header-dashboard">
          Dashboard
        </p>
      </div>
      <div
        id="courses"
        :style="{
          'background-color': courses_background_color,
          color: courses_color
        }"
        @click="toggle_sidebar"
      >
        <img v-if="navbar_toggle || courses" id="courses-icon" src="/course.png" />
        <img
          v-if="!navbar_toggle && !courses"
          id="courses-icon-white"
          src="/course-white.png"
        />
        <p id="header-courses">
          All Courses
        </p>
      </div>
      <div
        id="assignments"
        :style="{
          'background-color': assignments_background_color,
          color: assignments_color
        }"
        @click="go_to_all_assignments"
      >
        <img v-if="assignments" id="assignment-icon" src="/assignment.png" />
        <img
          v-if="!assignments"
          id="assignment-icon-white"
          src="/assignment-white.png"
        />
        <p id="header-assignments">
          All Assignments
        </p>
      </div>
      <div
        id="groups"
        :style="{
          'background-color': groups_background_color,
          color: groups_colour
        }"
        @click="go_to_all_groups"
      >
        <img v-if="groups" id="group-icon" src="/group.png" />
        <img v-if="!groups" id="group-icon-white" src="/group-white.png" />
        <p id="header-groups"> All Groups</p>
      </div>
      <div
        id="grades"
        :style="{
          'background-color': grades_background_color,
          color: grades_color
        }"
        @click="go_to_all_grades"
      >
        <img v-if="grades" id="grade-icon" src="/grade.png" />
        <img v-if="!grades" id="grade-icon-white" src="/grade-white.png" />
        <p id="header-grades">All Grades</p>
      </div>
    </div>
    <div id="mySidenav" class="sidenav" v-bind:style="{ width: sidebar_width, padding: sidebar_padding }">
      <div id="sidebar-header">
        <a href="javascript:void(0)" class="closebtn" @click="toggle_sidebar">&times;</a>
        <p id="sidebar-title">Courses</p>
      </div>
      <hr id="sidebar-hr" />
      <div class="sidebar-course" v-for="c of enrolments" :key="c.key">
        <p class="sidebar-course-title" @click="go_to_course(c.id)">{{ c.title }}</p>
        <p class="sidebar-role">Student</p>
      </div>
      <div class="sidebar-course" v-for="c of taing" :key="c.key">
        <p class="sidebar-course-title" @click="go_to_course(c.id)">{{ c.title }}</p>
        <p class="sidebar-role">TA</p>
      </div>
      <div class="sidebar-course" v-for="c of instructing" :key="c.key">
        <p class="sidebar-course-title" @click="go_to_course(c.id)">{{ c.title }}</p>
        <p class="sidebar-role">Instructor</p>
      </div>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-console */
export default {
  name: 'Sidebar',
  props: {
    name: {
      type: String,
      default: ''
    },
    enrolments: {
      type: Array,
      default() { return [] }
    },
    taing: {
      type: Array,
      default() { return [] }
    },
    instructing: {
      type: Array,
      default() { return [] }
    }
  },
  data: function() {
    return {
      dashboard_background_color: '#0c2343',
      dashboard_color: 'white',
      courses_background_color: '#0c2343',
      courses_color: 'white',
      assignments_background_color: '#0c2343',
      assignments_color: 'white',
      assignments: false,
      groups_background_color: '#0c2343',
      groups_colour: 'white',
      groups: false,
      grades_background_color: '#0c2343',
      grades_color: 'white',
      grades: false,
      sbdashboard: false,
      courses: false,
      navbar_toggle: false,
      sidebar_width: '0px',
      sidebar_padding: '0px'
    }
  },
  mounted: function() {
    console.log(this.$route)
    this.calculate_colors()
  },
  methods: {
    go_to_dashboard() {
      this.$router.push('/edu/dashboard')
    },
    toggle_sidebar() {
      this.navbar_toggle = !this.navbar_toggle
      this.reset_colors()

      if (this.navbar_toggle) {
        this.sidebar_width = '350px'
        this.sidebar_padding = '20px 20px 0 20px'
        this.courses_background_color = 'white'
        this.courses_color = '#0c2343'
      } else {
        this.sidebar_width = '0'
        this.sidebar_padding = '0'
        this.courses_background_color = '#0c2343'
        this.courses_color = 'white'
        this.calculate_colors()
      }
    },
    reset_colors() {
      this.dashboard_background_color = '#0c2343'
      this.dashboard_color = 'white'
      this.sbdashboard = false
      this.courses_background_color= '#0c2343'
      this.courses_color = 'white'
      this.assignments_background_color = '#0c2343'
      this.assignments_color = 'white'
      this.assignments = false
      this.groups_background_color = '#0c2343'
      this.groups_colour = 'white'
      this.groups = false
      this.grades_background_color = '#0c2343'
      this.grades_color = 'white'
      this.grades = false
    },
    calculate_colors() {
      if (this.$route.fullPath.includes('dashboard')) {
        this.sbdashboard = true
        this.dashboard_background_color = 'white'
        this.dashboard_color = '#0c2343'
      }

      if (this.$route.fullPath.includes('courses')) {
        this.courses = true
        this.courses_background_color = 'white'
        this.courses_color = '#0c2343'
      }

      if (this.$route.fullPath.includes('all-assignments')) {
        this.assignments = true
        this.assignments_background_color = 'white'
        this.assignments_color = '#0c2343'
      }

      if (this.$route.fullPath.includes('all-groups')) {
        this.groups = true
        this.groups_background_color = 'white'
        this.groups_colour = '#0c2343'
      }

      if (this.$route.fullPath.includes('all-grades')) {
        this.grades = true
        this.grades_background_color = 'white'
        this.grades_color = '#0c2343'
      }
    },
    go_to_course(id) {
      this.$router.push(`/edu/courses/${id}`)
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

hr {
  border-top: 1px solid white;
}

p {
  margin: 0;
}

#sidebar {
  width: 100px;
  height: 100%;
  background-color: #0c2343;
  color: #0c2343;
}

#name-div {
  padding-top: 20px;
  text-align: center;
}

.logged-in-text {
  font-size: 0.875rem;
  color: white;
}

#dashboard-icon,
#dashboard-icon-white,
#courses-icon,
#courses-icon-white,
#assignment-icon,
#assignment-icon-white,
#group-icon,
#group-icon-white,
#grade-icon,
#grade-icon-white,
#logout-icon {
  width: 30px;
  margin-left: auto;
  margin-right: auto;
  display: block;
}

#header-dashboard,
#header-courses,
#header-assignments,
#header-groups,
#header-grades,
.header-logout {
  font-size: 0.875rem;
  text-align: center;
}

#sb_dashboard,
#courses,
#assignments,
#groups,
#grades,
#logout {
  margin-top: 50px;
  cursor: pointer;
  border-radius: 0 2px 2px 0;
  padding-top: 5px;
}

#grades {
  padding-bottom: 50px;
}

#sb_dashboard {
  margin-top: 20px;
}

#logout {
  margin-top: 20px;
}

.header-logout {
  color: white;
}

#sidebar-title {
  font-size: 1.875rem;
  color: #0c2343;
}

#sidebar-hr {
  border-top: 1px solid grey;
}

/* The side navigation menu */
.sidenav {
  height: 100%; /* 100% Full-height */
  width: 0; /* 0 width - change this with JavaScript */
  position: fixed; /* Stay in place */
  z-index: 1; /* Stay on top */
  top: 0; /* Stay at the top */
  left: 0;
  background-color: white; /* Black*/
  overflow-x: hidden; /* Disable horizontal scroll */
  /*padding-top: 20px; !* Place content 60px from the top *!*/
  /*padding-left: 20px;*/
  /*padding-right: 20px;*/
  transition: 0.25s; /* 0.5 second transition effect to slide in the sidenav */
  margin-left: 100px;
  box-shadow: 2px 0 5px -2px #888;
  overflow-y: auto;
}

/* The navigation menu links */
.sidenav a,
.sidebar-course-title {
  padding: 8px 8px 0 0;
  text-decoration: none;
  font-size: 1rem;
  color: #0c2343;
  display: block;
  transition: 0.3s;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* When you mouse over the navigation links, change their color */
.sidenav a:hover {
  color: #18579d;
}

.sidebar-course-title:hover {
  color: #18579d;
}

/* Position and style the close button (top right corner) */
.sidenav .closebtn {
  position: absolute;
  top: 0;
  right: 25px;
  font-size: 36px;
  margin-left: 50px;
}

.sidebar-role {
  font-size: 0.875rem;
  color: grey;
  margin-bottom: 8px;
}
</style>
