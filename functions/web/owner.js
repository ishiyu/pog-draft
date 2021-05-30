'use strict';

const AWS = require("aws-sdk");
AWS.config.update({ region: process.env.AWS_REGION });
const docClient = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10'
});

const officegen = require('officegen');

const baseUrl  = require('./lib/baseUrl.js');
const emitAll  = require('./lib/emitAll.js');


module.exports.index = async function(req, res) {
  console.debug('GET /rooms/:roomId/owner');
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

  let voteData;
  try {
    voteData = await docClient.scan({
      TableName: process.env.TABLE_VOTES,
      ExpressionAttributeValues: { ':roomId': roomId },
      FilterExpression: 'room_id = :roomId',
    }).promise();
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }
  console.debug(`voteData: ${JSON.stringify(voteData)}`);

  const voteItems = voteData.Items.sort(function(item, item2) {
    // rank の降順
    if (item.rank > item2.rank) return -1;
    if (item.rank < item2.rank) return 1;
    // mother の昇順
    if (item.mother < item2.mother) return -1;
    if (item.mother > item2.mother) return 1;
    // user の昇順
    if (item.user_name < item2.user_name) return -1;
    if (item.user_name > item2.user_name) return 1;

    return 0;
  });

  res.render('owner', {
    baseUrl: baseUrl(req), room: room.Item, voteList: voteItems
  });
};


module.exports.starion_csv = async function(req, res) {
  console.log('GET /rooms/:roomId/owner/starion_csv');
  console.log(`req.params: ${JSON.stringify(req.params)}`);
  console.log(`req.body: ${JSON.stringify(req.body)}`);

  const roomId = Number.parseInt(req.params.roomId, 10);

  // 投票データを取得する
  let voteData;
  try {
    voteData = await docClient.scan({
      TableName: process.env.TABLE_VOTES,
      ExpressionAttributeNames:  { '#room_id': 'room_id', '#status': 'status' },
      ExpressionAttributeValues: { ':roomId': roomId, ':status': 'decided' },
      FilterExpression: '#room_id = :roomId AND #status = :status',
    }).promise();
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }

  // データを並べ替える
  const voteItems = voteData.Items.sort(function(item, item2) {
    // rank の昇順
    if (item.rank > item2.rank) return 1;
    if (item.rank < item2.rank) return -1;
    // user の昇順
    if (item.user_name < item2.user_name) return 1;
    if (item.user_name > item2.user_name) return -1;

    return 0;
  });

  // column data
  const dataList = voteItems.map((item) => {
    return {
      'user_name': `${item.user_name}厩舎`,
      'horse_name': item.horse_name,
      'mother': item.mother,
      'birth_year': 2021,
      'comment': item.comment,
      'ratio': item.rank,
    }
  });
  console.log(dataList);
  // column headers
  const json2csv = require('json2csv');
  const csv = json2csv.parse(dataList, [
    'user_name', 'horse_name', 'mother', 'birth_year', 'comment', 'ratio'
  ]);
  console.log(csv);

  res.setHeader('Content-disposition', 'attachment; filename=starion.csv');
  res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
  res.write(csv);
  res.end();
};

module.exports.starion = async function(req, res) {
  console.debug('GET /rooms/:roomId/owner/starion');
  console.debug(`req.params: ${JSON.stringify(req.params)}`);
  console.debug(`req.body: ${JSON.stringify(req.body)}`);

  const roomId = Number.parseInt(req.params.roomId, 10);

  // 投票データを取得する
  let voteData;
  try {
    voteData = await docClient.scan({
      TableName: process.env.TABLE_VOTES,
      ExpressionAttributeNames:  { '#room_id': 'room_id', '#status': 'status' },
      ExpressionAttributeValues: { ':roomId': roomId, ':status': 'decided' },
      FilterExpression: '#room_id = :roomId AND #status = :status',
    }).promise();
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }

  // データを並べ替える
  const voteItems = voteData.Items.sort(function(item, item2) {
    // rank の昇順
    if (item.rank > item2.rank) return 1;
    if (item.rank < item2.rank) return -1;
    // user の昇順
    if (item.user_name < item2.user_name) return 1;
    if (item.user_name > item2.user_name) return -1;

    return 0;
  });

  const xlsx = officegen('xlsx');
  xlsx.on('error', function (err) {
    console.log(err)
  });
  xlsx.on('finalize', function(written) {
    console.log(`written: ${written}`);
    console.log(
      'Finish to create a Microsoft Excel document.'
    )
  });

  const sheet = xlsx.makeNewSheet();
  sheet.name = 'Sheet1';

  // column headers
  sheet.data[0] = [
    'ユーザー名', '馬名', '母名', '誕生年(西暦)', 'コメント', '倍率',
  ];
  // column data
  voteItems.forEach((item, idx) => {
    sheet.data[idx+1] = [
      `${item.user_name}厩舎`,
      item.horse_name,
      item.mother,
      2021,
      item.comment,
      item.rank,
    ];
  });

  // var fs = require('fs');
  // var out = fs.createWriteStream('starion.xlsx');

  const headers = {
    'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'content-disposition': `attachment; filename=starion.xlsx`
  };
  res.set(headers);
  // xlsx.generate(out);
  xlsx.generate(res);
};


