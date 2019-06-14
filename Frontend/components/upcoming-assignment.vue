<template>
  <div class="upcoming-assignment" @click="go_to_assignment(link)">
    <img
      v-if="status === 'Not Submitted'"
      class="assignment-incomplete-icon"
      src="https://img.icons8.com/windows/32/000000/checkmark.png"
    />
    <img
      v-if="status !== 'Not Submitted'"
      class="assignment-incomplete-icon"
      src="https://img.icons8.com/color/32/000000/checkmark.png"
    />
    <img
      v-if="late"
      class="late-icon"
      src="https://user-images.githubusercontent.com/8848445/53503929-50290a00-3ab1-11e9-8eed-019515c8cfa9.png"
    />
    <p class="assignment-title">{{ title }}</p>
  </div>
</template>

<script>
export default {
  name: 'UpcomingAssignment',
  props: {
    title: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      default: 'Not Submitted'
    },
    late: {
      type: Boolean,
      default: false
    },
    link: {
      type: String,
      default: ''
    }
  },
  go_to_assignment(link) {
    this.$router.push(`${link}`)
  }
}
</script>

<style scoped>
.assignment-incomplete-icon,
.assignment-title {
  margin: 0;
}

.assignment-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.assignment-incomplete-icon,
.late-icon {
  width: 32px;
  height: 32px;
  margin-right: 2px;
}

.upcoming-assignment {
  cursor: pointer;
  display: flex;
  align-items: center;
  margin-right: 50px;
}
</style>
