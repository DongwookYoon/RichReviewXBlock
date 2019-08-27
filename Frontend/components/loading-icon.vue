<template lang="html">
  <div class="loading-page" v-if="loading">
    <loading :active.sync="loading"
             :is-full-page="true"
             color="#0c2343"></loading>
    </div>
</template>

<script>
import Loading from 'vue-loading-overlay';
import 'vue-loading-overlay/dist/vue-loading.css';

export default {
  components: {
    Loading
  },
  data: () => ({
    loading: false
  }),
  methods: {
    start() {
      this.loading = true
    },
    finish() {
      this.loading = false
    }
  }
}
</script>
