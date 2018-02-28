Config Object Example: 

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

documentation TODO: 

getConnection
  // If connection is passed return same connection

prepareService
  // Create the connection pools

close

releaseConn

executePkg
  // if connection is passed then query considered to be part of transaction and so no commit.
  // if connection is not passed then query considered to be a standalone query and there will be autoCommit;

executeQuery

buildBindVariables
  // Builds bind variables object for package calls
  // Parameters:
  //  * inputStructure: Array
  //    --Elements: [Field name, Type, Dir, Required(boolean)]
  //        Types: S = String, N = Number, D = Date
  //        Dirs: I = BIND_IN, O = BIND_OUT, IO = BIND_INOUT
  //
  //    --Example
  //      let inputStructure = [
  //        ['entry_data', 'S', 'I', true],
  //        ['source_desc', 'S', 'I', false],
  //        ['source_attr', 'N', 'I', false],
  //        ['entry_timestamp', 'D', 'I', false],
  //        ['entry_id', 'N', 'O'],
  //        ['error_message', 'S', 'O']
  //      ];
  //
  //  * input: Object
  //    The input object property names must match the field names in inputStructure
  //    -- Example
  //        let input = {
  //          entry_data: 'Sample data',
  //          source_attr: 123,
  //          entry_timestamp: '2017-03-17T17:47:08.000Z'
  //        }; 

