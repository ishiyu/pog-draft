'use strict';

const AWS = require("aws-sdk");
AWS.config.update({ region: process.env.AWS_REGION });


module.exports = function sequence(sequenceName, callback) {
  console.debug(`start sequence (sequenceName: ${sequenceName})`);
  var params = {
    TableName: process.env.TABLE_SEQUENCES,
    Key: { name: { S: sequenceName } },
    AttributeUpdates: {
      current_number: {
        Action: 'ADD',
        Value:{ N: '1' }
      }
    },
    ReturnValues: 'UPDATED_NEW'
  };
  console.debug(`params: ${JSON.stringify(params)}`);

  const dynamoDB = new AWS.DynamoDB({ apiVersion: "2012-10-08" });
  dynamoDB.updateItem(params, function(err, data){
    var id;
    if (err) {
      // an error occurred
      console.error('sequence update error');
      console.error(err);
    } else {
      id = data.Attributes.current_number.N;
    }
    callback(err, id);
  });
}