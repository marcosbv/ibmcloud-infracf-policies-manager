/**
 * Utilities for governance report
 */
let utils = {}


/**
 * Load users into a Map object
 */
utils.loadUsers = function() {
   let users = require("./data/users.json")
   let sl_users = require('./data/sl_users.json')

   let objects = new Map()
   for(let i=0;i<users.length;i++) {
       let user = users[i]

       let object = {}
       object.id = user.ibmUniqueId
       object.name = `${user.firstname} ${user.lastname}`
       object.email = user.userId
       object.sl_user = sl_users.filter(x => x.email == object.email)

       objects.set(object.email, object)

   }

   users = null;
   delete users
   return objects
}

/**
 * Load access groups with their members into a Map object
 */
utils.loadAccessGroups = function() {
    let groups = require("./data/groups.json")
    
    let objects = new Map()
    for(let i=0;i<groups.length;i++) {
           let group = groups[i]
    
           let object = {}
           object.id = group.id
           object.name = group.name

           // load members
           let memberList = []
           let memberObjList = require(`./data/${group.id}_members.json`)
           for(let j=0; j<memberObjList.members.length; j++) {
               memberList.push(memberObjList.members[j].iam_id)
           }

           object.members = memberList
           objects.set(object.name, object)
    }
    
    groups = null;
    delete groups
    return objects
}


utils.groupsUserBelongsTo = function(user, access_groups) {
   let id = user.id
   let access_groups_user_belongs = []
   
   access_groups.forEach(function (value, key) {
       if(value.members.includes(id)) {
           access_groups_user_belongs.push(value.name)
       }
   })

   return access_groups_user_belongs
}

utils.loadHardware = function () {
    const hardware = require('./data/hardware.json')
    const hardwareMap = new Map() 

    for(const hw of hardware) {
        hardwareMap.set(hw.hostname, hw)
    }

    return hardwareMap
    
}

utils.loadVirtualServers = function () {
    const vsi = require('./data/vsi.json')
    const vsiMap = new Map() 

    for(const hw of vsi) {
        vsiMap.set(hw.hostname, hw)
    }

    return vsiMap
    
}

utils.loadDevices = function() {
    const hardwareMap = this.loadHardware()
    const vsiMap = this.loadVirtualServers()

    let deviceList = []
    hardwareMap.forEach((x, key) => { 
       const obj = {
        name: x.hostname,
        id: x.id,
        domain: x.domain,
        type: 'hardware'
       } 
       deviceList.push(obj);
    })

    vsiMap.forEach((x, key) => { 
        const obj = {
            name: x.hostname,
            id: x.id,
            domain: x.domain,
            type: 'virtual_server'
        }
        deviceList.push(obj);
    })

    delete hardwareMap
    delete vsiMap

    let deviceMap = new Map()
    for (const device of deviceList) {
        const fullName = `${device.name}.${device.domain}`
        deviceMap.set(fullName, device)
    }

    return deviceMap
}
/**
 *  Extract format from program args. The format (--csv or --json) must be the first item in array.
 * @param args Args received from command-line
 * @returns an object with format and remaining arguments 
 */
utils.extractParameters = function(args) {

    let result = {}
    result.format = "stdout"
    result.args = []
    if(args.length > 1) {
       if(args.length > 2) {
           if(args[2].indexOf("--") == 0) {
               result.format = args[2].substring(2)
               result.args = args.slice(3)
           } else {
               result.args = args.slice(2)
           }
       } else {
           result.args = args.slice(2)
       }
    }

    return result
}

/**
 * Performs report output, according to format.
 * @param format   Report output format. Implemented values: stdout, csv
 * @param line     Line to send to console (only stdout)
 * @param csvArr   Array of strings to return into CSV output (it will be logged in Node console)
 */
utils.output = function(format, line, csvArr) {
    if(format == "stdout" && line.trim() != "") {
        console.log(line)
    }

    if(format == "csv") {
        // only non-empty arrays will be printed out. This is useful 
        // when normal stdout messages must be suppressed from file output.
        if(csvArr) {
            if(csvArr.length > 0) {
                console.log(csvArr.join(";"))
            }
        }
    }
}


utils.mergePermissionSet = function(permissionSet, permissions, accessGroup) {
    if(permissionSet.toLowerCase() == "none") {
        return;
    }

    const permissionSetFile = require('./permission_sets/' + permissionSet.toLowerCase()) 
    for(const permission of permissionSetFile) {
        const permissionKey = permission.keyName
        let found = false;
        for(const existent_permission of permissions) {
            if(existent_permission.keyName == permissionKey) {
                existent_permission.groups.push(accessGroup)
                found = true;
                break;
            }
        }

        if(!found) {
            permissions.push({
                keyName: permissionKey,
                groups: [ accessGroup ]
            })
        }
    }   
}

utils.mergePermissions = function(newPermissions, permissions, accessGroup) {
    for(const permissionKey of newPermissions) {
       
            let found = false
            for(const existent_permission of permissions) {
                if(existent_permission.keyName == permissionKey) {
                    existent_permission.groups.push(accessGroup)
                    found = true;
                    break;
                }
            }
    
            if(!found) {
                permissions.push({
                    keyName: permissionKey,
                    groups: [ accessGroup ]
                })
            }
          
    }
 
}

