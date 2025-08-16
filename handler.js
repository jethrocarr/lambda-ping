'use strict';

const request = require('request-promise-native');
const AWS = require('aws-sdk');

exports.http = async (event, context) => {
  const output = {};
  
  // The AWS SDK is shipped as part of the Lambda environment. We need it in order to post metrics to CloudWatch.
  const cloudwatch = new AWS.CloudWatch();
  
  // Interate through each of the endpoints provided.
  for (const endpoint of event) {
    console.log("Requesting " + endpoint);
    
    try {
      const response = await request({
        uri: endpoint,
        time: true,
        timeout: 10000, // milliseconds
      });
      
      output[endpoint] = {
        statusCode: response.statusCode,
        durationMS: response.timingPhases.total
      };
      console.log(endpoint + " : " + JSON.stringify(output[endpoint]));
    } catch (error) {
      output[endpoint] = {
        HTTPError: error.code,
        statusCode: 0,
        durationMS: 0,
      };
      console.error(error);
    }
    
    // Push metrics to CloudWatch.
    const params = {
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
            Sum: output[endpoint]["statusCode"],
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
            Sum: output[endpoint]["durationMS"],
            Minimum: 0,
            Maximum: 30000, // 30 seconds
          },
          Unit: 'Milliseconds'
        }
      ]
    };
    
    try {
      await cloudwatch.putMetricData(params).promise();
      console.log("Logged metrics in CloudWatch at: " + params['Namespace']);
    } catch (error) {
      console.error("Unexpected issue posting metrics to CloudWatch");
      console.error(error, error.stack);
    }
  }

  // Log the finalised output object, as well as returning it to the requester.
  console.log("Final results:");
  console.log(JSON.stringify(output));
  
  return {
    statusCode: 200,
    body: JSON.stringify(output),
  };
};