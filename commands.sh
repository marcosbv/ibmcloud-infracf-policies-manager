alias policies-for-user='f() { node generatePoliciesForUser.js $@; node generateCFPoliciesForUser.js $@;}; f'
alias policies-for-access-group='f() { node generatePoliciesForAccessGroup.js $@; node generateCFPoliciesForAccessGroup.js $@;}; f'

alias sl-policies-for-user='node generatePoliciesForUser.js'
alias sl-policies-for-access-group='node generatePoliciesForAccessGroup.js'

alias cf-policies-for-user='node generateCFPoliciesForUser.js'
alias cf-policies-for-access-group='node generateCFPoliciesForAccessGroup.js'


