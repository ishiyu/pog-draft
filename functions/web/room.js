'use strict';

const AWS = require("aws-sdk");
AWS.config.update({ region: process.env.AWS_REGION });
const docClient = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10'
});

const baseUrl  = require('./lib/baseUrl.js');


module.exports.index = async function(req, res) {
  console.debug('GET /rooms/:roomId');
  console.debug(`req.params: ${JSON.stringify(req.params)}`);

  const roomId = Number.parseInt(req.params.roomId, 10);

  let room;
  try {
    room = await docClient.get({
      TableName: process.env.TABLE_ROOMS,
      Key:{ id: roomId }
    }).promise();
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }
  console.debug(`room: ${JSON.stringify(room)}`);

  const params = {
    TableName: process.env.TABLE_VOTES,
    ExpressionAttributeNames:  { '#r': 'rank', '#s': 'status' },
    ExpressionAttributeValues: {
      ':roomId': roomId, ':r': room.Item.rank, ':s': 'voted'
    },
    FilterExpression: 'room_id = :roomId AND #r = :r AND #s = :s',
  };
  console.debug(`scanParams: ${JSON.stringify(params)}`);

  docClient.scan(params, function(err, voteData){
    if (err) {
      console.error(`err: ${err}`);
      return { statusCode: 500, body: err };
    } else {
      console.debug(`voteList: ${JSON.stringify(voteData.Items)}`);
      res.render('room', {
        baseUrl: baseUrl(req), room: room.Item, voteList: voteData.Items
      });
    }
  });
};
