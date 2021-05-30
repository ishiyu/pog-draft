'use strict';

const AWS = require("aws-sdk");
AWS.config.update({ region: process.env.AWS_REGION });
const docClient = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10'
});


module.exports = async function(emitData) {
  let connectionData;
  try {
    connectionData = await docClient.scan({
      TableName: process.env.TABLE_CONNECTIONS,
      ProjectionExpression: 'connectionId'
    }).promise();
  } catch (e) {
    throw e;
  }

  let endpoint;
  if  (process.env.IS_OFFLINE) {
    endpoint = 'http://localhost:3001';
  } else {
    endpoint = `https://ws-${process.env.STAGE}.wpa-draft.site/`;
  }
  console.debug(`endpoint: ${endpoint}`)

  const apiGatewayManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29', endpoint: endpoint
  });


  const postCalls = connectionData.Items.map(async ({ connectionId }) => {
    console.debug(`connectionId: ${connectionId}`);
    try {
      await apiGatewayManagementApi.postToConnection({
        ConnectionId: connectionId, Data: emitData
      }).promise();
    } catch (e) {
      if (e.statusCode === 410) {
        console.log(`Found stale connection, deleting ${connectionId}`);
        await docClient.delete({
          TableName: process.env.TABLE_CONNECTIONS,
          Key: { connectionId }
        }).promise();
      } else {
        throw e;
      }
    }
  });

  try {
    await Promise.all(postCalls);
  } catch (e) {
    throw e;
  }
};