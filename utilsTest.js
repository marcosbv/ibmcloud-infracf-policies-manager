const utils = require('./utils')

const deviceMap = utils.loadDevices()

console.log(deviceMap)


const users = utils.loadUsers()
console.log(users)

const permissions = []

utils.mergePermissionSet('Basic_User', permissions, 'MyGroup');
utils.mergePermissionSet('Super_User', permissions, 'MyAdminGroup')
utils.mergePermissions(["DEDICATED_HOST_VIEW"], permissions, "MyThirdGroup");

console.log(permissions)