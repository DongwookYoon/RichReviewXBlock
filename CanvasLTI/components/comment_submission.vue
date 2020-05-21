<template>

</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class CommentSubmission extends Vue {

  @Prop({ type: Boolean, required: true }) readonly submitted !: Boolean;
}

</script>

<style scoped>

</style>
