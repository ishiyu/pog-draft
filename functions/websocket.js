const AWS = require("aws-sdk");
AWS.config.update({ region: process.env.AWS_REGION });
const dynamodb = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10'
});

//
//
//
exports.connect = function (event, context, callback) {
  console.debug('start connect');
  console.debug(`connectionId: ${event.requestContext.connectionId}`);

  const putParams = {
    TableName: process.env.TABLE_CONNECTIONS,
    Item: {
      connectionId: event.requestContext.connectionId
    }
  };
  dynamodb.put(putParams, function (err) {
    if (err) console.error(`putItem Error: ${err}`)
    callback(null, {
      statusCode: err ? 500 : 200,
      body: err ? "Failed to connect: " + JSON.stringify(err) : "Connected."
    });
  });
};


//
//
//
exports.disconnect = function (event, context, callback) {
  console.debug('start disconnect');
  console.debug(`connectionId: ${event.requestContext.connectionId}`);

  const deleteParams = {
    TableName: process.env.TABLE_CONNECTIONS,
    Key: {
      connectionId: event.requestContext.connectionId
    }
  };
  dynamodb.delete(deleteParams, function (err) {
    if (err) console.error(`deleteItem Error: ${err}`)
    callback(null, {
      statusCode: err ? 500 : 200,
      body: err ? "Failed to disconnect: " + JSON.stringify(err) : "Disconnected."
    });
  });
};


//
//
//
exports.ringBell = async (event, context) => {
  console.debug('start ringBell');
  console.debug(`event: ${JSON.stringify(event)}`);
  console.debug(`event.body: ${event.body}`);

  const body = JSON.parse(event.body);

  const { TABLE_CONNECTIONS } = process.env;
  let connectionData;
  try {
    connectionData = await dynamodb.scan({
      TableName: TABLE_CONNECTIONS, ProjectionExpression: 'connectionId',
      ExpressionAttributeNames:  { '#c': 'connectionId' },
      ExpressionAttributeValues: { ':me': event.requestContext.connectionId },
      FilterExpression: '#c <> :me',
    }).promise();
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }
  console.debug(`connectionData: ${JSON.stringify(connectionData)}`);

  const apiGatewayManagementApi = getApiGatewayManagementApi();

  const emitData = JSON.stringify({
    action: 'ringBell', value: { room_id: body.value.room_id }
  });
  console.debug(`emitData: ${JSON.stringify(emitData)}`);

  const postCalls = connectionData.Items.map(async ({ connectionId }) => {
    console.debug(`connectionId: ${connectionId}`);
    try {
      await apiGatewayManagementApi.postToConnection({
        ConnectionId: connectionId, Data: emitData
      }).promise();
    } catch (e) {
      if (e.statusCode === 410) {
        console.log(`Found stale connection, deleting ${connectionId}`);
        await dynamodb.delete({
          TableName: TABLE_CONNECTIONS, Key: { connectionId }
        }).promise();
      } else {
        throw e;
      }
    }
  });

  try {
    await Promise.all(postCalls);
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }

  return { statusCode: 200, body: 'Data sent.' };
};


function getApiGatewayManagementApi() {
  const endpoint = (process.env.IS_OFFLINE) ?
    'http://localhost:3001' :
    `https://ws-${process.env.STAGE}.wpa-draft.site/`
  ;
  console.debug(`endpoint: ${endpoint}`)

  return new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29', endpoint: endpoint
  });
}