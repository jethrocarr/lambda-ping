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

The application can be deployed following the standard [Serverless Framework
procedures](https://serverless.com/). For example, to deploy a `prod` instance
to `ap-southeast-2`:

    serverless deploy --stage prod --region ap-southeast-2


# Usage

To use the Lambda manually, invoke the Lambda with a JSON object defining the
endpoints as an array:

    serverless invoke --stage prod --region ap-southeast-2 \
    --function http \
    --data '["http://www.google.com", "http://github.com"]'

The function returns a JSON object with the results.

Generally you'll probably want to automatically ping the endpoints on a regular
basis. To do this, create a CloudWatch event on a scheduled basis. This allows
you to have complete flexibility over when and how frequently you execute your
pings - for example, you might ping one endpoint every minute, whilst another
might only need to be once an hour.

To do this, first install the Lambda as per the instructions above. Then create
a new CloudWatch event by:

1. Access the CloudWatch Events console.
2. `Create Rule`
3. Select the `Schedule` option for `Event Source`.
4. Choose your desired rate of execution.
5. `Add Target`. It should default to `Lambda Function`.
6. Select the `ping-STAGE-http` Lambda from the dropdown.
7. Configure input to use `Constant (JSON text)`
8. Add the array of endpoints to test on this schedule.
   For example: `["http://www.google.com", "http://github.com"]`

You can create as many rules as you want, on as many different schedules as you
want. Note that is is more cost effective to test as many endpoints using the
fewest rules possible, since all endpoints in a single rule get tests
concurrently reducing our Lambda's execution time.



# Contributions

All manner of contributions are welcome in the form of a Pull Request.


# License

    Copyright (c) 2017 Jethro Carr

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
