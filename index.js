'use strict';

var oracledb = require('oracledb'),
    path = require('path'),
    async = require('async'),
    dbs = {},
    pools = {};

exports.oracledb = oracledb;

var connCount = 0;
var gracefulExit = function () {
    async.each(pools, function (pool, callback) {
        if (pool && pool.terminate) {
            pool.terminate(function (err) {
                if (err) {
                    console.error('Error: Closing Oracle connection pool', err);
                    callback(err);
                } else {
                    callback(null);
                }
            });
        }
        callback(null);
    }, function (error) {
        console.log('Terminating');
        process.exit(error ? 1 : 0);
    });
};

exports.getConnection = getConnection;

function getConnection(dbOrConn, callback) {
    // If connection is passed return same connection
    if (dbOrConn.execute && typeof dbOrConn.execute === 'function') {
        return callback(null, dbOrConn);
    }
    let db = dbOrConn;
    var pool = pools[db];
    if (!pool) {
        addPool(db, function (err, pool) {
            if(err) {
                callback(err);
                return;
            }
            pool.getConnection(function (err, conn) {
                callback(err, conn);
            });
        });
    } else {
        pool.getConnection(function (err, conn) {
            callback(err, conn);
        });
    }
}
// Create the connection pools
exports.prepareService = function (dbConfig, callback) {
    if (!dbConfig) {
        if(callback) callback();
        return;
    }
    Object.keys(dbConfig).forEach(function (db) {
        dbs[db] = dbConfig[db];
    });
    if(callback) callback();
};

function addPool(dbconn, cb) {
    oracledb.createPool(
        dbs[dbconn],
        function (err, result) {
            if (err) {
                console.error('Error while creating connection pool for ' + dbconn + '\ngot error' + err.message);
                // process.exit(1);
            }
            pools[dbconn] = result;
            if (cb) cb(err, result);
        }
    );
}

exports.close = function (dbConfig, cb) {
    Object.keys(dbConfig.db).forEach(function (dbconn) {
        if (pools[dbconn]) {
            pools[dbconn].close(cb);
        }
    });
};

function executeFlatQuery(options, cb) {
    var connMain = options.conn;
    var db = options.db;
    var qry = options.qry;
    var bindvars = options.bindvars;
    var qryOptions = options.qryOptions;

    // Grab connection from pool and execute query
    getConnection(connMain || db, function (err, conn) {
        if (err) {
            cb(err, null);
            return null;
        }
        var stream = conn.queryStream(qry, bindvars, qryOptions);
        if (!connMain) {
            stream.on('end', function () {
                release(conn);
            });

            stream.on('error', function (error) {
                release(conn);
            });
        }
        cb(null, stream);
    });
}

exports.releaseConn = release;

function release(conn, info) {
    if (conn) {
        conn.release(function (err) {
            if (err) {
                console.error('Error: Releasing connection', info);
            }
        });
    }
}

function processBindVars(bindvars) {
    Object.keys(bindvars).forEach(function (key) {
        if (typeof bindvars[key] !== 'object') {
            bindvars[key] = {
                val: bindvars[key]
            };
        }
    });
}

// if connection is passed then query considered to be part of transaction and so no commit.
// if connection is not passed then query considered to be a standalone query and there will be autoCommit;
exports.executePkg = executePkg;

function executePkg(options, done) {

    var db = options.db;
    var qry = options.qry;
    var bindvars = options.bindvars;
    var conn = options.conn;
    var noTrans = false;
    var lcaseQry = qry.toLowerCase();
    if (lcaseQry.indexOf('begin') !== -1 && lcaseQry.indexOf('end') !== -1) {
        processBindVars(bindvars);
    }
    async.waterfall([
        function (callback) {
            if (conn) {
                callback(null, conn);
            } else {
                noTrans = true;
                getConnection(db, callback);
            }
        },
        function execPkg(cn, callback) {
            conn = cn;
            conn.execute(qry, bindvars, {
                outFormat: oracledb.OBJECT,
                autoCommit: noTrans
            }, callback);
        },
        function checkErr(data, callback) {
            var err;
            if (data && data.outBinds && data.outBinds.v_Return === 0) {
                err = {
                    message: data.outBinds.OERROR_MESSAGE ? data.outBinds.OERROR_MESSAGE : 'Something is wrong with database call'
                };
            }
            callback(err, data);
        }
    ], function (err, data) {
        if (noTrans) {
            release(conn);
        }
        if (err) {
            err.data = err.data || {};
            err.data.qry = qry;
        }
        done(err, data);
    });
}

