#!/usr/bin/env bash

export NAMESPACE=istio-system
export SERVICE_NAME=istio-ingressgateway
export APP_NAME=trigger-func
echo "Getting ingress ip address for istio in: ${NAMESPACE}"

export INGRESS_IP_ADDRESS=$(kubectl --namespace $NAMESPACE get service $SERVICE_NAME -o=jsonpath='{.status.loadBalancer.ingress[0].ip}')
export HOST_URL=$(kubectl get ksvc $APP_NAME -o=jsonpath='{.status.url}')
echo "INGRESS_IP_ADDRESS: ${INGRESS_IP_ADDRESS}"
echo "HOST_URL: ${HOST_URL}"

echo "expect 201:"
curl -H "Accept: application/text" \
  -H "Content-type: application/json"  \
  -s -o /dev/null -w "%{http_code}" \
  -X POST -d '{"feedback":"Yeah yeah yeah it was ok.."}' \
  $HOST_URL


