<template>
  <header>
    <div class="brand-name">
      <nuxt-link to="/">RichReview</nuxt-link>
    </div>

    <div
      class="drawer-toggle"
      role="button"
      @click="$store.dispatch('nav/toggleSidebar')"
    >
      <div class="bar"></div>
      <div class="bar"></div>
      <div class="bar"></div>
    </div>

    <div class="sidebar-links">
      <sidebar-links></sidebar-links>
    </div>
  </header>
</template>

<script>
import sidebarLinks from './sidebarLinks'

export default {
  components: { sidebarLinks }
}
</script>

<style scoped>
header {
  display: grid;
  grid-template: 60px / auto 1fr;
  align-items: center;
  background-color: #333;
}
.sidebar-links {
  justify-self: end;
}
.brand-name {
  margin: 0 10px;
  font-size: 1.3rem;
}
.brand-name a {
  text-decoration: none;
  color: white;
}
.drawer-toggle .bar {
  width: 90%;
  height: 2px;
  background-color: white;
}
.drawer-toggle {
  display: flex;
  justify-self: end;
  flex-direction: column;
  justify-content: space-around;
  height: 50%;
  width: 35px;
  padding-right: 16px;
  cursor: pointer;
}
@media (max-width: 767px) {
  header {
    padding: 0 16px;
  }
  header:nth-child {
    justify-self: end !important;
  }
  .sidebar-links {
    display: none;
  }
}
@media (min-width: 768px) {
  header {
    padding: 0 64px;
  }
  .sidebar-links {
    display: block;
  }
  .drawer-toggle {
    display: none;
  }
}
</style>
