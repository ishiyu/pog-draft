'use strict';

const AWS = require("aws-sdk");
AWS.config.update({ region: process.env.AWS_REGION });
const docClient = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10'
});

const baseUrl  = require('./lib/baseUrl.js');


module.exports.index = async function(req, res) {
  console.debug('GET /rooms/:roomId/results');
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

  let voteList;
  try {
    voteList = await docClient.scan({
      TableName: process.env.TABLE_VOTES,
      ExpressionAttributeNames:  { '#status': 'status' },
      ExpressionAttributeValues: { ':roomId': roomId, ':status': 'decided' },
      FilterExpression: 'room_id = :roomId AND #status = :status',
    }).promise();
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }
  console.debug(`voteList: ${JSON.stringify(voteList.Items)}`);

  const voteItems = voteList.Items.sort(function(item, item2) {
    if (item.rank < item2.rank) return -1;
    if (item.rank > item2.rank) return 1;
    if (item.user_name < item2.user_name) return -1;
    if (item.user_name > item2.user_name) return 1;

    return 0;
  });

  res.render('results', {
    baseUrl: baseUrl(req), room: room.Item, voteList: voteItems
  });
};
