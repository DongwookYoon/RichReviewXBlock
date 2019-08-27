<template>
  <transition name="modal">
    <div class="modal-mask">
      <div class="modal-wrapper">
        <div class="modal-container">
          <div class="modal-header">
            Automatically Create Groups
          </div>
          <div class="modal-div">
            <p id="students-per-group-label">Students per group:</p>
            <input id="students-per-group-input" v-model="students_per_group" />
          </div>
          <div class="modal-footer">
            <div id="button-div">
              <p class="modal-continue-button" @click="save_rename()">
              Continue
              </p>
              <p class="modal-cancel-button" @click="close()">Cancel</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { EventBus } from '../plugins/event-bus'

export default {
  name: 'automatic-group-modal',
  data() {
    return {
      students_per_group: ''
    }
  },
  methods: {
    save_rename() {
      EventBus.$emit('save-automatically-create-groups', {
        students_per_group: this.students_per_group
      })
    },
    close() {
      EventBus.$emit('close-automatically-create-groups', {
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
  margin-top: 5vh;
}

.modal-footer {
  margin-top: 20px;
  padding: 0;
  margin-left: 5px;
}

#button-div {
  display: flex;
  float: right;
}

.modal-continue-button,
.modal-cancel-button {
  font-size: 1.5vh;
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
  width: 400px;
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