utils.mergeDevices = function(newDevices, devices, group) {

    for(const newDevice of newDevices) {
        let found = false
        for(const device of devices) {
            if(device.name == newDevice.name) {
                found = true
                device.groups.push(group)
                break;
            }
        }

        if(!found) {
           devices.push({
               name: newDevice.name,
               id: newDevice.id,
               type: newDevice.type,
               groups: [group]
           })
        }
    }
}

utils.diffFromSuperUser = function (permissions) {
    const diffPerms = []
    const superUserPerms = []

   this.mergePermissionSet("Super_User", superUserPerms, "nothing");
    const filteredPermissions = superUserPerms.filter(x => {
        for(const p of permissions) {
            if(p.keyName == x.keyName) {
                return false;
            }
        }

        return true
    })

    return filteredPermissions
}

utils.generateCommandsForUser = function (userEmail) {
    const usersMap = utils.loadUsers()
    const devicesMap = utils.loadDevices()
    const accessGroups = utils.loadAccessGroups()
    const policiesByAccessGroup = require('./policies/policies.json')
    const user = usersMap.get(userEmail)

    if(user==null) {
        console.log(`# IGNORED: user ${userEmail}\n\n`)
        return;
    }

    const groups = utils.groupsUserBelongsTo(user, accessGroups)

    let userPermissions = []
    let userDevices = []
    let deniedPermissions = []

    for (const group of groups) {

        const policyForThisGroup = policiesByAccessGroup.filter(x => x.accessGroup == group)
        if (policyForThisGroup.length > 0) {
            const permissionSet = policyForThisGroup[0].classicInfrastructurePermissions.permissionSet;
            if (permissionSet !== undefined) {
                utils.mergePermissionSet(permissionSet, userPermissions, group)
            }

            const permissions = policyForThisGroup[0].classicInfrastructurePermissions.permissions;
            if (permissions !== undefined) {
                utils.mergePermissions(permissions, userPermissions, group)
            }

            const deviceRules = policyForThisGroup[0].classicInfrastructurePermissions.devices;
            for (deviceRule of deviceRules) {
                let deviceList = []
                if (deviceRule.allDevices !== undefined && deviceRule.allDevices == "true") {
                    devicesMap.forEach((value) => {
                        deviceList.push(value)
                    })
                } else {
                    if (deviceRule.partialName !== undefined) {
                        devicesMap.forEach((value) => {
                            if (value.name.indexOf(deviceRule.partialName) >= 0) {
                                deviceList.push(value)
                            }
                        })
                    } else {
                        if (deviceRule.name !== undefined) {
                            const dev = devicesMap.get(deviceRule.name);
                            if (dev != null) {
                                deviceList.push(dev)
                            }
                        }
                    }
                }

                utils.mergeDevices(deviceList, userDevices, group);
            }

        }
    }

    deniedPermissions = utils.diffFromSuperUser(userPermissions);
    const hardwareDevices = userDevices.filter(x => x.type == 'hardware')
    const vsiDevices = userDevices.filter(x => x.type == 'virtual_server')

    console.log(`set -x \n######  User: ${userEmail} (${user.name})`)
    console.log(`###  ===> PERMISSIONS: `)

    for (const userPermission of userPermissions) {
        console.log(`# GRANT: Permission ${userPermission.keyName} (${userPermission.groups.join(",")})`)
    }

    console.log(`\nibmcloud sl call-api SoftLayer_User_Customer addBulkPortalPermission --init ${user.sl_user[0].id} --parameters '[${JSON.stringify(userPermissions.map(x => {
        return { keyName: x.keyName }
    }))}]' && echo ""`)

    console.log(`\nibmcloud sl call-api SoftLayer_User_Customer removeBulkPortalPermission --init ${user.sl_user[0].id} --parameters '[${JSON.stringify(deniedPermissions.map(x => {
        return { keyName: x.keyName }
    }))}]' && echo ""`)
    console.log(`###  ===> DEVICES: `)
    for (const device of userDevices) {
        console.log(`# GRANT access to ${device.name}  (${device.groups.join(',')})`)
    }

    console.log(`# REVOKE all access to devices`)
    console.log(`\nibmcloud sl call-api SoftLayer_User_Customer removeAllVirtualAccessForThisUser --init ${user.sl_user[0].id} && echo ""`)
    console.log(`\nibmcloud sl call-api SoftLayer_User_Customer removeAllHardwareAccessForThisUser --init ${user.sl_user[0].id} && echo ""`)

    console.log(`# ADD all devices`)
    console.log(`\nibmcloud sl call-api SoftLayer_User_Customer addBulkVirtualGuestAccess --init ${user.sl_user[0].id} --parameters "[[${vsiDevices.map(x => parseInt(x.id))}]]" && echo ""`)
    console.log(`\nibmcloud sl call-api SoftLayer_User_Customer addBulkHardwareAccess --init ${user.sl_user[0].id} --parameters "[[${hardwareDevices.map(x => parseInt(x.id))}]]" && echo ""`)

}

module.exports = utils