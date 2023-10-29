const AWS = require("aws-sdk");
AWS.config.update( {
  region: "us-east-1"
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const dynamodbTableName = "demoapi";

const userPath = "/user";
const userParamPath = "/user/{id}";
const usersPath = "/users";

exports.handler = async function(event) {
  console.log("Request event method: ", event.httpMethod);
  console.log("EVENT\n" + JSON.stringify(event, null, 2));
  let response;
  switch(true) {

    case event.httpMethod === "GET" && event.requestContext.resourcePath === userPath:
    response = await getUser(event.queryStringParameters.id);
     break;

   case event.httpMethod === "GET" && event.requestContext.resourcePath === userParamPath:
    response = await getUser(event.pathParameters.id);
     break;

    case event.httpMethod === "GET" && event.requestContext.resourcePath === usersPath:
      response = await getUsers();
     break;

    case event.httpMethod === "POST" && event.requestContext.resourcePath === userPath:
      response = await saveUser(JSON.parse(event.body));
      break;

   case event.httpMethod === "PATCH" && event.requestContext.resourcePath === userPath:
      const requestBody = JSON.parse(event.body);
      response = await modifyUser(requestBody.id, requestBody.updateKey, requestBody.updateValue);
      break;

    case event.httpMethod === "DELETE" && event.requestContext.resourcePath === userPath:
      //response = await deleteUser(JSON.parse(event.body).id);
      response = await deleteUser(event.queryStringParameters.id);
      break;

    default:
      response = buildResponse(404, event.requestContext.resourcePath);
  }

 return response;
}

async function getUser(MemberId) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      "id": MemberId
    }
  }
  return await dynamodb.get(params).promise().then((response) => {
    return buildResponse(200, response.Item);
  }, (error) => {
    console.error("Do your custom error handling here. I am just gonna log it: ", error);
  });
}

async function getUsers() {
  const params = {
    TableName: dynamodbTableName
  }
  const allUsers = await scanDynamoRecords(params, []);
  const body = {
    users: allUsers
  }
  return buildResponse(200, body);
}

async function scanDynamoRecords(scanParams, itemArray) {
  try {
    const dynamoData = await dynamodb.scan(scanParams).promise();
    itemArray = itemArray.concat(dynamoData.Items);
    if (dynamoData.LastEvaluatedKey) {
      scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey;
      return await scanDynamoRecords(scanParams, itemArray);
    }
    return itemArray;
  } catch(error) {
    console.error('Do your custom error handling here. I am just gonna log it: ', error);
  }
}

async function saveUser(requestBody) {
  const params = {
    TableName: dynamodbTableName,
    Item: requestBody
  }
  return await dynamodb.put(params).promise().then(() => {
    const body = {
      Operation: "SAVE",
      Message: "SUCCESS",
      Item: requestBody
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error("Do your custom error handling here. I am just gonna log it: ", error);
  })
}

async function deleteUser(MemberId) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      "id": MemberId
    },
    ReturnValues: "ALL_OLD"
  }
  return await dynamodb.delete(params).promise().then((response) => {
    const body = {
      Operation: "DELETE",
      Message: "SUCCESS",
      Item: response
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error("Do your custom error handling here. I am just gonna log it: ", error);
  })
}

async function modifyUser(MemberId, updateKey, updateValue) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      "id": MemberId
    },
    UpdateExpression: `set ${updateKey} = :value`,
    ExpressionAttributeValues: {
      ":value": updateValue
    },
    ReturnValues: "UPDATED_NEW"
  }
  return await dynamodb.update(params).promise().then((response) => {
    const body = {
      Operation: "UPDATE",
      Message: "SUCCESS",
      UpdatedAttributes: response
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error("Do your custom error handling here. I am just gonna log it: ", error);
  })
}

 function buildResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
 }


}
