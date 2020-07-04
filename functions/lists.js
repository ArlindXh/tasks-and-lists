const dynamo = require("../common/dynamo");
const responseLib = require("../common/response");
const { v4: uuidv4 } = require("uuid");
const { getSingleItem, getSubtasks } = require("./tasksAndSubtasks");

module.exports.handler = async (event, context, callback) => {
  try {
    const parsedBody = JSON.parse(event.body);

    const httpMethod = event.httpMethod;
    const pathParams = event.pathParameters;

    switch (httpMethod.toLowerCase()) {
      case "get":
        if (pathParams) {
          const getResponse = await getSingleList(pathParams.id);
          return responseLib(getResponse);
        } else {
          const getAllResponse = await getAllLists();
          return responseLib(getAllResponse);
        }
      case "post":
        const createResponse = await createList(parsedBody);
        return responseLib(createResponse);
      case "put":
        const updateResponse = await updateList(pathParams.id, parsedBody);
        return responseLib(updateResponse);
      case "delete":
        const deleteResponse = await deleteList(pathParams.id);
        return responseLib(deleteResponse);
    }
  } catch (error) {
    console.log(error);
    return responseLib(error.message, 400);
  }
};

/**
 * Gets a single List including its tasks/subtasks
 * @param {String} id 
 */
const getSingleList = async (id) => {
  try {
    const params = {
      unique_id: id,
      type: "list",
    };
    const { Item } = await dynamo.find(params);
    let tasks = await getListTasks(Item.unique_id);
    Item.tasks = tasks;
    return Item;
  } catch (error) {
    console.log(`Error while retrieving the task \n ${error}`);
  }
};

/**
 * Gets all the lists, then gets all the tasks/subtasks of each list
 */
const getAllLists = async () => {
  try {
    const params = {
      KeyConditionExpression: "#type = :type",
      ExpressionAttributeNames: {
        "#type": "type",
      },
      ExpressionAttributeValues: {
        ":type": "list",
      },
    };
    const { Items } = await dynamo.query(params);
    const allLists = await Promise.all(
      Items.map(async (item) => {
        let tasks = await getListTasks(item.unique_id);
        item.tasks = tasks;

        return item;
      })
    );
    return allLists;
  } catch (error) {}
};

/**
 * Creates a new list, then updates all the tasks that are in task_ids by adding the list_id to them.
 * @param {Object} body 
 */
const createList = async (body) => {
  try {
    const item = {
      unique_id: uuidv4(),
      type: "list",
      title: body.title,
      description: body.description,
    };

    await dynamo.save(item);
    if (body.task_ids && body.task_ids.length !== 0) {
      await Promise.all(
        body.task_ids.map(async (taskId) => {
          await updateTaskReference(item.unique_id, taskId);
        })
      );
    }
    return "List Created";
  } catch (error) {
    console.log(`Error while adding list:\n ${error}`);
    throw error;
  }
};

/**
 * Update List title and description, then update  each task in the task_ids array to reference the list
 * @param {String} id 
 * @param {Object} body 
 */
const updateList = async (id, body) => {
  const item = await getSingleList(id);
  if (!item) {
    throw new Error("List doesn't Exist");
  }

  const params = {
    Key: {
      type: "list",
      unique_id: id,
    },
    UpdateExpression: `set title = :t, description = :d`,
    ExpressionAttributeValues: {
      ":t": body.title || item.title || " ",
      ":d": body.description || item.description || " ",
    },
    ReturnValues: "UPDATED_NEW",
  };

  const { Attributes: updateResponse } = await dynamo.updateSingleItem(params);
  if (body.task_ids && body.task_ids.length !== 0) {
    await Promise.all(
      body.task_ids.map(async (taskId) => {
        await updateTaskReference(item.unique_id, taskId);
      })
    );
  }
  updateResponse.type = item.type;
  updateResponse.unique_id = item.unique_id;
  console.log(updateResponse);

  return updateResponse;
};

const deleteList = async (id) => {
  const params = {
    unique_id: id,
    type: "list",
  };

  const response = await dynamo.removeRow(params);
  //TODO: When deleting a list we should also delete the list reference fromm the tasks
  if (response.Attributes) {
    return `${response.Attributes.title} list successfully removed`;
  } else {
    return `Unable to find list`;
  }
};

/**
 * Whenever we include a task into a list, we update that task reference, meaning we add the list_id to that task
 * @param {String} listId
 * @param {String} taskId
 * @param {String} type
 */
const updateTaskReference = async (listId, taskId, type = "task") => {
  const item = await getSingleItem(taskId, type);
  if (!item) {
    throw new Error("Task doesn't Exist");
  }
  const params = {
    Key: {
      type: type,
      unique_id: taskId,
    },
    UpdateExpression: `set list_id = :li`,
    ExpressionAttributeValues: {
      ":li": listId || "",
    },
    ReturnValues: "UPDATED_NEW",
  };

  const { Attributes: updateResponse } = await dynamo.updateSingleItem(params);
  updateResponse.type = item.type;
  updateResponse.unique_id = item.unique_id;
  console.log(updateResponse);

  return updateResponse;
};

/**
 * This function retrieves all the tasks associated with the list_id and then retrieves all the subtasks associated with the tasks
 * @param {String} listId
 */
const getListTasks = async (listId) => {
  const params = {
    KeyConditionExpression: "#type = :type",
    FilterExpression: "#list_id = :list_id",
    ExpressionAttributeNames: {
      "#type": "type",
      "#list_id": "list_id",
    },
    ExpressionAttributeValues: {
      ":type": "task",
      ":list_id": listId,
    },
  };
  const { Items } = await dynamo.query(params);
  if (Items && Items.length > 0) {
    const tasksWithSubtasks = await Promise.all(
      Items.map(async (item) => {
        let subtasks = await getSubtasks(item.unique_id);
        item.subtasks = subtasks;

        return item;
      })
    );
    return tasksWithSubtasks;
  } else {
    return [];
  }
};
