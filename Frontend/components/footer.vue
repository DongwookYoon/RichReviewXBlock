<template>
  <footer id="footer">
    <p id="footer-title" @click="go_to_dashboard">RichReview</p>
    <p id="footer-copyright">© Dongwook Yoon</p>
    <p id="footer-about">About</p>
  </footer>
</template>

<script>
export default {
  name: 'Footer',
  methods: {
    go_to_dashboard() {
      this.$router.push('/dashboard')
    }
  }
}
</script>

<style scoped>
@import '../node_modules/bootstrap/dist/css/bootstrap.css';

#footer-title,
#footer-copyright,
#footer-about {
  width: 33%;
  font-size: 1.75vh;
  display: table-cell;
  vertical-align: middle;
}

#footer-title {
  text-align: left;
  padding-left: 1vw;
  cursor: pointer;
}

#footer-about {
  text-align: right;
  padding-right: 1vw;
}

#footer {
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100%;
  background-color: #0c2343;
  color: white;
  text-align: center;
  display: table;
  min-height: 4vh;
}
</style>
