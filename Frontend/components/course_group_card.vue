<template>
  <div v-if="!deleted" class="course_group_card">
    <div class="group-options">
      <p v-if="!renaming" class="active-group">
        {{ group_name }}
      </p>
      <input v-if="renaming" v-model="group_name" class="active-group" />
      <p v-if="!renaming" class="rename-button" @click="rename">Rename</p>
      <p v-if="renaming" class="rename-button" @click="save_rename">Save</p>
      <p class="delete-button" @click="delete_group">Delete</p>
    </div>
    <div v-if="expanded">
      <draggable
        class="group-draggable"
        :list="members"
        group="people"
        @add="expand"
      >
        <div v-for="u in members" :key="u.key" class="group-member">
          {{ u.name }}
        </div>
      </draggable>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-console,vue/prop-name-casing */
import draggable from 'vuedraggable'
import { EventBus } from '../plugins/event-bus'

export default {
  name: 'CourseGroupCard',
  components: { draggable },
  props: {
    passed_name: {
      type: String,
      default: ''
    },
    members: {
      type: Array,
      default: () => {
        return []
      }
    },
    inactive: {
      type: Boolean,
      default: false
    },
    id: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      group_name: this.passed_name,
      expanded: false,
      renaming: false,
      deleted: false
    }
  },
  methods: {
    change_expand() {
      this.expanded = !this.expanded
    },
    expand() {
      this.expanded = true
    },
    rename() {
      this.renaming = true
    },
    save_rename() {
      EventBus.$emit('rename-group', {
        name: this.group_name,
        id: this.id
      })
      this.renaming = false
    },
    delete_group() {
      this.deleted = true
      EventBus.$emit('delete-group', {
        members: this.members,
        inactive: this.inactive,
        id: this.id
      })
    },
    get_data() {
      return {
        group_name: this.group_name,
        members: this.members,
        deleted: this.deleted
      }
    }
  }
}
</script>

<style scoped>

p {
  margin: 0;
}

.course_group_card:hover {
  background-color: #f5f5f5;
}

.course_group_card {
  cursor: pointer;
}

.group-options {
  display: flex;
}

.active-group {
  font-size: 2vh;
  padding-top: 0.5vh;
  padding-bottom: 0.5vh;
  color: #0c2343;
}

.rename-button,
.delete-button {
  font-size: 1.5vh;
  color: white;
  background-color: #0c2343;
  border-radius: 0.5vh;
  padding-left: 0.5vw;
  padding-right: 0.5vw;
  margin-top: 0.33vh;
  margin-bottom: 0.33vh;
  cursor: pointer;
}

.active-group {
  width: 25vw;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rename-button {
  margin-right: 2vw;
}

.group-draggable {
  display: block;
  width: 100%;
  min-height: 5vh;
  border: 1px solid #0c2343;
  border-radius: 0.5vh;
}

.group-member {
  font-size: 2vh;
  padding-top: 0.5vh;
  padding-bottom: 0.5vh;
  padding-left: 1vw;
  color: #0c2343;
}
</style>