module.exports.rank = function(req, res) {
  console.debug('POST /rooms/:roomId/owner/rank');
  console.debug(`req.params: ${JSON.stringify(req.params)}`);
  console.debug(`req.body: ${JSON.stringify(req.body)}`);

  const roomId = Number.parseInt(req.params.roomId, 10);
  const rank   = Number.parseInt(req.body.rank, 10);

  const updateParams = {
    TableName: process.env.TABLE_ROOMS,
    Key: { id: roomId },
    ExpressionAttributeNames:  { '#r': 'rank' },
    ExpressionAttributeValues: { ':r': rank },
    UpdateExpression: 'SET #r = :r',
  };
  docClient.update(updateParams, function (err) {
    if (err) {
      console.error(`update Error: ${err}`);
      res.status(500).send(err);
    } else {
      const emitData = JSON.stringify({
        action: 'changeRank',
        value: { room_id: roomId, rank: rank }
      });
      emitAll(emitData).then(() => {
        res.status(200).send('ok');
      });
    }
  });
};


module.exports.decide = function(req, res) {
  console.debug('POST /rooms/:roomId/owner/decide');
  console.debug(`req.params: ${JSON.stringify(req.params)}`);
  console.debug(`req.body: ${JSON.stringify(req.body)}`);

  const updateParams = {
    TableName: process.env.TABLE_VOTES,
    Key: {
      id:      Number.parseInt(req.body.voteId, 10),
      room_id: Number.parseInt(req.params.roomId, 10)
    },
    ExpressionAttributeNames:  { '#status': 'status' },
    ExpressionAttributeValues: { ':status': 'decided' },
    UpdateExpression: 'SET #status = :status',
  };
  docClient.update(updateParams, function (err) {
    if (err) {
      console.error(`update Error: ${err}`);
      res.status(500).send(err);
    } else {
      res.status(200).send('ok');
    }
  });
};


module.exports.lose = function(req, res) {
  console.debug('POST /rooms/:roomId/owner/lose');
  console.debug(`req.params: ${JSON.stringify(req.params)}`);
  console.debug(`req.body: ${JSON.stringify(req.body)}`);

  const updateParams = {
    TableName: process.env.TABLE_VOTES,
    Key: {
      id:      Number.parseInt(req.body.voteId, 10),
      room_id: Number.parseInt(req.params.roomId, 10)
    },
    ExpressionAttributeNames:  { '#status': 'status' },
    ExpressionAttributeValues: { ':status': 'lose' },
    UpdateExpression: 'SET #status = :status',
  };
  docClient.update(updateParams, function (err) {
    if (err) {
      console.error(`update Error: ${err}`);
      res.status(500).send(err);
    } else {
      res.status(200).send('ok');
    }
  });
};


module.exports.remove = function(req, res) {
  console.debug('POST /rooms/:roomId/owner/remove');
  console.debug(`req.params: ${JSON.stringify(req.params)}`);
  console.debug(`req.body: ${JSON.stringify(req.body)}`);

  const deleteParams = {
    TableName: process.env.TABLE_VOTES,
    Key: {
      id:      Number.parseInt(req.body.voteId, 10),
      room_id: Number.parseInt(req.params.roomId, 10),
    }
  };
  docClient.delete(deleteParams, function (err) {
    if (err) {
      console.error(`delete Error: ${err}`);
      res.status(500).send(err);
    } else {
      res.status(200).send('ok');
    }
  });
};
