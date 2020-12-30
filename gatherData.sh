#!/bin/bash

ACCOUNT_PREFIX=$1
echo "Setup for Account $ACCOUNT_PREFIX"
# Captura Account ID e Token
export TOKEN=$(ibmcloud iam oauth-tokens | cut -d " " -f 5)
#export ACCOUNT_ID=$(ibmcloud target | grep "Account: " | cut -d "(" -f2 | cut -d ")" -f1)
export ACCOUNT_ID=$(ibmcloud account list | grep "$ACCOUNT_PREFIX" | cut -d " " -f1)

# Configura Account ID
ibmcloud target -c $ACCOUNT_ID

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

# Joga para diretorio data
rm -vfr data/

mkdir data

mv *.json ./data

set +x
echo
echo "-------------------------------------------------------------------------"

echo "Data snapshot successfully taken."
echo "Please share your feedback at marcosbv@br.ibm.com. Have fun!"
