const utils = require('./utils')
const accessGroupName = process.argv[2]

const accessGroups = utils.loadAccessGroups()
const users = utils.loadUsers()

const accessGroupObj = accessGroups.get(accessGroupName)

for(const member of accessGroupObj.members) {
    users.forEach((user) => {
       
        if(user.id == member) {
            if(user.name != "diti.osn@bradesco.com.br" && user.name != "marcos.viera@gmail.com") {
                utils.generateCommandsForUser(user.email);
            }
        }
    })
    
}