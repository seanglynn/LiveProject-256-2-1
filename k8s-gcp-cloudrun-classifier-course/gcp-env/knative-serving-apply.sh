#!/usr/bin/env bash

set -e
set -o pipefail

export KNATIVE_VERSION=0.19.0

echo "1. Spinning up Knative Serving v$KNATIVE_VERSION"

# Knative Serving Core
kubectl apply --filename https://github.com/knative/serving/releases/download/v$KNATIVE_VERSION/serving-crds.yaml
kubectl apply --filename https://github.com/knative/serving/releases/download/v$KNATIVE_VERSION/serving-core.yaml

echo "2. Creating Knative DNS Service"
# DNS
kubectl apply --filename https://github.com/knative/serving/releases/download/v$KNATIVE_VERSION/serving-default-domain.yaml

echo "3. Checking Pods in istio-system"
# Check pods have STATUS 'Running'
kubectl get pods -n istio-system

echo "4. Checking Pods in knative-serving"
kubectl get pods -n knative-serving

echo "5. Knative deployment successful"
