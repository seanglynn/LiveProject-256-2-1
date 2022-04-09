'use strict'

require('dotenv').config()
const express = require('express')
const router = express.Router()
const uid = require('uid');
// [START firestore_limit_to_last_query]
const {Firestore} = require('@google-cloud/firestore');


const projectId = process.env.PUBSUB_PROJECT_ID;// Your Google Cloud Platform project ID
const createdTopicName = process.env.CREATED_TOPIC_NAME; // Name for the new topic to create
const classifiedTopicName = process.env.CLASSIFIED_TOPIC_NAME; // Name for the new topic to create
const subscriptionName = process.env.SUBSCRIPTION_NAME; // Name for the new topic to create
const svcAccKeyLocation = process.env.GCP_SVC_ACC_KEY

console.log(`projectId: ${projectId}`);
console.log(`createdTopicName: ${createdTopicName}`);
console.log(`classifiedTopicName: ${classifiedTopicName}`);
console.log(`subscriptionName: ${subscriptionName}`);
console.log(`svcAccKeyLocation: ${svcAccKeyLocation}`);

var admin = require("firebase-admin");
var serviceAccount = require(svcAccKeyLocation);

// TODO - align svc accounts
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Imports the Google Cloud client library
const { PubSub, v1 } = require('@google-cloud/pubsub');

let pubSubClasifierSubscriberClient = new v1.SubscriberClient();
const pubSubClient = new PubSub({projectId});

// NLP Integ
const language = require('@google-cloud/language');
// Instantiates a client
const client = new language.LanguageServiceClient();
const db = admin.firestore();


async function getISOTimestamp() { 
    var isoDateTs = new Date().toISOString()
    console.debug(`Generated ts: ${isoDateTs}`)
    return isoDateTs
  }

  
  async function pushToTopic(topicName, message) { 
      // Publishes the message as a string, e.g. "Hello, world!" or JSON.stringify(someObject)
    const dataBuffer = Buffer.from(JSON.stringify(message));
  
    var response = "";
    const pushTimestamp= await getISOTimestamp()
  
    try {
      const messageId = await pubSubClient.topic(topicName).publish(dataBuffer);
      response = `Message ${messageId} published at ${pushTimestamp}.`
      console.log(response);
    } catch (error) {
      console.error(`Received error while publishing: ${error.message}`);
      process.exitCode = 1;
    }
    // return response
  }
    

  async function getPubSubSubscription(subscriptionName) {
  
    const subscription = await pubSubClient.subscription(subscriptionName);
  
    console.log('subscription:')
    console.log(subscription)
  
    return subscription
  
   }
  

  async function consumeFromTopic(subscription) { 
    console.log(typeof(subscription))
    // Receive callbacks for new messages on the subscription
    subscription.on('message', message => {
      console.log(`Message received: `);
      console.log(message.data.toString('utf8'));
    });
  
  }
  

  // 
  async function getNLPFeedback(feedback) { 

    const document = {
      content: feedback,
      type: 'PLAIN_TEXT',
    };  
  
    // Detects the sentiment of the text
    const [result] = await client.analyzeSentiment({document: document});
    const sentiment = result.documentSentiment;

    // console.log(`Text: ${text}`);
    console.log(`Sentiment score: ${sentiment.score}`);
    console.log(`Sentiment magnitude: ${sentiment.magnitude}`);

    const nlp_results  = {
      score: sentiment.score,
      magnitude: sentiment.magnitude,
    };


    return nlp_results;

  }


  const main = async () => {
    var subscription = await getPubSubSubscription(subscriptionName);
    
    subscription.on('message', async (message) => {
      console.log(`Received message ${message.id}:`);
      const received_msg_str = message.data.toString('utf8');
      console.log(received_msg_str);
      // const received_msg = message.data;

      const received_msg = JSON.parse(received_msg_str);
      console.log(`received_msg:`);
      console.log(received_msg);

      const doc_id = received_msg.doc_id;
      console.log(`doc_id: ${doc_id}`);

      const feedback = received_msg.feedback;

      const nlp_results = await getNLPFeedback(feedback);
  
      var mapped_record = await mapRecord(feedback, nlp_results);
      console.log('mapped_record:');
      console.log(mapped_record);

      // Write out JSON record to FB
      const record = await writeFirebaseRecord( mapped_record, doc_id )

      // Append UID
      mapped_record.id = doc_id;

      await pushToTopic(classifiedTopicName, mapped_record);

      message.ack();

    });
    console.log("Done");

  };
  main().catch(console.error);

    
  // ==============================
  // 1. WRITE TO FIREBASE
  // ==============================
  async function mapRecord(feedback, nlp_results) {
    
    const sentiment = nlp_results.score;
    const magnitude = nlp_results.magnitude;

    console.log(`sentiment: ${sentiment}`);
    console.log(`magnitude: ${magnitude}`);
    
    var writeToDbIsoDate = new Date().toISOString()
  
    const rec = {
      createdAt: writeToDbIsoDate,
      feedback: feedback,
      classified: true,
      classifiedAt: writeToDbIsoDate,
      sentimentScore: sentiment,
      sentimentMagnitude: magnitude,
    }

    console.log("Created feedback record:")
    console.log(rec)
  
    return rec
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