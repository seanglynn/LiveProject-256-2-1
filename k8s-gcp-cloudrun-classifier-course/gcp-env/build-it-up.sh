#!/usr/bin/env bash

set -e
set -o pipefail

echo "1. Spinning up EKS instance with Istio"
export GCLOUD_PROJECT=$(gcloud config get-value project)
export INSTANCE_REGION=us-central1
export INSTANCE_ZONE=us-central1-c
export PROJECT_NAME=k8s-knative-classifier
export CLUSTER_NAME=${PROJECT_NAME}-cluster
export CONTAINER_NAME=${PROJECT_NAME}-container

export CLUSTER_VERSION=1.17.8-gke.17

echo "2. Set project = $GCLOUD_PROJECT"
gcloud config set project $GCLOUD_PROJECT



echo "4. Enabling gcloud services"
gcloud services enable compute.googleapis.com
gcloud services enable container.googleapis.com
gcloud services enable firebase.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable storage-component.googleapis.com
gcloud services enable storage-api.googleapis.com
gcloud services enable automl.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable sheets.googleapis.com
echo "5. Creating container engine cluster"
gcloud beta container clusters create ${CLUSTER_NAME} \
    --addons=Istio --istio-config=auth=MTLS_PERMISSIVE \
    --zone ${INSTANCE_ZONE} \
    --machine-type=n1-standard-2 \
    --num-nodes=4

#gcloud beta container clusters create ${CLUSTER_NAME} \
#    --addons=Istio --istio-config=auth=MTLS_PERMISSIVE \
#    --preemptible \
#    --zone ${INSTANCE_ZONE} \
#    --cluster-version=${CLUSTER_VERSION} \
#    --scopes cloud-platform \
#    --enable-autorepair \
#    --enable-autoupgrade \
#    --enable-autoscaling --min-nodes 1 --max-nodes 4 \
#    --num-nodes 3

echo "6. Confirm cluster creation"
gcloud container clusters list
kubectl config get-contexts

echo "7. Get credentials"
gcloud container clusters get-credentials ${CLUSTER_NAME} \
    --zone ${INSTANCE_ZONE}

echo "8. Confirm connection to  K8s cluster"
kubectl cluster-info

echo "9. Create cluster administrator"
kubectl create clusterrolebinding cluster-admin-binding \
    --clusterrole=cluster-admin --user=$(gcloud config get-value account)

echo "10. List pods"
kubectl get pods

echo "11. List services"
kubectl get svc

echo "------------------------------------"
echo "KUBERNETES startup complete"
echo "------------------------------------"

echo "12. Creating PubSub topics and subscriptions"
./manage-topics.sh create

sleep 10

echo "13. Creating Knative Service dependancies"
./knative-serving-apply.sh

sleep 10

echo "14. Creating Knative Eventing dependancies"
./knative-eventing-apply.sh

sleep 10

echo "15. Deploying trigger-func"
kubectl apply -f ../trigger-func/service.yaml

echo "16. Deploying analysis-func"
kubectl apply -f ../analysis-func/service.yaml

echo "17. Assigning permissions to service account"
gcloud projects add-iam-policy-binding ${GCLOUD_PROJECT} --member="serviceAccount:sglynnbot@${GCLOUD_PROJECT}.iam.gserviceaccount.com" --role="roles/owner"

echo "18. Pinging trigger func..."
./scripts/PING_trigger-func.sh

