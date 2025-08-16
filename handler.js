'use strict';

const AWS = require('aws-sdk');
const https = require('https');

// Configure AWS SDK for latest version
AWS.config.update({
  httpOptions: {
    timeout: 10000,
    agent: new https.Agent({ keepAlive: true })
  }
});

const cloudwatch = new AWS.CloudWatch();
module.exports.http = async (event, context) => {
  const output = {};

  // Iterate through each of the endpoints provided
  console.log('endpoints:', event);

  // Process all endpoints concurrently
  const endpointPromises = event.map(async (endpoint) => {
      console.log("Requesting " + endpoint);

    try {
      const response = await makeHttpRequest(endpoint);

      output[endpoint] = {
        statusCode: response.statusCode,
        durationMS: response.durationMS
      };

      console.log(endpoint + " : " + JSON.stringify(output[endpoint]));

      // Push metrics to CloudWatch
      await pushMetricsToCloudWatch(endpoint, response);

    } catch (error) {
      output[endpoint] = {
        HTTPError: error.code || 'UNKNOWN_ERROR',
        statusCode: 0,
        durationMS: 0,
          };

      console.log(endpoint + " : " + JSON.stringify(output[endpoint]));

      // Push error metrics to CloudWatch
      await pushMetricsToCloudWatch(endpoint, {
        statusCode: 0,
        durationMS: 0,
        isError: true
      });
    }
  });

  // Wait for all endpoint requests to complete
  await Promise.all(endpointPromises);
    console.log("Final results:");
    console.log(JSON.stringify(output));

  return output;
};

/**
 * Makes an HTTP request to the specified endpoint
 */
async function makeHttpRequest(endpoint) {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const req = https.get(endpoint, (res) => {
      const endTime = Date.now();

      resolve({
        statusCode: res.statusCode,
        durationMS: endTime - startTime
      });
    });

    req.on('error', (error) => {
      const endTime = Date.now();
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('REQUEST_TIMEOUT'));
    });
  });
}

/**
 * Pushes metrics to CloudWatch
 */
async function pushMetricsToCloudWatch(endpoint, response) {
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
          Sum: response.statusCode || 0,
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
          Sum: response.durationMS || 0,
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
    console.log("Unexpected issue posting metrics to CloudWatch");
    console.log(error, error.stack);
  }
};