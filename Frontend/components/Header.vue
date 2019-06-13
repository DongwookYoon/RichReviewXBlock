<template>
  <header id="header">
    <!-- Logo design by Allison Chiang: acchiang98@gmail.com -->
    <img id="logo" src="/logo.png" @click="go_to_dashboard" />
    <p id="header-dashboard" @click="go_to_dashboard">Dashboard</p>
    <p id="header-courses">Courses</p>
    <p id="header-assignments">Assignments</p>
    <p id="header-groups">Groups</p>
    <p id="header-grades">Grades</p>
    <p id="header-logout" @click="logout">Logout</p>
  </header>
</template>

<script>
export default {
  name: 'Header',
  methods: {
    go_to_dashboard() {
      this.$router.push('/dashboard')
    },
    async logout() {
      await this.$auth.logout()
      this.$router.push('/')
    }
  }
}
</script>

<style scoped>
#header-dashboard,
#header-courses,
#header-assignments,
#header-groups,
#header-grades,
#header-logout {
  width: 14%;
  font-size: 3.25vh;
  display: table-cell;
  vertical-align: middle;
}

#logo {
  display: table-cell;
  vertical-align: middle;
  text-align: left;
  padding-left: 5%;
  height: 5vh;
}

#header {
  width: 100%;
  background-color: white;
  color: #0c2343;
  text-align: center;
  display: table;
  min-height: 5vh;
  margin-top: 1vh;
}
</style>
