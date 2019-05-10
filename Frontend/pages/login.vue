<template>
  <div>
    <b-row align-h="center" align-v="center">
      <b-col md="4" class="text-center pt-4">
        <b-card title="Login" bg-variant="light">
          <div v-for="s in strategies" :key="s.key" class="mb-2">
            <b-btn
              block
              :style="{ background: s.color }"
              class="login-button"
              @click="$auth.loginWith(s.key)"
              >Login with {{ s.name }}</b-btn
            >
          </div>
        </b-card>
      </b-col>
    </b-row>
  </div>
</template>

<style scoped>
.text-center {
  alignment: center;
}
</style>

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
