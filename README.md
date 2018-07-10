# beaconstats-influx-async
Collect Bluetooth beacon advertisements and store it in [InfluxDB](https://github.com/influxdata/influxdb) using [Axiomware's](http://www.axiomware.com) [netrunr-gapi-async](http://www.axiomware.com/apidocs/index.html) Javascript SDK

This project contains two NodeJS programs:
- **appBeaconScanAsync.js** - This program collects data from Netrunr Gateways and inserts the data in Influx time-series database.
- **appDisplayBeaconStats.js** - This program runs continuous queries on the InfluxDB and display summary results

#### appBeaconScanAsync.js
This program performs the following functions:
- List all gateways associated with this account and use UI to select one or more of the gateways
- Connect to the selected gateway(s)
- Scan for advertisements
- Filter Bluetooth advertisements based in MAC ID
- Open a link to InfluxDB and store advertisement data and Meta-data.
- program runs until user signals using CTRL-C

#### appDisplayBeaconStats.js
This program performs the following functions:
- Connect to InfluxDB
- Query for advertisement information based on MAC ID and Gateway ID
- summarize data into tabular form  
- program runs until user signals using CTRL-C

## SDK, Documentation and examples
- [Netrunr B24C API Documentation](http://www.axiomware.com/apidocs/index.html)
- [Netrunr-gapi SDK](https://github.com/axiomware/netrunr-gapi-js)
  - [List of Netrunr-gapi examples](https://github.com/axiomware/list-of-examples-netrunr-gapi)
- [Netrunr-gapi-async SDK](https://github.com/axiomware/netrunr-gapi-async-js)
  - [List of Netrunr-gapi-async examples](https://github.com/axiomware/list-of-examples-netrunr-gapi-async)

## Requirements

- [Netrunr B24C](https://www.axiomware.com/netrunr-b24c-product/) or [Netrunr B24E](https://www.axiomware.com/netrunr-b24e-product/) gateway
- Axiomware cloud account. See the Netrunr [quick start guide](https://www.axiomware.com/netrunr-b24c-qs-guide/) on creating an account.
- Nodejs (see [https://nodejs.org/en/](https://nodejs.org/en/) for download and installation instructions)
  - Nodejs version 8.x.x is required due to the use of promises/async/await
- NPM (Node package manager - part of Nodejs)   
- [InfluxDB](https://docs.influxdata.com/influxdb/v1.5/introduction/installation/)
- [Grafana](http://docs.grafana.org/installation/windows/) - optional
- Windows, MacOS or Linux computer with access to internet
- One of more Bluetooth beacons or devices that are advertising.

**This example uses promises and async/await functionality present in Nodejs version 8.+**.

## Installation

The following steps assume that you have successfully installed Node.js. Following steps will have to be executed in a terminal window or command shell.

Clone the repo

`git clone https://github.com/axiomware/beaconstats-influx-async.git`

or download as zip file to a local directory and unzip.

Install all module dependencies by running the following command inside the directory

`npm install`


Make sure influxDB server is running by running:

`influxd.exe -config influxdb.conf`

## Usage

Run the nodejs data collector application:

    node appBeaconScanAsync.js

You can start initial run without specifying a filter file (see `advlist.json`) for an example of a filter file. If you have a list of devices that you want to track, create a new JSON file with the MAC IDs of all the devices that you want to track.

Open a separate command shell or terminal window and Next, run data summerization program.

    node appDisplayBeaconStats.js

    
To exit the programs, use:

    CTRL-C  

You can use [Grafana](https://grafana.com/) for visualization and dashboard. An example grafana dashboard is provides as `Beaconstats-1531197268913.json`. This file can be imported in Grafana.

## Error conditions/Troubleshooting

- If the program is not able to login, check your credentials.
- If the gateway is not listed in your account, it may not have been successfully provisioned. See the Netrunr [quick start guide](https://www.axiomware.com/netrunr-b24c-qs-guide/) for provisioning the gateway.
- Not able to get version information of the gateway. Check if gateway is powered ON and has access to internet. Also, check if firewall is blocking internet access.
- If you're not able to locate your device, check if your BLE device is advertising.

## Contributing

In lieu of a formal style guide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code.    
