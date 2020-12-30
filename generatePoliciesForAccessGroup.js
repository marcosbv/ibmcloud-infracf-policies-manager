const utils = require('./utils')
const accessGroupNames = process.argv.slice(2)

const accessGroups = utils.loadAccessGroups()
const users = utils.loadUsers()

for(const accessGroupName of accessGroupNames) {
    const accessGroupObj = accessGroups.get(accessGroupName)
    if(accessGroupObj == null) {
        console.error("Group not found: " + accessGroupName);
        process.exit(1);
    }
}

for(const accessGroupName of accessGroupNames) {
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
}
