'use strict';

const AWS = require("aws-sdk");
AWS.config.update({ region: process.env.AWS_REGION });
const docClient = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10'
});

const baseUrl  = require('./lib/baseUrl.js');
const sequence = require('./lib/sequence.js');


module.exports.index = function(req, res) {
  try {
    const params = {
      TableName: process.env.TABLE_ROOMS
    };
    docClient.scan(params, function(err, roomData){
      if (err) {
        console.error(`err: ${err}`);
        return { statusCode: 500, body: err };
      } else {
        console.debug(`roomData: ${JSON.stringify(roomData.Items)}`);
        res.render('rooms', { baseUrl: baseUrl(req), roomList: roomData.Items });
      }
    });
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }
};


module.exports.create = function(req, res) {
  console.debug('POST /rooms');
  console.debug(`req.body: ${JSON.stringify(req.body)}`);

  sequence(process.env.TABLE_ROOMS, (err, id) => {
    if (err) return;

    req.body.id = Number.parseInt(id, 10);
    const putParams = {
      TableName: process.env.TABLE_ROOMS,
      Item: {
        id:    req.body.id,
        name:  req.body.name,
        rank:  1,
        limit: req.body.limit
      }
    };
    docClient.put(putParams, function (err) {
      if (err) {
        console.error(`putItem Error: ${err}`);
      } else {
        res.redirect(`rooms/${id}/owner`);
      }
    });
  });
};
