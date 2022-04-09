'use strict'

require('dotenv').config()
const express = require('express')
const router = express.Router()
const uid = require('uid');

const sheetUtils = require('./routes/sheet-utils')

const projectId = process.env.PUBSUB_PROJECT_ID;// Your Google Cloud Platform project ID
const classifiedTopicName = process.env.CLASSIFIED_TOPIC_NAME; // Name for the new topic to create
const subscriptionName = process.env.SUBSCRIPTION_NAME; // Name for the new topic to create
const svcAccKeyLocation = process.env.GCP_SVC_ACC_KEY
const googleSheetId = process.env.GOOGLE_SHEET_ID
console.log(`projectId: ${projectId}`);
console.log(`classifiedTopicName: ${classifiedTopicName}`);
console.log(`subscriptionName: ${subscriptionName}`);
console.log(`svcAccKeyLocation: ${svcAccKeyLocation}`);


var admin = require("firebase-admin");
var serviceAccount = require(svcAccKeyLocation);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Imports the Google Cloud client library
const { PubSub, v1 } = require('@google-cloud/pubsub');
let pubSubClasifierSubscriberClient = new v1.SubscriberClient();
const pubSubClient = new PubSub({projectId});


// Google client - sheets integ
const {google} = require('googleapis');
const auth = new google.auth.GoogleAuth({
  keyFile: svcAccKeyLocation,
  scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive'],
});
const fs = require('fs');
const readline = require('readline');




// NLP Integ
const language = require('@google-cloud/language');
// Instantiates a client
const client = new language.LanguageServiceClient();
const db = admin.firestore();

// PRINT Google Sheet Vals
async function listClassificationSheetValues(sheets) {
  sheets.spreadsheets.values.get({
    spreadsheetId: googleSheetId,
    range: 'A2:E2',
    // range: 'Class Data!A2:E2',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const rows = res.data.values;
    if (rows.length) {
      console.log('createdAt  | feedback  | sentimentScore  | sentimentMagnitude  | version:');
      // Print columns A to E, which correspond to indices 0 and 4.
      rows.map((row) => {
        console.log(`${row[0]}, ${row[1]}, ${row[2]}, ${row[3]}, ${row[4]}`);
      });
    } else {
      console.log('No data found.');
    }
  });
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

      // Init sheets service
      const sheets = google.sheets({version: 'v4', auth});
      await listClassificationSheetValues(sheets);

      const range = 'Sheet1!A1:E1'
      const appendedSheetsResults = await sheetUtils(sheets, googleSheetId, range, 'USER_ENTERED', received_msg);
      console.log(`appendedSheetsResults:`);
      console.log(appendedSheetsResults);
      // Append UID
      // mapped_record.id = doc_id;

      // await pushToTopic(classifiedTopicName, mapped_record);

      message.ack();

    });
    console.log("Done");

  };
  main().catch(console.error);

    
