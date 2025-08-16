const { CloudWatchClient, PutMetricDataCommand } = require("@aws-sdk/client-cloudwatch");

const cloudwatch = new CloudWatchClient({ region: 'us-east-1' });

exports.handler = async (event) => {
  const output = {};
  
  for (const endpoint of event) {
    console.log("Requesting " + endpoint);
    
    try {
      const response = await fetch(endpoint, { timeout: 10000 });
      
      output[endpoint] = {
        statusCode: response.status,
        durationMS: Date.now() - new Date(response.headers.get('Date')).getTime()
      };
      console.log(endpoint + " : " + JSON.stringify(output[endpoint]));
    } catch (error) {
      output[endpoint] = {
        HTTPError: error.code || error.name,
        statusCode: 0,
        durationMS: 0,
      };
      console.error(error);
    }
    
    const params = {
      Namespace: 'Lambda-Ping/HTTP',
      MetricData: [
        {
          MetricName: 'StatusCode',
          Dimensions: [
            { Name: 'Endpoint', Value: endpoint },
          ],
          StatisticValues: {
            SampleCount: 1,
            Sum: output[endpoint]["statusCode"],
            Minimum: 0,
            Maximum: 1000,
          },
          Unit: 'None'
        },
        {
          MetricName: 'Latency',
          Dimensions: [
            { Name: 'Endpoint', Value: endpoint },
          ],
          StatisticValues: {
            SampleCount: 1,
            Sum: output[endpoint]["durationMS"],
            Minimum: 0,
            Maximum: 30000,
          },
          Unit: 'Milliseconds'
        }
      ]
    };
    
    try {
      await cloudwatch.send(new PutMetricDataCommand(params));
      console.log("Logged metrics in CloudWatch at: " + params['Namespace']);
    } catch (error) {
      console.error("Unexpected issue posting metrics to CloudWatch");
      console.error(error, error.stack);
    }
  }

  console.log("Final results:");
  console.log(JSON.stringify(output));
  
  return {
    statusCode: 200,
    body: JSON.stringify(output),
  };
};