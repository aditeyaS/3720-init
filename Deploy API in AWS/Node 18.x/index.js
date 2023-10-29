// References
// https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/dynamodb-example-dynamodb-utilities.html
// https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

// dynamo table name
const dynamoTableName = "demoapi";
// dyname region
const dynamoTableRegion = "us-east-1";

const dynamoDBClient = new DynamoDBClient({ region: dynamoTableRegion });
const dynamo = DynamoDBDocumentClient.from(dynamoDBClient);

// define all request methods here
const REQUEST_METHOD = {
  POST: "POST",
  GET: "GET",
  DELETE: "DELETE",
  PATCH: "PATCH",
};

// define all status codes here
const STATUS_CODE = {
  SUCCESS: 200,
  NOT_FOUND: 404,
};

// paths
const userPath = "/user";
const userParamPath = `${userPath}/{id}`;
const usersPath = "/users";

export const handler = async (event, context) => {
  let response;

  switch (true) {
    // add new user
    case event.httpMethod === REQUEST_METHOD.POST &&
      event.requestContext.resourcePath === userPath:
      response = await saveUser(JSON.parse(event.body));
      break;
    // get user by id by path param
    case event.httpMethod === REQUEST_METHOD.GET &&
      event.requestContext.resourcePath === userParamPath:
      response = await getUser(event.pathParameters.id);
      break;
    // get user by id by query param
    case event.httpMethod === REQUEST_METHOD.GET &&
      event.requestContext.resourcePath === userPath:
      response = await getUser(event.queryStringParameters.id);
      break;
    // modify user
    case event.httpMethod === REQUEST_METHOD.PATCH &&
      event.requestContext.resourcePath === userPath:
      response = await modifyUser(JSON.parse(event.body));
      break;
    // delete a user
    case event.httpMethod === REQUEST_METHOD.DELETE &&
      event.requestContext.resourcePath === userPath:
      response = await deleteUser(event.queryStringParameters.id);
      break;
    // get all users
    case event.httpMethod === REQUEST_METHOD.GET &&
      event.requestContext.resourcePath === usersPath:
      response = await getUsers();
      break;
    // invalid requests
    default:
      response = buildResponse(
        STATUS_CODE.NOT_FOUND,
        event.requestContext.resourcePath
      );
      break;
  }
  return response;
};

async function saveUser(requestBody) {
  const commandParams = {
    TableName: dynamoTableName,
    Item: requestBody,
  };
  const command = new PutCommand(commandParams);
  try {
    await dynamo.send(command);
    const responseBody = {
      Operation: "SAVE",
      Message: "SUCCESS",
      Item: requestBody,
    };
    return buildResponse(STATUS_CODE.SUCCESS, responseBody);
  } catch (error) {
    console.error(
      "Do your custom error handling here. I am just gonna log it: ",
      error
    );
  }
}

async function getUser(MemberId) {
  const params = {
    TableName: dynamoTableName,
    Key: {
      id: MemberId,
    },
  };
  const command = new GetCommand(params);
  try {
    const response = await dynamo.send(command);
    return buildResponse(STATUS_CODE.SUCCESS, response.Item);
  } catch (error) {
    console.error(
      "Do your custom error handling here. I am just gonna log it: ",
      error
    );
  }
}

async function modifyUser(requestBody) {
  const params = {
    TableName: dynamoTableName,
    Key: {
      id: requestBody.id,
    },
    UpdateExpression: `set ${requestBody.updateKey} = :value`,
    ExpressionAttributeValues: {
      ":value": requestBody.updateValue,
    },
    ReturnValues: "UPDATED_NEW",
  };
  const command = new UpdateCommand(params);
  try {
    const response = await dynamo.send(command);
    const responseBody = {
      Operation: "UPDATE",
      Message: "SUCCESS",
      UpdatedAttributes: response,
    };
    return buildResponse(STATUS_CODE.SUCCESS, responseBody);
  } catch (error) {
    console.error(
      "Do your custom error handling here. I am just gonna log it: ",
      error
    );
  }
}

async function deleteUser(userID) {
  const params = {
    TableName: dynamoTableName,
    Key: {
      id: userID,
    },
    ReturnValues: "ALL_OLD",
  };
  const command = new DeleteCommand(params);
  try {
    const response = await dynamo.send(command);
    const responseBody = {
      Operation: "DELETE",
      Message: "SUCCESS",
      Item: response,
    };
    return buildResponse(STATUS_CODE.SUCCESS, responseBody);
  } catch (error) {
    console.error(
      "Do your custom error handling here. I am just gonna log it: ",
      error
    );
  }
}

async function getUsers() {
  const params = {
    TableName: dynamoTableName,
  };
  const response = await dynamo.send(new ScanCommand(params));
  const responseBody = {
    users: response.Items,
  };
  return buildResponse(STATUS_CODE.SUCCESS, responseBody);
}

// utility function to build the response
function buildResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}
