'use strict'

require('dotenv').config()
const Promise = require('promise');


/**
 * Appends values in a Spreadsheet.
 * @param {string} spreadsheetId The spreadsheet ID.
 * @param {string} range The range of values to append.
 * @param {object} valueInputOption Value input options.
 * @param {(string[])[]} _values A 2d array of values to append.
 * @return {Promise} The appended values response.
 */
async function appendValues(sheetsService, spreadsheetId, range, valueInputOption, _values) {
  return new Promise((resolve, reject) => {
    let values = _values;
    let resource = [
        values['createdAt'],
        values['feedback'],
        values['sentimentScore'],
        values['sentimentMagnitude'],
        'v1'
      
    ];
    var appendSheetRequest = {
          spreadsheetId: spreadsheetId ,
          range: range,
          valueInputOption: "RAW",
          resource: {
              "range": range,
              "values": [resource]
          }
      }

    console.log('Writing record to google sheets:')
    console.log(resource)
    sheetsService.spreadsheets.values.append(
    request1, (err, result) => {
      if (err) {
        // Handle error.
        console.log(err);
        // [START_EXCLUDE silent]
        reject(err);
        // [END_EXCLUDE]
      } else {
        console.log(`${result} cells appended.`);
        // [START_EXCLUDE silent]
        resolve(result);
        // [END_EXCLUDE]
      }
    });
    // [END sheets_append_values]
  });
}

module.exports = appendValues
