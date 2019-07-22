/* eslint-disable no-use-before-define,camelcase,no-console */
/**
 *
 * Created by Colin / Dongwook
 */

const path = require('path')
const fs = require('fs')

exports.walkSync = (dir, filelist) => {
  const files = fs.readdirSync(dir)
  filelist = filelist || []
  files.forEach(function(item) {
    const item_path = path.join(dir, item)
    if (fs.statSync(item_path).isDirectory()) {
      filelist = exports.walkSync(item_path, filelist)
    } else {
      filelist.push(item_path)
    }
  })
  return filelist
}

exports.getWebAppUrls = function(start_path, prefix, exclude) {
  const filelist = []
  const full_start_path = path.join(__dirname, '../..', start_path)
  exports.walkSync(full_start_path, filelist)
  filelist.forEach(function(file, i) {
    filelist[i] = file.substring(full_start_path.length + 1)
  })
  const urls = {}
  filelist.forEach(function(file, i) {
    if (file.match(exclude) === null) {
      urls[file] = prefix + file
    }
  })
  for (const key in urls) {
    console.log(key + ' : ' + urls[key])
  }
  return urls
}
