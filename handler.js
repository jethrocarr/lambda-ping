'use strict';

module.exports.http = (event, context, callback) => {
  var output  = {};

  // We use the https://www.npmjs.com/package/request package for our HTTP
  // calls since it makes things so easy.
  var request  = require('request');

  // Interate through each of the endpoints provided.
  var targets = event['targets'];
  console.log('targets:', targets);

  targets.forEach(

    function(target) {
      console.log("Requesting " + target);

      var requestObj = {
        "uri": target,
        "time": true,
      };

      request(requestObj, function (error, response, body) {
        // Debug only - goes to CloudWatch logs.
        //console.log('error:', error);
        //console.log('statusCode:', response && response.statusCode);

        if (error) {
          output[ target ] = {
            "HTTPError": error.errno
          };
        } else {
          output[ target ] = {
            "statusCode": response.statusCode,
            "durationMS": response.timingPhases.total
          };
        }

        console.log(target +" : "+ JSON.stringify(output [ target ]));
      });
    }
  );


  // We need to wait for all the callbacks to complete, otherwise we'll end up
  // not returning any, or only a subset, of the results.
  waitForCompletion();

  function waitForCompletion() {
    // Count of output objects should match count of targets
    if (Object.keys(output).length < targets.length) {
      setTimeout(waitForCompletion, 100);
      return;
    }

    // Log the finalised output object, as well as returning it to the requester.
    console.log("Final results:");
    console.log(JSON.stringify(output));
    callback(null, output);
  }

};
