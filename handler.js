
const { CloudWatchClient, PutMetricDataCommand } = require("@aws-sdk/client-cloudwatch");
const axios = require("axios");

exports.http = async (event, context, callback) => {
  const output = {};
  const cloudwatch = new CloudWatchClient({});
  const endpoints = event;
  console.log('endpoints:', endpoints);

  await Promise.all(endpoints.map(async (endpoint) => {
    console.log(`Requesting ${endpoint}`);
    let statusCode = 0;
    let durationMS = 0;
    let httpError = null;
    const start = Date.now();
    try {
      const response = await axios.get(endpoint, { timeout: 10000 });
      statusCode = response.status;
      durationMS = Date.now() - start;
    } catch (error) {
      httpError = error.code || error.message;
      statusCode = 0;
      durationMS = 0;
    }
    output[endpoint] = {
      HTTPError: httpError,
      statusCode,
      durationMS,
    };
    console.log(`${endpoint} : ${JSON.stringify(output[endpoint])}`);

    // Push metrics to CloudWatch
    const params = {
      Namespace: 'Lambda-Ping/HTTP',
      MetricData: [
        {
          MetricName: 'StatusCode',
          Dimensions: [
            {
              Name: 'Endpoint',
              Value: endpoint,
            },
          ],
          StatisticValues: {
            SampleCount: 1,
            Sum: statusCode,
            Minimum: 0,
            Maximum: 1000,
          },
          Unit: 'None',
        },
        {
          MetricName: 'Latency',
          Dimensions: [
            {
              Name: 'Endpoint',
              Value: endpoint,
            },
          ],
          StatisticValues: {
            SampleCount: 1,
            Sum: durationMS,
            Minimum: 0,
            Maximum: 30000,
          },
          Unit: 'Milliseconds',
        },
      ],
    };
    try {
      await cloudwatch.send(new PutMetricDataCommand(params));
      console.log(`Logged metrics in CloudWatch at: ${params.Namespace}`);
    } catch (err) {
      console.log("Unexpected issue posting metrics to CloudWatch");
      console.log(err);
    }
  }));

  // Log the finalised output object, as well as returning it to the requester.
  console.log("Final results:");
  console.log(JSON.stringify(output));
  callback(null, output);
};
