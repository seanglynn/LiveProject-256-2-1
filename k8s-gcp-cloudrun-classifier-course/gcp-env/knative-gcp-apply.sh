#!/usr/bin/env bash

set -e
set -o pipefail

echo "1. Spinning up Knative GCP instance"

#Pick a knative-gcp release version:
export KGCP_VERSION=v0.19.0
kubectl apply --filename https://github.com/knative/net-istio/releases/download/$KGCP_VERSION/release.yaml

#First install the pre-install job by running the kubectl apply for cloud-run-events-pre-install-jobs.yaml. Skip this step if you are installing a release before v0.18.0.
kubectl apply --filename https://github.com/google/knative-gcp/releases/download/$KGCP_VERSION/cloud-run-events-pre-install-jobs.yaml

#Install the CRDs by running the kubectl apply for cloud-run-events.yaml with selector. This prevents race conditions during the installation, which cause intermittent errors:
kubectl apply --selector events.cloud.google.com/crd-install=true \
--filename https://github.com/google/knative-gcp/releases/download/$KGCP_VERSION/cloud-run-events.yaml

#To complete the installation, run the kubectl apply again for cloud-run-events.yaml without selector:
kubectl apply --filename https://github.com/google/knative-gcp/releases/download/$KGCP_VERSION/cloud-run-events.yaml


# Needed for init scripts
curl -s https://raw.githubusercontent.com/google/knative-gcp/master/hack/lib.sh --output lib.sh
gcloud config set run/cluster ${CLUSTER_NAME}
gcloud config set run/cluster_location ${CLUSTER_ZONE}
gcloud config set project ${PROJECT_ID}



#Get Pods
kubectl get pods --namespace cloud-run-events
