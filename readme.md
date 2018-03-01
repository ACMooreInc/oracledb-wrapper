# OracleDb Wrapper

## Methods

### prepareService
Create the connection pools for provided databases
```javascript
prepareService(config, callback);
```
#### Parameters:
##### config: *object*
A configuration object containing information related to the database is required to connect. It is utilized by **prepareService** and **close**
###### config Example:
```javascript
{
  db: {
        databaseName: {
            'connectString': 'dbconnect',
            'poolMin': 4,
            'poolMax': 200,
            'poolIncrement': 4,
            'poolTimeout': 60,
            'user': 'db_user_name',
            'password': 'db_pass',
            'queueRequests': true,
            'queueTimeout': 0
        },
        other db connections...
}
```
___

### getConnection
If connection is passed return same connection, otherwise create the connection
```javascript
getConnection(dbOrConnection, callback);
```
#### Parameters:
##### dbOrConnection:


TODO: DEFINE

___

### releaseConn
Releases the database connection
```javascript
release(connection, info);
```
#### Parameters:
##### connection:
Reference to the established connection

##### info: *string*
Debugging information, will be logged if any error is encountered while releasing the connection
___

### close
Closes the database connection pool
```javascript
close(config, callback);
```
#### Parameters:
##### config:
See **prepareService**
___

### selectQuery
Executes a select query to the database
```javascript
executeQuery(options, callback);
```
#### Parameters:
##### options: *object*
|Field | Type | Required | Value |
| --- | --- |--- | --- |
|conn | TBD | true| database connection |
|db   | string | true | database name as defined in the config object used to prepare the service|
|qrydata | object | false | object containing query data, details below |
|flatQry |string | false | string defining the query to be executed|
|bindvars | object or array | false | defines the bind variables for the query, details below|
|outFormat | TBD | false | defines the outformat of the query. defaults to oracledb.OBJECT|
|isFlatQry | boolean | false? | flag indicating flat query is being used |

###### qrydata: 
|Field | Type | Required| Value|
| --- | --- |--- | --- |
|fields | string | true | fields to be retrieved in query |
|from_objects | string | true | objects to be queried |
|where_clause | string | false | additional criteria for query |
|order_by | string | false | field or fields to order results by| 

###### bindvars: *object*
|Field | Type | Required | Value |
| --- | --- |--- | --- |
|val  | value type | false | the value being used in the package call, omitted if value is out bound |
|type | oracledb type | false | the oracledb type of the value, only required if value is vartype |
|dir  | oracledb.BIND_IN/BIND_OUT/BIND_INOUT | false | defines if value is in bound, out bound, or both |
###### bindvars *object* Example:
```javascript
var bindvars = {
  I_EMPLOYEE_ID: {
      val: employeeId,
      type: oracledb.NUMBER,
      dir: oracledb.BIND_IN
  },
  O_ERROR_MESSAGE: {
      type: oracledb.STRING,
      dir: oracledb.BIND_OUT
  },
  v_Return: {
      type: oracledb.NUMBER,
      dir: oracledb.BIND_OUT
  }
};
```
##### bindvars: *array*
If the bind variables are simple values, they can be passed in an array
###### bindvars *array* Example:
```javascript
var iemployee_id = employeeId
var iemployee_name = employeeName
var bindvars = [iemployee_id., iemployee_name];
```
___

### executePkg
Executes a package call to the database
```javascript
executePkg(options, callback);
```
 If connection is passed in the options variable then query considered to be part of transaction and there will be no commit
 If connection is not passed in the options variable then query considered to be a standalone query and there will be an autoCommit

#### Parameters:
##### options: *object*
|Field | Type | Required | Value |
| --- | --- |--- | --- |
|conn | TBD | true| database connection |
|db   | string | true | database name as defined in the config object used to prepare the service|
|qry |string | false | string defining the package call to be executed|
|bindvars | object or array | false | defines the bind variables for the query, see **executeQuery** for exmaples|

___

### buildBindVariables
 Builds bind variables object for package calls
```javascript
buildBindVariables(inputStructure, input);
```
#### Parameters:
##### inputStructure: *Array*
###### Elements: [Field name, Type, Dir, Required(boolean)]
|**Types** | |
| --- | --- |
|**Symbol** | **Value** |
| S | String|
| N | Number | 
| D | Date |

| **Dirs** | |
| --- | ---|
| **Symbol** | **Value**|
| I | BIND_IN |
| O | BIND_OUT | 
| IO | BIND_INOUT|
###### inputStructure Example:
```javascript
let inputStructure = [
  ['employee', 'S', 'I', true],
  ['salary', 'N', 'I', true],
  ['hire_date', 'D', 'I', false]
  ['entry_id', 'N', 'O'],
  ['error_message', 'S', 'O']
];
```
##### input: *Object*
The input object property names must match the field names in inputStructure
###### input Example:
```javascript
let input = {
  employee: 'Sally Sales',
  salary: 100000,
  hire_date: '2017-03-17T17:47:08.000Z'
};
```
