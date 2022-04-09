#!/usr/bin/env bash

set -e
set -o pipefail

export KNATIVE_VERSION=0.19.0

echo "1. Spinning up Knative Eventing v$KNATIVE_VERSION"

# Knative Serving Core
kubectl apply --filename https://github.com/knative/eventing/releases/download/v$KNATIVE_VERSION/eventing-crds.yaml
kubectl apply --filename https://github.com/knative/eventing/releases/download/v$KNATIVE_VERSION/eventing-core.yaml

echo "2. Creating both the GCP Messaging Channel and the GCP Sources. See: https://github.com/google/knative-gcp/blob/main/docs/examples/channel/README.md"
# DNS
kubectl apply --filename https://github.com/google/knative-gcp/releases/download/v$KNATIVE_VERSION/cloud-run-events.yaml

echo "3. Creating a Broker (eventing) layer with MT"
# DNS
kubectl apply --filename https://github.com/knative/eventing/releases/download/v$KNATIVE_VERSION/mt-channel-broker.yaml

echo "3. Checking Pods in istio-system"
# Check pods have STATUS 'Running'
kubectl get pods -n istio-system

echo "4. Checking Pods in knative-serving"
kubectl get pods -n knative-serving

echo "5. Knative deployment successful"
