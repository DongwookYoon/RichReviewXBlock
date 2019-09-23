<template>
  <header id="header">
    <!-- Logo design by Allison Chiang: acchiang98@gmail.com -->
    <img id="logo" src="/logo.png" @click="go_to_dashboard" />
    <p id="header-dashboard" @click="go_to_dashboard">Dashboard</p>
    <p id="header-assignments" @click="go_to_all_assignments">Assignments</p>
    <p id="header-groups" @click="go_to_all_groups">Groups</p>
    <p id="header-grades" @click="go_to_all_grades">Grades</p>
    <p id="header-logout" @click="logout">Logout</p>
  </header>
</template>

<script>
export default {
  name: 'Header',
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

<style scoped>

#header-dashboard,
#header-assignments,
#header-groups,
#header-grades,
#header-logout {
  width: 18%;
  font-size: 3.25vh;
  display: table-cell;
  vertical-align: middle;
  cursor: pointer;
}

#logo {
  display: table-cell;
  vertical-align: middle;
  text-align: left;
  padding-left: 5%;
  height: 5vh;
  cursor: pointer;
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
