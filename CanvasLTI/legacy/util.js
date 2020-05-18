/* eslint-disable no-console */
const moment = require('moment')

const d = () => {
  return moment().format('YY-MM-DD HH:mm:ss')
}

/**
 * I can disable statements using `process.env.NODE_ENV` variable
 */

exports.debug = function(stmt) {
  console.log('[' + d() + ']<DEBUG>: ' + stmt)
}

exports.start = function(stmt) {
  console.log('[' + d() + '] ' + stmt)
}

exports.error = function(err) {
  if (err instanceof Error) {
    err = `${err.code}: ${err.message}`
  }
  console.error('[' + d() + ']<ERR>: ' + err)
}

exports.logger = function(type, stmt) {
  console.log('[' + d() + ']<' + type + '>: ' + stmt)
}

exports.printer = function(type, stmt) {
  console.log('<' + type + '>: ' + stmt)
}

exports.print = function(s, stmt) {
  console.log(stmt ? `<${s}>: ${stmt}` : s)
}

exports.test = {
  log: stmt => {
    console.log('<TEST>: ' + stmt)
  },
  error: err => {
    if (err instanceof Error) {
      err = `${err.code}: ${err.message}`
    }
    console.log('<ERR>: ' + err)
  }
}

exports.testl = function(stmt) {
  console.log('<TEST>: ' + stmt)
}

exports.teste = function(err) {
  if (err instanceof Error) {
    err = `${err.code}: ${err.message}`
  }
  console.log('<ERR>: ' + err)
}

exports.isString = function(str) {
  return Object.prototype.toString.call(str) === '[object String]'
}
