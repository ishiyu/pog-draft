'use strict';

const AWS = require("aws-sdk");
AWS.config.update({ region: process.env.AWS_REGION });
const docClient = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10'
});

const baseUrl  = require('./lib/baseUrl.js');
const sequence = require('./lib/sequence.js');
const emitAll  = require('./lib/emitAll.js');


module.exports.index = async function(req, res) {
  console.debug('GET /rooms/:roomId/vote');
  console.debug(`req.params: ${JSON.stringify(req.params)}`);

  let room;
  try {
    room = await docClient.get({
      TableName: process.env.TABLE_ROOMS,
      Key:{ id: Number.parseInt(req.params.roomId, 10) }
    }).promise();
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }
  console.debug(`room: ${JSON.stringify(room)}`);

  res.render('vote', {
    baseUrl: baseUrl(req), room: room.Item
  });
};

module.exports.vote = function(req, res) {
  console.debug('POST /rooms/:roomId/vote');
  console.debug(`req.params: ${JSON.stringify(req.params)}`);
  console.debug(`req.body: ${JSON.stringify(req.body)}`);

  sequence(process.env.TABLE_VOTES, (err, id) => {
    if (err) return;

    req.body.id      = Number.parseInt(id, 10);
    req.body.room_id = Number.parseInt(req.params.roomId, 10);
    req.body.rank    = Number.parseInt(req.body.rank, 10);
    console.debug('start sequence callback');
    const putParams = {
      TableName: process.env.TABLE_VOTES,
      Item: {
        id:         req.body.id,
        room_id:    req.body.room_id,
        rank:       req.body.rank,
        user_name:  req.body.user_name,
        father:     req.body.father,
        mother:     req.body.mother,
        horse_name: req.body.horse_name,
        gender:     req.body.gender,
        stable:     req.body.stable,
        comment:    req.body.comment,
        status:     'voted',
      }
    };
    console.debug(`putParams: ${JSON.stringify(putParams)}`);

    docClient.put(putParams, function (err) {
      if (err) {
        console.error(`putItem Error: ${err}`);
      } else {
        const emitData = JSON.stringify({
          action: 'voteHorse', value: req.body
        });
        try {
          emitAll(emitData).then(() => {
            res.redirect(`/rooms/${req.params.roomId}`);
          });
        } catch (e) {
          res.status(500).send(e.stack);
        }
      }
    });
  });
}
