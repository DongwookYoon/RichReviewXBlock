<template>
  <div class="container">
    <div v-for="s in strategies" :key="s.key" class="mb-2">
      <button
        :style="{ background: s.color }"
        class="login-button"
        @click="$auth.loginWith(s.key)"
      >
        Login with {{ s.name }}
      </button>
    </div>
    <img src="/img/CWL_login_button.png" @click="login_ubc" />
  </div>
</template>

<script>
/* eslint-disable require-await,no-console,prettier/prettier */

export default {
  name: 'Login',
  computed: {
    strategies: () => [{ key: 'google', name: 'Google', color: '#4284f4' }],
    redirect() {
      return (
        this.$route.query.redirect &&
        decodeURIComponent(this.$route.query.redirect)
      )
    },
    isCallback() {
      return Boolean(this.$route.query.callback)
    }
  },
  methods: {
    login_ubc() {
      window.open(`${window.location.origin}/education/login-ubc`, "_self")
    }
  }
}
</script>

<style scoped>
@import '../node_modules/bootstrap/dist/css/bootstrap.css';
</style>
