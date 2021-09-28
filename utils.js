/**
 * Utilities for governance report
 */
let utils = {}

const fs = require('fs');

/**
 * Load users into a Map object
 */
utils.loadUsers = function () {
    let users = require("./data/users.json")
    let sl_users = require('./data/sl_users.json')

    let objects = new Map()
    for (let i = 0; i < users.length; i++) {
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
utils.loadAccessGroups = function () {
    let groups = require("./data/groups.json")

    let objects = new Map()
    for (let i = 0; i < groups.length; i++) {
        let group = groups[i]

        let object = {}
        object.id = group.id
        object.name = group.name

        // load members
        let memberList = []
        let memberObjList = require(`./data/${group.id}_members.json`)
        for (let j = 0; j < memberObjList.members.length; j++) {
            memberList.push(memberObjList.members[j].iam_id)
        }

        object.members = memberList
        objects.set(object.name, object)
    }

    groups = null;
    delete groups
    return objects
}


utils.groupsUserBelongsTo = function (user, access_groups) {
    let id = user.id
    let access_groups_user_belongs = []

    access_groups.forEach(function (value, key) {
        if (value.members.includes(id)) {
            access_groups_user_belongs.push(value.name)
        }
    })

    return access_groups_user_belongs
}

utils.loadHardware = function () {
    const hardware = require('./data/hardware.json')
    const hardwareMap = new Map()

    for (const hw of hardware) {
        hardwareMap.set(hw.hostname, hw)
    }

    return hardwareMap

}

utils.loadVirtualServers = function () {
    const vsi = require('./data/vsi.json')
    const vsiMap = new Map()

    for (const hw of vsi) {
        vsiMap.set(hw.hostname, hw)
    }

    return vsiMap

}

utils.loadDevices = function () {
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

utils.loadCFOrgsSpaces = function () {
    const orgs = require('./data/organizations.json')
    const spaces = require('./data/spaces.json')
    const users = require('./data/users.json')

    const cfOrgs = []

    for (const org of orgs.resources) {
        const uuid = org.metadata.guid
        const name = org.entity.name
        const managers_file = require(`./data/org_${uuid}_managers.json`)
        const auditors_file = require(`./data/org_${uuid}_auditors.json`)
        const billing_managers_file = require(`./data/org_${uuid}_billing_managers.json`)

        const managers = managers_file.resources.map(x => {
            const m = users.filter(y => y.uaaGuid == x.metadata.guid)
            if (m.length > 0) {
                return m[0].email
            } else {
                return x.guid
            }
        })

        const billing_managers = billing_managers_file.resources.map(x => {
            const m = users.filter(y => y.uaaGuid == x.metadata.guid)
            if (m.length > 0) {
                return m[0].email
            } else {
                return x.guid
            }
        })

        const auditors = auditors_file.resources.map(x => {
            const m = users.filter(y => y.uaaGuid == x.metadata.guid)
            if (m.length > 0) {
                return m[0].email
            } else {
                return x.guid
            }
        })

        cfOrgs.push({
            name: name,
            uuid: uuid,
            managers: managers,
            auditors: auditors,
            billing_managers: billing_managers,
            spaces: []
        })
    }

    for (const space of spaces.resources) {
        const uuid = space.metadata.guid
        const name = space.entity.name
        const org_id = space.entity.organization_guid
        const managers_file = require(`./data/space_${uuid}_managers.json`)
        const auditors_file = require(`./data/space_${uuid}_auditors.json`)
        const developers_file = require(`./data/space_${uuid}_developers.json`)

        const orgObj = cfOrgs.filter(x => {
            return x.uuid == org_id
        })


        const managers = managers_file.resources.map(x => {
            const m = users.filter(y => y.uaaGuid == x.metadata.guid)
            if (m.length > 0) {
                return m[0].email
            } else {
                return x.guid
            }
        })

        const developers = developers_file.resources.map(x => {
            const m = users.filter(y => y.uaaGuid == x.metadata.guid)
            if (m.length > 0) {
                return m[0].email
            } else {
                return x.guid
            }
        })

        const auditors = auditors_file.resources.map(x => {
            const m = users.filter(y => y.uaaGuid == x.metadata.guid)
            if (m.length > 0) {
                return m[0].email
            } else {
                return x.guid
            }
        })

        if (orgObj.length > 0) {
            orgObj[0].spaces.push({
                name: name,
                uuid: uuid,
                managers: managers,
                auditors: auditors,
                developers: developers
            })
        }

    }

    return cfOrgs
}
/**
 *  Extract format from program args. The format (--csv or --json) must be the first item in array.
 * @param args Args received from command-line
 * @returns an object with format and remaining arguments 
 */
utils.extractParameters = function (args) {

    let result = {}
    result.format = "stdout"
    result.args = []
    if (args.length > 1) {
        if (args.length > 2) {
            if (args[2].indexOf("--") == 0) {
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
utils.output = function (format, line, csvArr) {
    if (format == "stdout" && line.trim() != "") {
        console.log(line)
    }

    if (format == "csv") {
        // only non-empty arrays will be printed out. This is useful 
        // when normal stdout messages must be suppressed from file output.
        if (csvArr) {
            if (csvArr.length > 0) {
                console.log(csvArr.join(";"))
            }
        }
    }
}

utils.mergePermissionSet = function (permissionSet, permissions, accessGroup) {
    if (permissionSet.toLowerCase() == "none") {
        return;
    }

    const permissionSetFile = require('./permission_sets/' + permissionSet.toLowerCase())
    for (const permission of permissionSetFile) {
        const permissionKey = permission.keyName
        let found = false;
        for (const existent_permission of permissions) {
            if (existent_permission.keyName == permissionKey) {
                existent_permission.groups.push(accessGroup)
                found = true;
                break;
            }
        }

        if (!found) {
            permissions.push({
                keyName: permissionKey,
                groups: [accessGroup]
            })
        }
    }
}

utils.mergePermissions = function (newPermissions, permissions, accessGroup) {
    for (const permissionKey of newPermissions) {

        let found = false
        for (const existent_permission of permissions) {
            if (existent_permission.keyName == permissionKey) {
                existent_permission.groups.push(accessGroup)
                found = true;
                break;
            }
        }

        if (!found) {
            permissions.push({
                keyName: permissionKey,
                groups: [accessGroup]
            })
        }

    }

}

utils.mergeDevices = function (newDevices, devices, group) {

    for (const newDevice of newDevices) {
        let found = false
        for (const device of devices) {
            if (device.name == newDevice.name) {
                found = true
                device.groups.push(group)
                break;
            }
        }

        if (!found) {
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
        for (const p of permissions) {
            if (p.keyName == x.keyName) {
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
    const policiesByAccessGroup = utils.loadJSONPolicies()
    const user = usersMap.get(userEmail)

    if (user == null) {
        console.log(`# IGNORED: user ${userEmail}\n\n`)
        return;
    }

    const groups = utils.groupsUserBelongsTo(user, accessGroups)

    let userPermissions = []
    let userDevices = []
    let deniedPermissions = []

    let vpnAccess = "false"

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

            if (policyForThisGroup[0].classicInfrastructurePermissions.vpnAccess == "true") {
                vpnAccess = "true"
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

    console.log(`# VPN OPTION`)
    console.log(`\nibmcloud sl call-api SoftLayer_User_Customer editObject --init ${user.sl_user[0].id} --parameters '[{"sslVpnAllowedFlag" : ${vpnAccess}}]' && echo ""`)

}

utils.loadCFPoliciesForUser = function (cfOrgs, email) {

    const orgsWithUser = cfOrgs.filter(org => {
        const isManager = org.managers.indexOf(email) >= 0;
        const isBillingManager = org.billing_managers.indexOf(email) >= 0;
        const isAuditor = org.auditors.indexOf(email) >= 0;

        if (isManager || isBillingManager || isAuditor) {
            return true;
        }

        for (const space of org.spaces) {
            const isDeveloper = space.developers.indexOf(email) >= 0
            const isSpaceAuditor = space.auditors.indexOf(email) >= 0
            const isSpaceManager = space.managers.indexOf(email) >= 0

            if (isDeveloper || isSpaceAuditor || isSpaceManager) {
                return true
            }
        }

        return false
    })

    const returnedObj = orgsWithUser.map(org => {
        const isManager = org.managers.indexOf(email) >= 0
        const isBillingManager = org.billing_managers.indexOf(email) >= 0
        const isAuditor = org.auditors.indexOf(email) >= 0

        let spaces = []
        for (const space of org.spaces) {

            const isDeveloper = space.developers.indexOf(email) >= 0
            const isSpaceAuditor = space.auditors.indexOf(email) >= 0
            const isSpaceManager = space.managers.indexOf(email) >= 0

            if (isDeveloper || isSpaceAuditor || isSpaceManager) {
                spaces.push({
                    name: space.name,
                    developer: isDeveloper,
                    manager: isSpaceManager,
                    auditor: isSpaceAuditor
                })
            }
        }

        return {
            name: org.name,
            manager: isManager,
            billing_manager: isBillingManager,
            auditor: isAuditor,
            spaces: spaces
        }
    })

    return {
        user: email,
        orgs: returnedObj
    }
}

utils.loadJSONPolicies = function() {
    const policiesFolderFiles = fs.readdirSync('./policies');
    let policies = []
    for(const file of policiesFolderFiles) {
        if(file.indexOf('.json') >= file.length - 5) {
            const p = require(`./policies/${file}`);
            if(p.accessGroup) {
                policies.push(p);
            } else {
                policies = policies.concat(p);
            }
           
        }
    }

    return policies;

}
utils.loadCFPolicyRules = function (cfOrgs) {
    //const policies = require('./policies/policies.json')

    const policies = utils.loadJSONPolicies();

    const expandedPolicies = []

    for (const policy of policies) {
        const expandedPolicy = {
            accessGroup: policy.accessGroup,
            cloudFoundryPermissions: {}
        }
        const cfPermissions = policy.cloudFoundryPermissions

        if (cfPermissions === undefined) {
            continue;
        }

        const orgs = []
        for (const cfOrg of cfOrgs) {
           
            for (const orgPermissionRule of cfPermissions.orgs) {
                let found = false;
                if (orgPermissionRule.allOrgs && orgPermissionRule.allOrgs == "true") {
                    found = true
                }

                if (orgPermissionRule.partialName) {
                    if (orgPermissionRule.partialName.indexOf(cfOrg.name) >= 0) {
                        found = true
                    }
                }

                if (orgPermissionRule.name) {
                    if (orgPermissionRule.name == cfOrg.name) {
                        found = true
                    }
                }

                if (found) {
                    const org = {
                        name: cfOrg.name,
                        manager: orgPermissionRule.manager || false,
                        billing_manager: orgPermissionRule.billing_manager || false,
                        auditor: orgPermissionRule.auditor || false,
                        spaces: []
                    }
                    if (orgPermissionRule.spaces) {

                        for (const space of cfOrg.spaces) {
                            let foundSpace = false
                            for (const spacePermissionRule of orgPermissionRule.spaces) {
                                if (spacePermissionRule.allSpaces && spacePermissionRule.allSpaces == "true") {
                                    foundSpace = true
                                }

                                if (spacePermissionRule.partialName) {
                                    if (spacePermissionRule.partialName.indexOf(space.name) >= 0) {
                                        foundSpace = true
                                    }
                                }

                                if (spacePermissionRule.name) {
                                    if (spacePermissionRule.name == space.name) {
                                        foundSpace = true
                                    }
                                }

                                if (foundSpace) {
                                    org.spaces.push({
                                        name: space.name,
                                        manager: spacePermissionRule.manager || false,
                                        developer: spacePermissionRule.developer || false,
                                        auditor: spacePermissionRule.auditor || false
                                    })
                                }
                            }


                        }

                    }

                    orgs.push(org)
                }
            }
        }
        expandedPolicy.cloudFoundryPermissions = {
            orgs: orgs
        }

        expandedPolicies.push(expandedPolicy)

    }

    return expandedPolicies
}

utils.generateCFCommandsForUser = function (email) {
    const usersMap = utils.loadUsers()
    const accessGroups = utils.loadAccessGroups()
    const cfOrgs = utils.loadCFOrgsSpaces()
    const policiesRules = utils.loadCFPolicyRules(cfOrgs)

    const user = usersMap.get(email)

    if (user == null) {
        console.log('# IGNORED ' + user)
        return
    }

    let policiesToApplyMap = new Map()

    const groupsUserBelongsTo = utils.groupsUserBelongsTo(user, accessGroups)
    const policiesForUser = utils.loadCFPoliciesForUser(cfOrgs, email)

    console.log(`\n\n### User: ${email} (${user.name})`)
    console.log(`### Groups User Belongs To: ${groupsUserBelongsTo}`)

    for (const group of groupsUserBelongsTo) {
        const policyToApply = policiesRules.filter(policyRule => policyRule.accessGroup == group)
        if (policyToApply.length > 0) {
            const policy = policyToApply[0]
            for (const org of policy.cloudFoundryPermissions.orgs) {
                let mapItem = policiesToApplyMap.get(org.name)
                if (mapItem == null) {
                    mapItem = {
                        name: org.name,
                        billing_manager: { value: false, groups: [] },
                        manager: { value: false, groups: [] },
                        auditor: { value: false, groups: [] },
                        spaces: new Map(),
                    }

                    policiesToApplyMap.set(org.name, mapItem)
                }

                if (org.auditor) {
                    mapItem.auditor.groups.push(group)
                    mapItem.auditor.value = (org.auditor || mapItem.auditor.value)
                }

                if (org.manager) {
                    mapItem.manager.groups.push(group)
                    mapItem.manager.value = (org.manager || mapItem.manager.value)
                }

                if (org.billing_manager) {
                    mapItem.billing_manager.groups.push(group)
                    mapItem.billing_manager.value = (org.billing_manager || mapItem.billing_manager.value)
                }

                for (const space of org.spaces) {
                    let spaceMapItem = mapItem.spaces.get(space.name)
                    if (spaceMapItem == null) {
                        spaceMapItem = {
                            name: space.name,
                            manager: { value: false, groups: [] },
                            auditor: { value: false, groups: [] },
                            developer: { value: false, groups: [] }
                        }

                        mapItem.spaces.set(space.name, spaceMapItem)
                    }

                    if (space.auditor) {
                        spaceMapItem.auditor.groups.push(group)
                        spaceMapItem.auditor.value = (space.auditor || spaceMapItem.auditor.value)
                    }

                    if (space.manager) {
                        spaceMapItem.manager.groups.push(group)
                        spaceMapItem.manager.value = (space.manager || spaceMapItem.manager.value)
                    }

                    if (space.developer) {
                        spaceMapItem.developer.groups.push(group)
                        spaceMapItem.developer.value = (space.developer || spaceMapItem.developer.value)
                    }

                }

            }
        }
    }

   // console.log(policiesToApplyMap)
    policiesToApplyMap.forEach((value, key) => {
        console.log(`\n# CF Org: ${key}`)
        const userPolicies = policiesForUser.orgs.filter(x => x.name == key)
        
      //  console.log(JSON.stringify(userPolicies))
        if(userPolicies.length > 0) {
            console.log(`# ACTION: MERGE ORG POLICIES`)
            const up = userPolicies[0]
            console.log(`# Auditor: ${value.auditor.value} (${value.auditor.groups.join(",")})`)
            if(up.auditor != value.auditor.value) {
                console.log(`ibmcloud account org-role-${value.auditor.value == true ? "set" : "unset"} ${email} ${key} OrgAuditor`)
            }

            console.log(`# Manager: ${value.manager.value} (${value.manager.groups.join(",")})`)
            if(up.manager != value.manager.value) {
                console.log(`ibmcloud account org-role-${value.manager.value == true ? "set" : "unset"} ${email} ${key} OrgManager`)
            }

            console.log(`# Billing Manager: ${value.billing_manager.value} (${value.billing_manager.groups.join(",")})`)
            if(up.billing_manager != value.billing_manager.value) {
                console.log(`ibmcloud account org-role-${value.billing_manager.value == true ? "set" : "unset"} ${email} ${key} BillingManager`)
            }

            value.spaces.forEach((val, key2) => {
                console.log(`\n# Space: ${key2}`)
                const spacePolicies = userPolicies[0].spaces.filter(x => x.name == key2) 
            //    console.log(val)
            //    console.log(spacePolicies)
                if(spacePolicies.length > 0) {
                    console.log(`# ACTION: MERGE SPACE POLICIES`)
                    const sp = spacePolicies[0]
                    console.log(`# Auditor: ${val.auditor.value} (${val.auditor.groups.join(",")})`)
                    if(sp.auditor != val.auditor.value) {
                        console.log(`ibmcloud account space-role-${val.auditor.value == true ? "set" : "unset"} ${email} ${value.name} ${key2} SpaceAuditor`)
                    }
        
                    console.log(`# Manager: ${val.manager.value} (${val.manager.groups.join(",")})`)
                    if(sp.manager != val.manager.value) {
                        console.log(`ibmcloud account space-role-${val.manager.value == true ? "set" : "unset"} ${email} ${value.name} ${key2} SpaceManager`)
                    }
                    console.log(`# Developer: ${val.developer.value} (${val.developer.groups.join(",")})`)
                    if(sp.developer != val.developer.value) {
                        console.log(`ibmcloud account space-role-${val.developer.value == true ? "set" : "unset"} ${email} ${value.name} ${key2} SpaceDeveloper`)
                    }
                } else {
                    console.log(`# ACTION: ADD SPACE POLICIES`)
                    console.log(`# Auditor: ${val.auditor.value} (${val.auditor.groups.join(",")})`)
                    if(true == val.auditor.value) { 
                        console.log(`ibmcloud account space-role-set ${email} ${val.name} ${key2} SpaceAuditor`)
                    }
    
                    console.log(`# Manager: ${val.manager.value} (${val.manager.groups.join(",")})`)
                    if(true == val.manager.value) {
                        console.log(`ibmcloud account space-role-set ${email} ${val.name} ${key2} SpaceManager`)
                    }
        
                    console.log(`# Developer: ${val.developer.value} (${val.developer.groups.join(",")})`)
                    if(true == val.developer.value) {
                        console.log(`ibmcloud account space-role-set ${email} ${val.name} ${key2} SpaceDeveloper`)
                    }
                }
            }) 
        } else {
           
            console.log(`# ACTION: ADD ORG/SPACE POLICIES`)
            console.log(`# Auditor: ${value.auditor.value} (${value.auditor.groups.join(",")})`)
            if(true == value.auditor.value) {
                console.log(`ibmcloud account org-role-set ${email} ${key} OrgAuditor`)
            }

            console.log(`# Manager: ${value.manager.value} (${value.manager.groups.join(",")})`)
            if(true == value.manager.value) {
                console.log(`ibmcloud account org-role-set ${email} ${key} OrgManager`)
            }

            console.log(`# Billing Manager: ${value.billing_manager.value} (${value.billing_manager.groups.join(",")})`)
            if(true == value.billing_manager.value) {
                console.log(`ibmcloud account org-role-set ${email} ${key} BillingManager`)
            }

            value.spaces.forEach((val3, key3) => {
                console.log(`\n# Space: ${key3}`)
                console.log(`# Auditor: ${val3.auditor.value} (${val3.auditor.groups.join(",")})`)
                if(true == val3.auditor.value) {
                    console.log(`ibmcloud account space-role-set ${email} ${value.name} ${key3} SpaceAuditor`)
                }

                console.log(`# Manager: ${val3.manager.value} (${val3.manager.groups.join(",")})`)
                if(true == val3.manager.value) {
                    console.log(`ibmcloud account space-role-set ${email} ${value.name} ${key3} SpaceManager`)
                }
    
                console.log(`# Developer: ${val3.developer.value} (${val3.developer.groups.join(",")})`)
                if(true == val3.developer.value) {
                    console.log(`ibmcloud account space-role-set ${email} ${value.name} ${key3} SpaceDeveloper`)
                }
            })
        }
    })
}


module.exports = utils