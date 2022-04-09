'use strict';

require('dotenv').config()

const express = require('express');
// const uid = require('uid');
const app = express();

const recommendations = require('./routes/recommendations')
const bodyParser = require('body-parser')

// Imports the Google Cloud client library
const { PubSub, v1 } = require('@google-cloud/pubsub');

const projectId = process.env.PUBSUB_PROJECT_ID;// Your Google Cloud Platform project ID
const topicName = process.env.TOPIC_NAME; // Name for the new topic to create
const subscriptionName = process.env.SUBSCRIPTION_NAME; // Name for the new topic to create
const svcAccKeyLocation = process.env.GCP_SVC_ACC_KEY

console.log(`projectId: ${projectId}`);
console.log(`topicName: ${topicName}`);
console.log(`subscriptionName: ${subscriptionName}`);
console.log(`svcAccKeyLocation: ${svcAccKeyLocation}`);


let pubSubClasifierSubscriberClient = new v1.SubscriberClient();
const pubSubClient = new PubSub({projectId});

const topic_name = process.env.TOPIC_NAME || 'topic_1';


app
  .use(bodyParser.json()) // accept and parse json data
  .use(recommendations) // Call recommendations route
  .use((err, req, res, next) => { // error handling
    res.status(err.status || 500)
      // Validation
    if (err.status === 400) {
      res.send({'error': 'Could not decode feedback request: JSON parsing failed!!'})
    }
    else if (_.isNil(req.body.feedback)) {
      const msg = 'Missing input param "feedback".';
      console.log(msg);
      res.status(400).send(msg);
      return;
    } 
    else {
      res.send({'error': `${err.status} - ${err}`})
    }
  })


// Run App
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log('Trigger_func listening on port', port);
});
