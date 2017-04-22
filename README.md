# Lambda Ping

Lambda Ping is a small service which checks the HTTP response code and latency
for one or more supplied endpoints.


# How it works

Once supplied with a JSON list of HTTP or HTTPS endpoints, this Lambda hits them
concurrently and returns the status code and total query time. We take advantage
of NodeJS's callback model to allow easy concurrent execution when running the
tests.


# Why not ICMP?

Sadly there is no way to do ICMP pings from inside AWS Lambda currently - the
main issue is that the container environment that Lambdas run inside of lacks
the `CAP_NET_RAW` capability needed to allow an application to use raw sockets.

There's no way around this, even trying to use the command line `ping` utility
inside the Amazon Linux container the Lambda runs inside of won't work.

The annoyance of course is that this means anything you want to monitor needs
to be running a webserver of some kind. If you lack that option or don't wish
to install one, you could run a tiny one-page webserver on a higher port purely
for pinging with this Lambda.

You could use [one of the many higher languages to make a one line web server](https://gist.github.com/willurd/5720255)
or if you get really desperate, [here's one in C code](https://gist.github.com/jethrocarr/c56cecbf111af8c29791f89a2c30b978).


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

Invoke the Lambda with a JSON object defining the targets as an array:

    serverless invoke --stage prod --region ap-southeast-2 \
    --function http \
    --data '{"targets": ["http://www.google.com", "http://github.com"]}'

The function returns a JSON array.


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
