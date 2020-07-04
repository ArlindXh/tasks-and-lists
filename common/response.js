"use strict";
const responseLib = (body, statusCode = 200) => {
  return {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    statusCode: statusCode,
    body: body !== null ? JSON.stringify(body) : "",
  };
};

module.exports = responseLib;
