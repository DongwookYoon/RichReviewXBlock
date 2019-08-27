<template>
  <transition name="modal">
    <div class="modal-mask">
      <div class="modal-wrapper">
        <div class="modal-container">
          <div class="modal-header">
            Assignment Extensions
          </div>
          <div class="modal-div">
            <div id="student-list-div">
              <p id="student-header">Students</p>
              <hr class="modal-hr" />
              <p
                v-for="s in student_or_group_list"
                :key="s.key"
                class="student-or-group"
                :style="selected_user_key === s.key ? selected_style : default_style"
                @click="select_student(s.key, s.name)"
              >
                {{ s.name }}
              </p>
            </div>
            <div id="date-div">
              <p id="extension-header">Extension Date</p>
              <hr class="modal-hr" />
              <datetime
                v-if="selected_user_key !== ''"
                v-model="extension_date"
                class="extension-date"
                type="datetime"
                use12-hour
                title="Extension Date"
                placeholder="Select a date"
              ></datetime>
              <p v-if="selected_user_key !== '' && extension_date !== ''"
                 @click="add_extension"
                 id="add-extension-button">Add Extension</p>
            </div>
            <div id="extension-div">
              <p id="current-extension-header">Current Extensions</p>
              <hr class="modal-hr" />
              <div v-for="(e, index) in extensions" :key="e.key" class="extension">
                <p class="extension-name">{{ e.name }}</p>
                <datetime
                  v-model="e.date"
                  class="current-extension-date"
                  type="datetime"
                  use12-hour
                  title="Due Date"
                ></datetime>
                <p class="remove-extension-button" @click="remove_extension(index)">Remove</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <p class="modal-continue-button" @click="save_extensions">
              Save
            </p>
            <p class="modal-cancel-button" @click="close">Cancel</p>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { EventBus } from '../plugins/event-bus'
import { Datetime } from 'vue-datetime'

export default {
  name: 'assignment-extension-modal',
  components: {
    datetime: Datetime
  },
  props: {
    cur_student_or_group_list: {
      type: Array,
      default() { return [] }
    },
    cur_extensions: {
      type: Array,
      default() { return [] }
    }
  },
  data() {
    return {
      student_or_group_list: this.cur_student_or_group_list.slice(),
      extensions: this.cur_extensions.slice(),
      new_group_set_name: '',
      selected_user_key: '',
      selected_user_name: '',
      selected_style: { color: 'white', 'background-color': '#0c2343' },
      default_style: { color: '#0c2343', 'background-color': 'white' },
      extension_date: ''
    }
  },
  methods: {
    select_student(key, name) {
      this.selected_user_key = key
      this.selected_user_name = name
    },
    deselect_student() {
      this.selected_user_key = ''
      this.selected_user_name = ''
      this.extension_date = ''
    },
    add_extension() {
      if (
        this.selected_user_key === '' ||
        this.selected_user_name === '' ||
        this.extension_date === ''
      )
        return

      this.extensions.push({
        user: this.selected_user_key,
        date: this.extension_date,
        name: this.selected_user_name
      })

      this.student_or_group_list = this.student_or_group_list.filter(user => {
        return user.key !== this.selected_user_key
      })

      this.extensions = this.extensions.sort((a, b) => {
        return ('' + a.name).localeCompare(b.name)
      })

      this.deselect_student()
    },
    remove_extension(index) {
      let extension = this.extensions[index]
      this.student_or_group_list.push({
        key: extension.user,
        name: extension.name
      })
      this.extensions = this.extensions.filter(ex => {
        return ex.user !== extension.user
      })
      this.student_or_group_list = this.student_or_group_list.sort((a, b) => {
        return ('' + a.name).localeCompare(b.name)
      })
      this.deselect_student()
    },
    save_extensions() {
      EventBus.$emit('save-extensions', {
        extensions: this.extensions
      })
    },
    close() {
      EventBus.$emit('close-extensions', {
      })
    }
  }
}
</script>

<style scoped>
.modal-div,
.modal-footer {
  display: flex;
}

.modal-header {
  font-size: 2vh;
  color: white;
  background-color: #0c2343;
  text-align: center;
  height: auto;
  padding-top: 7px;
  padding-bottom: 7px;
}

.modal-div {
  margin-top: 1vh;
  margin-left: 10px;
  font-size: 1rem;
}

#student-list-div,
#date-div {
  margin-right: 40px;
  min-width: 210px;
}

#extension-div {
  min-width: 450px;
}

#student-header,
#extension-header,
#current-extension-header {
  margin: 0;
  color: #0c2343;
  font-size: 1rem;
}

.modal-hr {
  margin-top: 5px;
  margin-bottom: 5px;
}

.student-or-group {
  cursor: pointer;
}

.student-or-group,
.extension-name {
  max-width: 210px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.extension-name {
  color: #0c2343;
  margin-right: 10px;
}

.current-extension-date {
  margin-right: 10px;
}

.modal-footer {
  margin-top: 20px;
  padding: 0;
  margin-left: 5px;
}

.modal-continue-button,
.modal-cancel-button,
#add-extension-button,
.remove-extension-button {
  font-size: 0.75rem;
  color: white;
  background-color: #0c2343;
  border-radius: 0.5vh;
  padding-left: 0.5vw;
  padding-right: 0.5vw;
  margin-top: 0.33vh;
  margin-bottom: 0.33vh;
  cursor: pointer;
  margin-right: 5px
}

.modal-continue-button,
.modal-cancel-button {
  font-size: 1rem;
}

.remove-extension-button {
  max-height: 1.5rem;
}

#add-extension-button {
  display:inline-block;
  float: right;
  margin-top: 15px;
}

.extension {
  display: flex;
}

.modal-cancel-button {
  background-color: gray;
  color: white;
}

.modal-mask {
  position: fixed;
  z-index: 9998;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, .5);
  display: table;
  transition: opacity .3s ease;
}

.modal-wrapper {
  display: table-cell;
  vertical-align: middle;
}

.modal-container {
  width: 970px;
  margin: 0 auto;
  background-color: #fff;
  border-radius: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .33);
  transition: all .3s ease;
  font-family: Helvetica, Arial, sans-serif;
}

.modal-header h3 {
  margin-top: 0;
  color: #42b983;
}

/*
 * The following styles are auto-applied to elements with
 * transition="modal" when their visibility is toggled
 * by Vue.js.
 *
 * You can easily play with the modal transition by editing
 * these styles.
 */

.modal-enter {
  opacity: 0;
}

.modal-leave-active {
  opacity: 0;
}

.modal-enter .modal-container,
.modal-leave-active .modal-container {
  -webkit-transform: scale(1.1);
  transform: scale(1.1);
}
</style>
