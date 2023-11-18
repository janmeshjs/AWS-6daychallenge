
const { DynamoDBClient, PutItemCommand, DeleteItemCommand, ScanCommand, UpdateItemCommand,GetItemCommand ,QueryCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const AWS = require('aws-sdk');
const dynamoDBClient = new DynamoDBClient({ region: 'us-east-1' });


module.exports.addUser = async (event, context) => {
  try {
      if (!event.body) {
          return {
              statusCode: 400,
              body: JSON.stringify({ message: 'Request body  is missing' })
          };
      }

      const requestBody = JSON.parse(event.body);
      const { UserId, Name, Email } = requestBody || {};

      if (!UserId || !Name || !Email) {
          return {
              statusCode: 400,
              body: JSON.stringify({ message: 'UserId, Name, or Email is missing in the request body' })
          };
      }

      const params = {
          TableName: 'UsersTable',
          Item: marshall({
              UserId,
              Name,
              Email
          })
      };

      // Add user to DynamoDB
      await dynamoDBClient.send(new PutItemCommand(params));
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'User added successfully ' })
    };
  } catch (error) {
      return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Error adding user', error: error.message })
      };
  }
};
// Lambda function to delete a user from DynamoDB
module.exports.deleteUser = async (event, context) => {
  try {
      const { UserId } = event.pathParameters || {};

      if (!UserId) {
          return {
              statusCode: 400,
              body: JSON.stringify({ message: 'UserId is missing in pathParameters' })
          };
      }

      const params = {
          TableName: 'UsersTable', 
          Key: marshall({
              UserId: UserId
          })
      };

      await dynamoDBClient.send(new DeleteItemCommand(params));

      return {
          statusCode: 200,
          body: JSON.stringify({ message: 'User deleted successfully ' })
      };
  } catch (error) {
      return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Error deleting user', error: error.message })
      };
  }
};


// Lambda function to update a user in DynamoDB

module.exports.updateUser = async (event, context) => {
  try {
      if (!event.body) {
          return {
              statusCode: 400,
              body: JSON.stringify({ message: 'Request body is missing' })
          };
      }

      const requestBody = JSON.parse(event.body);
      const { UserId, Name, Email } = requestBody || {};

      if (!UserId || (!Name && !Email)) {
          return {
              statusCode: 400,
              body: JSON.stringify({ message: 'UserId is missing or both Name and Email are missing in the request body' })
          };
      }

      const ExpressionAttributeValues = {};
      const ExpressionAttributeNames = {};

      const UpdateExpressionParts = [];
      if (Name) {
          UpdateExpressionParts.push('#name = :name');
          ExpressionAttributeValues[':name'] = Name;
          ExpressionAttributeNames['#name'] = 'Name';
      }

      if (Email) {
          UpdateExpressionParts.push('#email = :email');
          ExpressionAttributeValues[':email'] = Email;
          ExpressionAttributeNames['#email'] = 'Email';
      }

      const UpdateExpression = 'SET ' + UpdateExpressionParts.join(', ');

      const params = {
          TableName: 'UsersTable',
          Key: marshall({ UserId: UserId }),
          UpdateExpression: UpdateExpression,
          ExpressionAttributeValues: marshall(ExpressionAttributeValues),
          ExpressionAttributeNames: ExpressionAttributeNames,
          ReturnValues: 'ALL_NEW',
      };

    await dynamoDBClient.send(new UpdateItemCommand(params));
      const getParams = {
          TableName: 'UsersTable', 
          Key: marshall({ UserId: UserId }),
      };
      const { Item } = await dynamoDBClient.send(new GetItemCommand(getParams));
      const updatedAttributes = unmarshall(Item);

      return {
          statusCode: 200,
          body: JSON.stringify({ message: 'User  updated successfully' ,UserId:updatedAttributes.UserId,Name:updatedAttributes.Name,Email:updatedAttributes.Email })
      };
  } catch (error) {
      return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Error updating user', error: error.message })
      };
  }
};

module.exports.queryUser = async (event, context) => {
  try {
      const { UserId } = event.queryStringParameters || {};

      if (!UserId) {
          return {
              statusCode: 400,
              body: JSON.stringify({ message: 'UserId is missing in queryStringParameters' })
          };
      }

      const params = {
          TableName: 'UsersTable',
          KeyConditionExpression: '#UserId = :UserIdValue',
          ExpressionAttributeNames: {
              '#UserId': 'UserId'
          },
          ExpressionAttributeValues: {
              ':UserIdValue': UserId
          }
      };

      const queryResult = await dynamoDBClient.send(new QueryCommand(params));

      const queriedItems = queryResult.Items.map(item => {
          return {
              UserId: item.UserId.S,
              Name: item.Name.S,
              Email: item.Email.S
          };
      });

      return {
          statusCode: 200,
          body: JSON.stringify({ message: 'User queried successfully', users: queriedItems })
      };
  } catch (error) {
      return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Error querying user', error: error.message })
      };
  }
};


module.exports.getUser = async (event, context) => {
  try {
      const params = {
          TableName: 'UsersTable',
      };

      const data = await dynamoDBClient.send(new ScanCommand(params));
      
      const users = data.Items.map(item => {
          return {
              UserId: item.UserId.S,
              Name: item.Name.S,
              Email: item.Email.S
          };
      });

      return {
          statusCode: 200,
          body: JSON.stringify({ users })
      };
  } catch (error) {
      return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Error getting users', error: error.message })
      };
  }
};
