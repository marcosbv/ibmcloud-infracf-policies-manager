const utils = require('./utils')

const emails = process.argv.slice(2)

for(const email of emails) {
    utils.generateCommandsForUser(email)
}


console.log("# ************************* END-OF-SCRIPT ********************")