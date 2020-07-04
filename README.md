### Tasks and Lists Functionality

This is the backend implementation of creating/updating tasks,subtasks and lists.


**Development environment**

`npm run docker` - to start the application

This will create 2 docker containers for local development.
One is for serverless(lambdas,endpoints), the other one is for a local DynamoDB.

The applications will start on `http://localhost:3000`

Application is built with NodeJs,Serverless.
There are only 2 lambdas.
There's only 1 DynamoDB Table *TasksAndLists* holding all the tasks/subtasks/lists with "type" as HASH KEY and "unique_id" as SORT KEY

##Available API-s

##TASKS AND SUBTASKS
- **GET** /tasks/get  - *Retrieves all the tasks and their subtasks*
- **GET** /tasks/get/{id}  - *Retrieves a single task with its subtasks*
- **CREATE** /create  - *Creates tasks or subtasks based on the "type" property*
`{"type": "task",
    "title": "Title Task",
    "description": "Task Description",
    "due_date": "Tomorrow",
    "completed":false,
}`
> If you're creating a task you can also attach a "list_id" to reference the list where the task belongs to.
- **EDIT** /edit/{id}  - *Updates a task or a subtask*
`{"type": "task",
    "title": "Updated Title Task",
    "description": "UpdatedTask Description",
    "due_date": "Tomorrow",
    "completed":true,
}`
> If you're updating a task, you can also update their "list_id" reference
- **DELETE** /delete/{type}/{id} - Deletes a task or subtask based on the type and id provided.


##LISTS

- **GET** /lists/get  - *Retrieves all the lists and their tasks/subtasks*
- **GET** /lists/get/{id}  - *Retrieves a single list with its tasks/subtasks*
- **POST** /lists/create  - *Creates a new list*
`{"type": "list",
    "title": "New List",
    "description": "List Description",
    "task_ids": ["task_id_1","task_id_2"]
}`
> When creating a list you can attach an array of "task_ids" that the list should have.
- **PUT** /lists/edit/{id}  - *Updates a list*
`{"type": "list",
    "title": "Updated List",
    "description": "List Description",
    "task_ids": ["task_id_1","task_id_2","task_id_3"]
}`
- **DELETE** /lists/delete/{id} - Deletes a list

