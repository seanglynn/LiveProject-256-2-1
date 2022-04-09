#!/usr/bin/env bash

set -e
set -o pipefail

echo "1. PREPARING TO TERMINATE - EKS instance with Istio"
export GCLOUD_PROJECT=$(gcloud config get-value project)
export INSTANCE_REGION=us-central1
export INSTANCE_ZONE=us-central1-c
export PROJECT_NAME=k8s-knative-classifier
export CLUSTER_NAME=${PROJECT_NAME}-cluster
export CONTAINER_NAME=${PROJECT_NAME}-container

echo "2. Set project = $GCLOUD_PROJECT"
gcloud config set project $GCLOUD_PROJECT

echo "3. Set compute/zone = ${INSTANCE_ZONE}"
gcloud config set compute/zone ${INSTANCE_ZONE}

echo "4. Removing cluster = ${CLUSTER_NAME}"
gcloud container clusters delete ${CLUSTER_NAME} --quiet
gcloud container clusters list

echo "5. Deleting topics"
#./manage-topics.sh delete

echo "6. Teardown complete"