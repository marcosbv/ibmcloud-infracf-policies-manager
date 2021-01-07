#!/bin/bash

ACCOUNT_PREFIX=$1
echo "Setup for Account $ACCOUNT_PREFIX"
# Captura Account ID e Token
export TOKEN=$(ibmcloud iam oauth-tokens | cut -d " " -f 5)
#export ACCOUNT_ID=$(ibmcloud target | grep "Account: " | cut -d "(" -f2 | cut -d ")" -f1)
export ACCOUNT_ID=$(ibmcloud account list | grep "$ACCOUNT_PREFIX" | cut -d " " -f1)

# Configura Account ID
# FIXME: currently CF in Dallas is considered
ibmcloud target -c $ACCOUNT_ID --cf-api https://api.us-south.cf.cloud.ibm.com/
export UAA_TOKEN=$(ibmcloud iam oauth-tokens | grep UAA | cut -d " " -f5)

set -x 

# Desabilita update checks
ibmcloud config --check-version=false

# Access groups:
ibmcloud iam access-groups --output json > groups.json

# Access Groups Members
set +x
for i in $(ibmcloud iam access-groups --output json | grep AccessGroupId | cut -d '"' -f4); 
do 
   echo "Getting members for access group id $i"
   curl -X GET "https://iam.cloud.ibm.com/v2/groups/$i/members?limit=100" -H "Authorization: $TOKEN" -H 'Content-Type: application/json' -o ${i}_members.json; 
done

set -x

# Hardware:
ibmcloud sl hardware list --output json > hardware.json

# Virtual Servers:
ibmcloud sl vs list --output json > vsi.json

# Softlayer users
ibmcloud sl user list --output json > sl_users.json

# Usuarios:
ibmcloud account users --output json > users.json

## Dados Cloud Foundry (orgs/spaces)
set +x

echo "Getting CF orgs and spaces..."
curl -X GET "https://api.us-south.cf.cloud.ibm.com/v2/organizations" -H "Authorization: bearer ${UAA_TOKEN}" -o organizations.json
curl -X GET "https://api.us-south.cf.cloud.ibm.com/v2/spaces" -H "Authorization: bearer ${UAA_TOKEN}" -o spaces.json

for i in `cat organizations.json | grep '"guid"' | cut -d '"' -f4 `
do
    echo "Getting managers, billing managers and auditors for org ${i}"
    curl -X GET "https://api.us-south.cf.cloud.ibm.com/v2/organizations/${i}/managers" -H "Authorization: bearer ${UAA_TOKEN}" -o org_${i}_managers.json
    curl -X GET "https://api.us-south.cf.cloud.ibm.com/v2/organizations/${i}/billing_managers" -H "Authorization: bearer ${UAA_TOKEN}" -o org_${i}_billing_managers.json
    curl -X GET "https://api.us-south.cf.cloud.ibm.com/v2/organizations/${i}/auditors" -H "Authorization: bearer ${UAA_TOKEN}" -o org_${i}_auditors.json
done

for i in `cat spaces.json | grep '"guid"' | cut -d '"' -f4 `
do
    echo "Getting managers, developers and auditors for space ${i}"
    curl -X GET "https://api.us-south.cf.cloud.ibm.com/v2/spaces/${i}/managers" -H "Authorization: bearer ${UAA_TOKEN}" -o space_${i}_managers.json
    curl -X GET "https://api.us-south.cf.cloud.ibm.com/v2/spaces/${i}/developers" -H "Authorization: bearer ${UAA_TOKEN}" -o space_${i}_developers.json
    curl -X GET "https://api.us-south.cf.cloud.ibm.com/v2/spaces/${i}/auditors" -H "Authorization: bearer ${UAA_TOKEN}" -o space_${i}_auditors.json
done
set -x
# Joga para diretorio data
rm -vfr data/

mkdir data

mv *.json ./data

set +x
echo
echo "-------------------------------------------------------------------------"

echo "Data snapshot successfully taken."
echo "Please share your feedback at marcosbv@br.ibm.com. Have fun!"
