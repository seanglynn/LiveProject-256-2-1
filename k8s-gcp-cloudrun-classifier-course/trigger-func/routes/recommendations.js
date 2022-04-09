'use strict'

require('dotenv').config()

const express = require('express')
const router = express.Router()
const uid = require('uid');
const {Firestore} = require('@google-cloud/firestore');

const projectId = process.env.PUBSUB_PROJECT_ID;// Your Google Cloud Platform project ID
const topicName = process.env.TOPIC_NAME; // Name for the new topic to create
const subscriptionName = process.env.SUBSCRIPTION_NAME; // Name for the new topic to create
const svcAccKeyLocation = process.env.GCP_SVC_ACC_KEY
console.log(`projectId: ${projectId}`);
console.log(`topicName: ${topicName}`);
console.log(`subscriptionName: ${subscriptionName}`);
console.log(`svcAccKeyLocation: ${svcAccKeyLocation}`);


var admin = require("firebase-admin");
var serviceAccount = require(`.${svcAccKeyLocation}`);

// TODO - align svc accounts
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Imports the Google Cloud client library
const { PubSub, v1 } = require('@google-cloud/pubsub');


// TODO - Init location
let pubSubClasifierSubscriberClient = new v1.SubscriberClient();
const pubSubClient = new PubSub({projectId});

const topic_name = process.env.TOPIC_NAME || 'topic_1';

async function getISOTimestamp() { 
    var isoDateTs = new Date().toISOString()
    console.debug(`Generated ts: ${isoDateTs}`)
    return isoDateTs
  }
  
  async function pushToTopic(topicName, message) { 
      // Publishes the message as a string, e.g. "Hello, world!" or JSON.stringify(someObject)
    const dataBuffer = Buffer.from(JSON.stringify(message));
  
    var response = "";
    var messageId = "";
    const pushTimestamp= await getISOTimestamp()
  
    try {
      messageId = await pubSubClient.topic(topicName).publish(dataBuffer);
      response = `Message ${messageId} published at ${pushTimestamp}.`
      console.log(response);
    } catch (error) {
      console.error(`Received error while publishing: ${error.message}`);
      process.exitCode = 1;
    }
    return messageId
  }
  
  async function createPubSubSubscription(subscriptionName) {
  
    const [subscription] =   await pubSubClient.topic(topicName).createSubscription(subscriptionName);  
    return subscription
  
   }
  
  async function getPubSubSubscription(subscriptionName) {
  
    const subscription = await pubSubClient.subscription(subscriptionName);
  
    console.log('subscription:')
    console.log(subscription.toString())
  
    return subscription
  
   }
  
  
  async function consumeFromTopic(subscription) { 
    console.log(typeof(subscription))
    // Receive callbacks for new messages on the subscription
    await subscription.on('message', message => {
      console.log(`Message received: `);
      console.log(message.data.toString('utf8'));
      console.log(message);
      message.ack();

    });
  }
  async function match_message(message, instance_uid,  doc) { 
      const doc_id = doc.id;
      console.log(`doc_id: ${doc_id}`);
      console.log(`instance_uid: ${instance_uid}`);
      if (doc_id == instance_uid)
      {
        console.log("message.id == messageId");
        
        message.ack();

        return message.data;
      }
  }
  async function awaitClassificationFromTopic(subscription, instance_uid) { 

    // Receive callbacks for new messages on the subscription
    await subscription.on('message', async (message) => {
      console.log(message);
      const received_msg_str = message.data.toString('utf8');
      const received_msg = JSON.parse(received_msg_str);
      console.log(`received_msg:`);
      console.log(received_msg);

      const result = await match_message(message, instance_uid, received_msg)
      console.log(`result: ${result}`);
      return received_msg
    });
  
  }
  
  const db = admin.firestore();
  
  // ==============================
  // 1. WRITE INITIAL REC TO FIREBASE
  // ==============================
  async function mapRecord(feedback) {
  
    var writeToDbIsoDate = new Date().toISOString()
  
    const initial_rec = {
      createdAt: writeToDbIsoDate,
      feedback: feedback,
      classified: false,
      classifiedAt: writeToDbIsoDate,
      sentimentScore: 0.0,
      sentimentMagnitude: 0.0,
    }
  
    return initial_rec
  }
  
  async function writeFirebaseRecord(rec, uid) {
    // Obtain a document reference.
    const collection = process.env.COLLECTION_NAME
    // const document = firestore.doc(doc_ref);
  
    const docRef = db.collection(collection).doc(uid);
  
    console.log(`rec type: ${typeof(rec)}`)
    console.log(rec)
  
    console.log(`New data into the document: ${rec}`);
  
    // Enter new data into the document.
    await docRef.set(rec);
    console.log(`Written to FB`);
    return rec
  }
  
  async function upsertFirebaseRecord(doc_ref, updated_record) {
    // Obtain a document reference.
    // const doc_ref = process.env.FIREBASE_DOC_REF
    const document = firestore.doc(doc_ref);
  
  
    //TODO:
    // var rec = mapRecord(updated_record)
    var rec = await mapRecord()
    console.log(`New data into the document: ${rec}`);
  
    // Enter new data into the document.
    await document.set(rec);
    console.log(`Written to FB`);
  
  }
   
  async function deleteFirebaseRecord(document) {
    // Delete the document.
    await document.delete();
    console.log('Deleted the document');
  }
  async function updateFirebaseRecord(document, message) {
      // Update an existing document.
      await document.update({
        body: message,
      });
      console.log('Updated an existing document');
    
  }
  async function readFirebaseRecord(document) {
      // Read the document.
      const doc = await document.get();
      console.log('Read the document');
    
  }
  
  
  // Publish message to GCP PubSub
  async function publish_message(message) {
  
    topic.publish(message).then((data) => {
      const messageId = data[0][0];
      console.log(`Message was published with ID: ${messageId}`);
    });
  }  

router
  .get('/', async (req, res) => { 
    console.log('Trigger_func received a GET request.');
    res.send('<h3>Please start by posting valid recommendation json data</h3>')
  })

  .post('/', async (req, res, next) => { 
    // dont process if empty object posted
    if (Object.keys(req.body).length !== 0) { 

      let rec_body = req.body
      console.debug(`rec_body of type: ${typeof(rec_body)}. Value:`)
      console.debug(rec_body)

      let feedbackJson = rec_body.feedback;
      console.debug(`feedbackJson of type: ${typeof(feedbackJson)}. Value`)
      console.debug(feedbackJson)

      // Instance UID
      const instance_uid = uid.uid(16)

      try {
        // Map feedback to JSON record
        var rec = await mapRecord(feedbackJson)
        rec.doc_id = instance_uid;

        // Write out JSON record to FB
        const record = await writeFirebaseRecord( rec, instance_uid )

        // Get topic subscription - Consume & print messages to sdtout while running service
        // Push to PubSub Topic
        const messageId = await pushToTopic(topic_name, rec);
        console.log(`Pushed ${messageId} to ${topic_name}`)

        // Now we wait for the response
        var subscription = await getPubSubSubscription(subscriptionName) 
        // Tmp: to ensure messages are pushed to topic
        const classificationResult = await awaitClassificationFromTopic(subscription, instance_uid);
        console.log(`classificationResult: ${classificationResult}`);

        res.status(201).send(instance_uid);
        return;
      } catch (e) {
        console.log(`Error saving feedback and publishing Pub/Sub message (new feedback ID = ${instance_uid}):`, e);
    
        res.status(500).send();
        return;
    }
  
    } else {
      res.send({'error': 'post request is empty'})
    }

  })
module.exports = router
