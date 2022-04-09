#!/bin/bash

export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/sglynnbot-key.json"
gcloud auth activate-service-account sglynnbot@sodium-hangar-309319.iam.gserviceaccount.com  --key-file=./sglynnbot-key.json