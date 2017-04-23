'use strict';

module.exports.http = (event, context, callback) => {
  var output  = {};

  // We use the https://www.npmjs.com/package/request package for our HTTP
  // calls since it makes things so easy.
  var request  = require('request');

  // The AWS SDK is shipped as part of the Lambda environment. We need it in
  // order to post metrics to CloudWatch.
  var AWS = require('aws-sdk');

  var cloudwatch = new AWS.CloudWatch();

  // Interate through each of the endpoints provided.
  var endpoints = event;
  console.log('endpoints:', endpoints);

  endpoints.forEach(

    function(endpoint) {
      console.log("Requesting " + endpoint);

      var requestObj = {
        "uri": endpoint,
        "time": true,
        "timeout": 10000, // milliseconds
      };

      request(requestObj, function (error, response, body) {
        // Debug only - goes to CloudWatch logs.
        //console.log('error:', error);
        //console.log('statusCode:', response && response.statusCode);

        // Create the stats for this request.
        if (error) {
          output[ endpoint ] = {
            "HTTPError": error.code,
            "statusCode": 0,
            "durationMS": 0,
          };
        } else {
          output[ endpoint ] = {
            "statusCode": response.statusCode,
            "durationMS": response.timingPhases.total
          };
        }

        console.log(endpoint +" : "+ JSON.stringify(output [ endpoint ]));



        // Push metrics to CloudWatch.
        var params = {
          Namespace: 'Lambda-Ping/HTTP',
          MetricData: [
            // StatusCode
            {
              MetricName: 'StatusCode',
              Dimensions: [
                {
                  Name: 'Endpoint',
                  Value: endpoint
                }
              ],
              StatisticValues: {
                SampleCount: 1,
                Sum: output[ endpoint ]["statusCode"],
                Minimum: 0,
                Maximum: 1000, // HTTP spec permits any three-digit status code
              },
              Unit: 'None'
            },
            // Latency (Response Time)
            {
              MetricName: 'Latency',
              Dimensions: [
                {
                  Name: 'Endpoint',
                  Value: endpoint
                }
              ],
              StatisticValues: {
                SampleCount: 1,
                Sum: output[ endpoint ]["durationMS"],
                Minimum: 0,
                Maximum: 30000, // 30 seconds
              },
              Unit: 'Milliseconds'
            }
          ]
        }

        cloudwatch.putMetricData(params, function(error, data) {
          if (error) {
            console.log("Unexpected issue posting metrics to CloudWatch");
            console.log(error, error.stack);
          } else {
            console.log("Logged metrics in Cloudwatch at: "+ params['Namespace']);
          }
        });

      });
    }
  );


  // We need to wait for all the callbacks to complete, otherwise we'll end up
  // not returning any, or only a subset, of the results.
  waitForCompletion();

  function waitForCompletion() {
    // Count of output objects should match count of endpoints
    if (Object.keys(output).length < endpoints.length) {
      setTimeout(waitForCompletion, 100);
      return;
    }

    // Log the finalised output object, as well as returning it to the requester.
    console.log("Final results:");
    console.log(JSON.stringify(output));
    callback(null, output);
  }

};
