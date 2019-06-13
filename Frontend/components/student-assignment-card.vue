<template>
  <div class="assignment-card" @click="go_to_assignment(link)">
    <p class="assignment-title">
      {{ title }}
    </p>
    <p class="assignment-status">
      {{
        submission.submission_status === 'Graded'
          ? `${submission.mark} / ${points}`
          : submission.submission_status
      }}
    </p>
    <p class="assignment-group-assignment">{{ group_assignment }}</p>
    <p v-if="due_date !== ''" class="assignment-due">
      {{ format_date(due_date) }}
    </p>
    <p v-if="due_date === ''" class="assignment-due-empty">
      -
    </p>
  </div>
</template>

<script>
/* eslint-disable vue/prop-name-casing */

export default {
  name: 'StudentAssignmentCard',
  props: {
    title: {
      type: String,
      default: ''
    },
    points: {
      type: Number,
      default: 0
    },
    submission: {
      type: Object,
      default: () => {
        return {}
      }
    },
    late: {
      type: Boolean,
      default: false
    },
    group_assignment: {
      type: String,
      default: ''
    },
    due_date: {
      type: String,
      default: ''
    },
    link: {
      type: String,
      default: ''
    }
  },
  methods: {
    go_to_assignment(link) {
      this.$router.push(`${link}`)
    }
  }
}
</script>

<style scoped>
.assignment-card {
  display: grid;
  grid-template-columns: 22vw 18vw 12vw 17vw;
  font-size: 2.5vh;
  grid-column-gap: 3vw;
}

.assignment-title {
  max-height: 4vh;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.assignment-due-empty {
  padding-left: 4vw;
}
</style>
