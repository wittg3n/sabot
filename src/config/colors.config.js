var colors = require('colors');

colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'bgCyan',
  prompt: 'bgGrey',
  info: 'bgGreen',
  data: 'bgGrey',
  help: 'bgCyan',
  warn: 'bgYellow',
  debug: 'bgBlue',
  error: 'bgRed'
});

module.exports = colors;