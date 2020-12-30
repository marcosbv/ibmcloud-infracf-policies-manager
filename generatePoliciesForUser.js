const utils = require('./utils')

const email = process.argv[2]


utils.generateCommandsForUser(email)

console.log("# ************************* END-USER ********************")