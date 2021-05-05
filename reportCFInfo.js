const utils = require('./utils')

const orgInfo = utils.loadCFOrgsSpaces()


console.log(`Organization;Space;Role;User`)
for(const org of orgInfo) {
    const orgName = org.name
    for(const role of ['auditors','billing_managers','managers']) {
        const users = org[role]
        for(const user of users) {
            console.log(`${orgName};;${role};${user}`)
        }
    }

    for(const space of org.spaces) {
        const spaceName = space.name
        for(const role of ['auditors','developers','managers']) {
            const users = space[role]
            for(const user of users) {
                console.log(`${orgName};${spaceName};${role};${user}`)
            }
        }
    }
}