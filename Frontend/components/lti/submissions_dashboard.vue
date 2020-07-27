<template>
  <div id="submissions-dashboard">
    <div v-if="isGraderView" id="mute-panel">
      <button
        v-if="!muted"
        id="mute-all-button"
        title="Mute all instructor comments for this assignment. Students will not see comments in RichReview."
        @click="muteAllSubmissions"
      >
        Mute Comments
      </button>
      <button
        v-if="muted===true"
        id="unmute-all-button"
        title="Unmute all instructor comments for this assignment. Students will see comments in RichReview."
        @click="unmuteAllSubmissions"
      >
        Unmute Comments
      </button>
    </div>
  </div>
</template>

<script>
export default {

}
</script>

<style scoped>

</style>
