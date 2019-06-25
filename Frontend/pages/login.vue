<template>
  <div class="container">
    <div v-for="s in strategies" :key="s.key" class="mb-2">
      <button
        block
        :style="{ background: s.color }"
        class="login-button"
        @click="$auth.loginWith(s.key)"
      >
        Login with {{ s.name }}
      </button>
    </div>
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
  }
}
</script>

<style scoped>
@import '../node_modules/bootstrap/dist/css/bootstrap.css';
</style>