function selectQuery(options, cb) {
    var conn = options.conn;
    var db = options.db;
    var qrydata = options.qrydata || {};
    var flatQry = options.flatQry;
    var bindvars = options.bindvars || [];
    var outFormat = options.outFormat || oracledb.OBJECT;
    var num_rows;
    async.waterfall([
        function (callback) {
            if (qrydata.pagination) {
                if (flatQry) {
                    callback({
                        message: 'Pagination is not supported with flat queries'
                    });
                }
                // Get row count
                var fields = qrydata.fields;
                var qdata_count = {
                    fields: 'count(*) NUM_ROWS',
                    from_objects: qrydata.from_objects,
                    where_clause: qrydata.where_clause,
                    order_by: qrydata.order_by
                };
                selectQuery({
                    db: db,
                    qrydata: qdata_count,
                    bindvars: bindvars,
                    outFormat: outFormat
                },
                    callback
                );
            } else {
                callback(null, {}); // need to pass some positive value as second param to get callback in effect
            }
        },
        function (count_data, callback) {
            if (qrydata.pagination && count_data.result) {
                num_rows = count_data.result[0].NUM_ROWS;
                if (num_rows === 0) {
                    if (num_rows === 0) {
                        return callback(null, null);
                    }
                    return;
                }
                if (qrydata.pagination) {
                    bindvars.push((qrydata.pagination.page_size * (qrydata.pagination.page_number - 1)) + 1);
                    bindvars.push(qrydata.pagination.page_size * qrydata.pagination.page_number);
                }
            }

            flatQry = flatQry || buildQuery(qrydata);
            executeFlatQuery({
                db: db,
                conn: conn,
                qry: flatQry,
                bindvars: bindvars,
                qryOptions: {
                    outFormat: outFormat
                }
            }, callback);
        },
        function (stream, callback) {
            if (!stream) {
                return callback(null, {
                    result: []
                });
            }
            var response = {
                result: new Array(300000000)
            };
            var ind = 0;
            stream.on('error', function (error) {
                callback(error, {});
            });
            stream.on('data', function (data) {
                response.result[ind++] = data;
            });
            stream.on('metadata', function (metadata) {
                response.metaData = metadata;
            });
            stream.on('end', function () {
                response.result.length = ind;
                callback(null, response);
            });
        },
        function (response, callback) {
            if (qrydata.pagination) {
                response.paging = {
                    total_pages: num_rows ? Math.floor(num_rows / qrydata.pagination.page_size) + 1 : 1,
                    current_page: qrydata.pagination.page_number,
                    page_size: qrydata.pagination.page_size,
                    total_count: num_rows
                };
            }
            callback(null, response);
        }
    ],
        cb
    );
}

exports.executeQuery = selectQuery;

function getFieldNamesOnly(fields) {
    // Removing all the brackets and commas in between
    fields = fields.replace(/\([^)]*\)/g, '').replace(/\)/g, '');

    return fields.split(',').map(function (value) {
        var field = value.trim();
        if (field.includes(' ')) return field.substring(field.lastIndexOf(' ') + 1); // alias
        if (field.includes('.')) return field.substring(field.indexOf('.') + 1); // remove table/view name
        return field;
    });
}

function buildQuery(qrydata) {
    let qry;
    if (qrydata.pagination) {
        qry = 'select ' + getFieldNamesOnly(qrydata.fields) + ' from' +
            '  (select ' + qrydata.fields +
            '    , ' + (qrydata.pagination.paginate_by?'dense_rank':'row_number') + '() over' +
            '    (order by ' + (qrydata.pagination.paginate_by||qrydata.order_by) + ') rn' +
            '    from ' + qrydata.from_objects +
            (qrydata.where_clause ? '       where ' + qrydata.where_clause : '') + ')' +
            ' where rn between :n and :m' +
            ' order by rn';
        return qry;
    }
    qry = 'select ' + qrydata.fields +
        ' from ' + qrydata.from_objects +
        (qrydata.where_clause ? ' where ' + qrydata.where_clause : '') +
        (qrydata.order_by ? ' order by ' + qrydata.order_by : '');
    return qry;
}

exports.buildBindVariables = function (inputStructure, input) {
    let result = {};
    let missingParams = [];
    inputStructure.forEach(function (value) {
        if (value[2].startsWith('I') && value[3] && !input[value[0]]) {
            // Value is input, required, and missing
            missingParams.push(value[0]);
            return;
        }
        let bindvar = {};
        let isInput = true;
        switch (value[2]) {
            case 'I':
                bindvar.dir = oracledb.BIND_IN;
                break;
            case 'IO':
                bindvar.dir = oracledb.BIND_INOUT;
                break;
            case 'O':
                bindvar.dir = oracledb.BIND_OUT;
                isInput = false;
                break;
        }
        if (isInput) bindvar.val = input[value[0]];
        switch (value[1]) {
            case 'S':
                bindvar.type = oracledb.STRING;
                break;
            case 'N':
                bindvar.type = oracledb.NUMBER;
                if (isInput && bindvar.val) bindvar.val = Number(bindvar.val);
                break;
            case 'D':
                bindvar.type = oracledb.DATE;
                if (isInput && bindvar.val) bindvar.val = new Date(bindvar.val);
                break;
        }
        result[(value[2] + '_' + value[0]).toUpperCase()] = bindvar;
    });

    if (missingParams.length > 0) {
        result = {
            error: 'Missing parameters: ' + missingParams.join()
        };
    }

    return result;
};
