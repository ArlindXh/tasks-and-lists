const dynamo = require("../common/dynamo");
const responseLib = require("../common/response");
const { v4: uuidv4 } = require("uuid");

const handler = async (event, context, callback) => {
  try {
    const parsedBody = JSON.parse(event.body);

    const httpMethod = event.httpMethod;
    const pathParams = event.pathParameters;

    switch (httpMethod.toLowerCase()) {
      case "get":
        if (pathParams) {
          const getResponse = await getSingleItem(pathParams.id, "task");
          return responseLib(getResponse);
        } else {
          const getAllResponse = await getAllTasks();
          return responseLib(getAllResponse);
        }
      case "post":
        const createResponse = await create(parsedBody, parsedBody.type);
        return responseLib(createResponse);
      case "put":
        const updateResponse = await update(
          pathParams.id,
          parsedBody,
          parsedBody.type
        );
        return responseLib(updateResponse);
      case "delete":
        const deleteResponse = await deleteTask(pathParams.id, pathParams.type);
        return responseLib(deleteResponse);
    }
  } catch (error) {
    console.log(error);
    return responseLib(error.message, 400);
  }
};

/**
 * Retrieves a task and its subtasks
 * @param {String} id 
 * @param {String} type 
 */
const getSingleItem = async (id, type, getSubtask = true) => {
  try {
    const params = {
      unique_id: id,
      type: type,
    };
    console.log(params)
    const { Item } = await dynamo.find(params);
    if (type === "task" && getSubtask) {
      let subtasks = await getSubtasks(Item.unique_id);
      Item.subtasks = subtasks;
    }

    return Item;
  } catch (error) {
    console.log(`Error while retrieving the task \n ${error}`);
  }
};

/**
 * Gets all the Tasks and Subtasks associated with them.
 */
const getAllTasks = async () => {
  try {
    const params = {
      KeyConditionExpression: "#type = :type",
      ExpressionAttributeNames: {
        "#type": "type",
      },
      ExpressionAttributeValues: {
        ":type": "task",
      },
    };
    const { Items } = await dynamo.query(params);
    const allTasks = await Promise.all(
      Items.map(async (item) => {
        let subtasks = await getSubtasks(item.unique_id);
        item.subtasks = subtasks;

        return item;
      })
    );
    return allTasks;
  } catch (error) {}
};


/**
 * Creates Tasks or Subtasks
 * @param {Object} body 
 * @param {String} type 
 */
const create = async (body, type) => {
  try {
    const item = {
      unique_id: uuidv4(),
      type: type,
      title: body.title,
      description: body.description,
      completed: body.completed,
      due_date: body.due_date,
    };

    if (type === "subtask") {
      if (!body.task_id) {
        throw new Error("Cannot create a subtask without a parent task");
      }
      //When creating a subtask we're checking if the parent is a task or a subtask. Subtasks cannot have other subtasks.
      const parentTask = await getSingleItem(body.task_id, "task", false);
      if(!parentTask || parentTask.type !== "task") {
        throw new Error("Cannot create subtasks inside subtasks")
      }
      item.task_id = body.task_id;
    }

    await dynamo.save(item);
    return `${type} created`;
  } catch (error) {
    console.log(`Error while adding task:\n ${error}`);
    throw error;
  }
};

/**
 * Updates Tasks or Subtasks
 * @param {String} id 
 * @param {Object} body 
 * @param {String} type 
 */
const update = async (id, body, type) => {
  const item = await getSingleItem(id, type);
  if (!item) {
    throw new Error("Task/Subtask doesn't Exist");
  }
  const params = {
    Key: {
      type: type,
      unique_id: id,
    },
    UpdateExpression: `set title = :t, description = :d, completed = :c, due_date = :dd`,
    ExpressionAttributeValues: {
      ":t": body.title || item.title || " ",
      ":d": body.description || item.description || " ",
      ":c": body.completed || item.completed || " ",
      ":dd": body.due_date || item.due_date || " ",
    },
    ReturnValues: "UPDATED_NEW",
  };

  if (type === "task") {
    params.ExpressionAttributeValues[":st"] = body.subtasks || item.subtasks;
    params.UpdateExpression = params.UpdateExpression + ", subtasks = :st";
  }

  const { Attributes: updateResponse } = await dynamo.updateSingleItem(params);
  updateResponse.type = item.type;
  updateResponse.unique_id = item.unique_id;
  console.log(updateResponse);

  return updateResponse;
};

/**
 * Deletes a Task or a Subtask
 * @param {String} id 
 * @param {String} type 
 */
const deleteTask = async (id, type) => {
  const params = {
    unique_id: id,
    type: type,
  };

  const response = await dynamo.removeRow(params);
  if (response.Attributes) {
    return `${response.Attributes.title} ${type} successfully removed`;
  } else {
    return `Unable to find task`;
  }
};

/**
 * Retrieves all the subtasks associated with the task_id
 * @param {String} taskId 
 */
const getSubtasks = async (taskId) => {
  const params = {
    KeyConditionExpression: "#type = :type",
    FilterExpression: "#task_id = :task_id",
    ExpressionAttributeNames: {
      "#type": "type",
      "#task_id": "task_id",
    },
    ExpressionAttributeValues: {
      ":type": "subtask",
      ":task_id": taskId,
    },
  };
  const response = await dynamo.query(params);
  if (response && response.Items) {
    return response.Items;
  } else {
    return [];
  }
};

module.exports = {
  handler: handler,
  getSingleItem: getSingleItem,
  getSubtasks: getSubtasks,
};
