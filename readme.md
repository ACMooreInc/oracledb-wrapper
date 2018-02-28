# OracleDb Wrapper

## Methods

### Config Object Example: 
A configuration object containing information related to the database is required to connect. It is utilized by **prepareService** and **close**.
```
{
  db: {
        dbName: {
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
## getConnection
 If connection is passed return same connection

## prepareService
 Create the connection pools

## close

## releaseConn

## executePkg
 if connection is passed then query considered to be part of transaction and so no commit.
 if connection is not passed then query considered to be a standalone query and there will be autoCommit;

## executeQuery

## buildBindVariables
 Builds bind variables object for package calls
### Parameters:
#### inputStructure: *Array*
##### Elements: [Field name, Type, Dir, Required(boolean)]
|Types | | Dirs | |
| --- | --- | --- | ---|
|**Symbol** | **Value** | **Symbol** | **Value**
| S | String| I | BIND_IN
|N | Number | O | BIND_OUT
| D | Date | IO | BIND_INOUT
<!-- 
        Types: S = String, N = Number, D = Date
        Dirs: I = BIND_IN, O = BIND_OUT, IO = BIND_INOUT -->
##### inputStructure Example:
```javascript
let inputStructure = [
  ['employee', 'S', 'I', true],
  ['salary', 'N', 'I', true],
  ['hire_date', 'D', 'I', false]
  ['entry_id', 'N', 'O'],
  ['error_message', 'S', 'O']
];
```
#### input: *Object*
*The input object property names must match the field names in inputStructure*
##### input Example:
```javascript
let input = {
  employee: 'Sally Sales',
  salary: 100000,
  hire_date: '2017-03-17T17:47:08.000Z'
};
```

