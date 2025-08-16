'use strict';

const axios = require('axios');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

const cloudwatch = new CloudWatchClient({ region: 'us-west-2' });

module.exports.http = async (event, context) => {
  let output = {};

  const endpoints = event;
  console.log('endpoints:', endpoints);

  const requests = endpoints.map(async (endpoint) => {
    try {
      const response = await axios.get(endpoint, { timeout: 10000 });
      output[endpoint] = {
        statusCode: response.status,
        durationMS: response.headers['response-time']
      };
    } catch (error) {
      output[endpoint] = {
        HTTPError: error.code || 'Network Error',
        statusCode: 0,
        durationMS: 0
      };
    }
    console.log(endpoint + " : " + JSON.stringify(output[endpoint]));

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
            Sum: output[endpoint].statusCode,
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
            Sum: output[endpoint].durationMS,
            Minimum: 0,
            Maximum: 30000, // 30 seconds
          },
          Unit: 'Milliseconds'
        }
      ]
    };

    await cloudwatch.send(new PutMetricDataCommand(params));
    console.log("Logged metrics in CloudWatch at: " + params['Namespace']);
  });

  await Promise.all(requests);

  // Log the finalised output object, as well as returning it to the requester.
  console.log("Final results:");
  console.log(JSON.stringify(output));
  return output;
};