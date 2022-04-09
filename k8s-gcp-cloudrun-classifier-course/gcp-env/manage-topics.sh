#!/usr/bin/env bash

set -e
set -o pipefail

# create/delete
action=$1

export TOPIC_1=feedback-created
export TOPIC_2=feedback-classified

gcloud pubsub topics $action $TOPIC_1
gcloud pubsub topics $action $TOPIC_2


gcloud pubsub subscriptions $action ${TOPIC_1}-subscription --topic=$TOPIC_1
gcloud pubsub subscriptions $action ${TOPIC_2}-subscription --topic=$TOPIC_2
gcloud pubsub subscriptions $action ${TOPIC_2}-reporting-subscription --topic=$TOPIC_2

