"use strict";

const AWS = require("aws-sdk");

const localhost = {
  region: "localhost",
  endpoint: "http://dynamo:8000",
  accessKeyId: "MOCK_ACCESS_KEY_ID",
  secretAccessKey: "MOCK_SECRET_ACCESS_KEY",
  convertEmptyValues: true,
};

AWS.config.update(localhost);
AWS.config.setPromisesDependency(require("bluebird"));

const dynamoClient = new AWS.DynamoDB.DocumentClient();
const tableDynamo = "TasksAndLists";

const client = {
  save: (item, table = tableDynamo) => {
    const params = {
      TableName: table,
      Item: item,
    };

    return dynamoClient.put(params).promise();
  },

  find: (where) => {
    const params = {
      TableName: tableDynamo,
      Key: where,
    };

    return dynamoClient.get(params).promise();
  },

  query: (where) => {
    where.TableName = tableDynamo;
    return dynamoClient.query(where).promise();
  },

  scan: (params, limit, table = tableDynamo) => {
    params.TableName = table;
    return dynamoClient.scan(params).promise();
  },

  /**
   * Update Expression based on Key comparison
   */
  update: (key, expression, values, table = tableDynamo) => {
    const params = {
      TableName: table,
      Key: key,
      UpdateExpression: expression,
      ExpressionAttributeValues: values,
      ReturnValues: "UPDATED_NEW",
    };

    return dynamoClient.update(params).promise();
  },

  /**
   * Update item identified by Key
   */
  updateItem: (key, attributes, table = tableDynamo) => {
    const params = {
      TableName: table,
      Key: key,
      ReturnValues: "ALL_NEW",
      AttributeUpdates: attributes,
    };

    return dynamoClient.update(params).promise();
  },

  updateSingleItem: (params, table = tableDynamo) => {
    params.TableName = table;
    return dynamoClient.update(params).promise();
  },

  removeRow: (key, table = tableDynamo) => {
    const params = {
      TableName: table,
      Key: key,
      ReturnValues: "ALL_OLD",
    };

    return dynamoClient.delete(params).promise();
  },
};

module.exports = client;
