/* eslint-disable camelcase */
/* camelcase */
import Vue from 'vue'

Vue.mixin({
  methods: {
    formate_date: date_string => {
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec'
      ]

      const date = new Date(date_string)
      const month = months[date.getMonth()]
      const day = date.getDate()
      const hour = date.getHours() > 12 ? date.getHours() - 12 : date.getHours()
      const minutes = ('0' + date.getMinutes()).slice(-2)
      const am_pm = date.getHours() >= 12 ? 'pm' : 'am'

      return `${month} ${day} at ${hour}:${minutes}${am_pm}`
    }
  }
})
