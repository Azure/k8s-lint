token=$1
commit=$2
repository=$3
prNumber=$4
frombranch=$5
tobranch=$6

getPayLoad() {
    cat <<EOF
{
    "event_type": "K8sLintActionPR", 
    "client_payload": 
    {
        "action": "K8sLint", 
        "commit": "$commit", 
        "repository": "$repository", 
        "prNumber": "$prNumber", 
        "tobranch": "$tobranch", 
        "frombranch": "$frombranch"
    }
}
EOF
}

response=$(curl -X POST -H "Authorization: token $token" https://api.github.com/repos/sundargs2000/azure-actions-integration-tests/dispatches --data "$(getPayLoad)")

if [ "$response" == "" ]; then
    echo "Integration tests triggered successfully"
else
    echo "Triggering integration tests failed with: '$response'"
    exit 1
fi