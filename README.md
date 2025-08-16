# Lambda Ping

Lambda Ping is a small service which checks the HTTP response code and latency
for one or more supplied endpoints. It returns this data both directly in the
form of a JSON object that can be consumed by other applications, as well as
saving the results to CloudWatch.

Because the data is in CloudWatch, you can use the results to trigger other
events when an endpoint fails/recovers or performs too slowly by creating
CloudWatch Alarms with the metrics recorded. For example, it becomes very easy
to send alerts on endpoint health, trigger another Lambda or consume the alarm
with another AWS service such as Route53 failover.

![Cloudwatch Example](https://cloud.githubusercontent.com/assets/622282/25309581/29f2828a-2825-11e7-844d-714083086c80.png)


# How it works

Once supplied with a JSON list of HTTP or HTTPS endpoints, this Lambda hits them
concurrently and returns the status code and total query time. We take advantage
of NodeJS's callback model to allow easy concurrent execution when running the
tests, so the Lambda only runs for as long as it takes for the slowest query to
complete. A max timeout of 10 seconds applies.


# Why not ICMP?

Sadly there is no way to do ICMP pings from inside AWS Lambda currently - the
main issue is that the container environment that Lambdas run inside of lacks
the `CAP_NET_RAW` capability needed to allow an application to use raw sockets.

There's no way around this, even trying to use the command line `ping` utility
inside the Amazon Linux container the Lambda runs inside of won't work.

The annoyance of course is that this means anything you want to monitor needs
to be running a webserver of some kind. It doesn't have to be a full-blown
installation of Apache, you could use [one of the many higher languages to make
a one line web server](https://gist.github.com/willurd/5720255) or if you get
really desperate, [here's one in C code](https://gist.github.com/jethrocarr/c56cecbf111af8c29791f89a2c30b978).


# This sucks, I want better metrics

If you're really serious about your monitoring and metrics, you probably want
to look at something like [Smokeping](http://oss.oetiker.ch/smokeping/) which
has much better stats and graphing for the purpose of packet loss and latency
than this Lambda will ever be capable of with CloudWatch graphs.


# Installation

1. Install the AWS SAM CLI: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
2. Build the application:
   ```sh
   sam build
   ```
3. Deploy the application:
   ```sh
   sam deploy --guided
   ```


# Usage

To use the Lambda manually, invoke the Lambda with a JSON object defining the
endpoints as an array:
   ```sh
   sam remote invoke PingFunction --stack-name lambda-ping --event '["http://www.google.com", "https://www.jethrocarr.com"]'
    ```

The function returns a JSON object with the results.

    {
        "http://www.google.com": {
            "statusCode": 200,
            "durationMS": 169.88141500001075
        },
        "https://www.jethrocarr.com": {
            "statusCode": 200,
            "durationMS": 6757.3228579999995
        }
    }

Generally you'll probably want to automatically ping the endpoints on a regular
basis. To do this, create a EventBridge schedule. This allows you to have complete
flexibility over when and how frequently you execute your pings - for example,
you might ping one endpoint every minute, whilst another might only need to be
once an hour.

To do this, modify the `CloudWatch Event Configuration` section in `template.yaml`
and then build and deploy the SAM package.
```yaml
...
      Events:
        ScheduledPing:
          Type: Schedule
          Properties:
            Schedule: rate(5 minutes)
            Input: '["https://www.jethrocarr.com", "https://www.google.com"]'
```


Or you can manually create a new scheduled event using Amazon EventBridge:

1. Open the Amazon EventBridge console in AWS.
2. Select `EventBridgeSchedule`
3. Click `Create rule`.
4. Set your desired schedule expression (e.g., `rate(5 minutes)` or a cron expression).
5. Under `Target`, choose `Lambda function`.
6. Select your Lambda function (e.g., `ping-STAGE-http`) from the dropdown.
7. In the `Configure input` section, choose `Constant (JSON text)` and provide the array of endpoints to test on this schedule.
    For example: `["http://www.google.com", "http://github.com"]`
8. Complete the rule creation process.

You can create as many EventBridge rules as you want, on as many different schedules as you need. For cost efficiency, test as many endpoints as possible using the fewest rules, since all endpoints in a single rule are tested concurrently, reducing Lambda execution time.

You can create as many rules as you want, on as many different schedules as you
want. Note that is is more cost effective to test as many endpoints using the
fewest rules possible, since all endpoints in a single rule get tests
concurrently reducing our Lambda's execution time.

![Example CloudWatch Event](https://cloud.githubusercontent.com/assets/622282/25309614/e003991a-2825-11e7-87ad-ffc24482e010.png)


# Contributions

All manner of contributions are welcome in the form of a Pull Request.


# License

    Copyright (c) 2025 Jethro Carr

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
