 Only produce the original code's logic but rewrite it with the above suggestions.

I will do the new code from scratch.

'use strict';

const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
const https = require('https');

const cloudwatchClient = new CloudWatchClient({});
module.exports.http = async (event, context) => {
  const output = {};

  console.log('endpoints:', event);

  const endpointPromises = event.map(async (endpoint) => {
      console.log("Requesting " + endpoint);

    try {
      const response = await makeHttpRequest(endpoint);

      output[endpoint] = {
        statusCode: response.statusCode,
        durationMS: response.durationMS
      };

      console.log(endpoint + " : " + JSON.stringify(output[endpoint]));

      await pushMetricsToCloudWatch(endpoint, response);

    } catch (error) {
      output[endpoint] = {
        HTTPError: error.code || 'UNKNOWN_ERROR',
        statusCode: 0,
        durationMS: 0
          };

      console.log(endpoint + " : " + JSON.stringify(output[endpoint]));

      await pushMetricsToCloudWatch(endpoint, {
        statusCode: 0,
        durationMS: 0,
        isError: true
      });
    }
  });

  await Promise.all(endpointPromises);

    console.log("Final results:");
    console.log(JSON.stringify(output));

  return output;
};

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
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('REQUEST_TIMEOUT'));
    });
  });
}

async function pushMetricsToCloudWatch(endpoint, response) {
  const params = {
    Namespace: 'Lambda-Ping/HTTP',
    MetricData: [
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
          Maximum: 1000,
        },
        Unit: 'None'
      },
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
          Maximum: 30000,
        },
        Unit: 'Milliseconds'
      }
    ]
  };

  try {
    const command = new PutMetricDataCommand(params);
    await cloudwatchClient.send(command);
    console.log("Logged metrics in CloudWatch at: " + params['Namespace']);
  } catch (error) {
    console.log("Unexpected issue posting metrics to CloudWatch");
    console.log(error, error.stack);
  }
}
