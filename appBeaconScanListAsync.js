// Copyright 2017,2018 Axiomware Systems Inc. 
//
// Licensed under the MIT license <LICENSE-MIT or 
// http://opensource.org/licenses/MIT>. This file may not be copied, 
// modified, or distributed except according to those terms.
//

//Add external modules dependencies
var netrunr = require('netrunr-gapi-async');
var chalk = require('chalk');
var figlet = require('figlet');
var CLI = require('clui');
var fs = require('fs');
const JSON5 = require('json5');
const Influx = require('influx');
var myCLUI = require('./lib/lib-clui-utils.js');
var myUtils = require('./lib/lib-generic-utils.js');
var BLEdev = require('./lib/lib-BLEdevice-utils.js');

//Gobal variables
const gapiMain = new netrunr('');                       //Create a Netrunr gateway instance
const gwArray = [];                                     //Object per gateway
var exitFlag = false;                                   //set flag when exiting
var statusList = new CLI.Spinner('Scanning ...');       //UI widget to show busy operation
var influxDB_OK = true;

//Global to capture most variables that are related to gateway
function multiGW(user, pwd, gwid) {
    this.user = user;
    this.pwd = pwd;
    this.gwid = gwid;
    this.gapiAsync = new netrunr('');
    this.advRate = 0;
}

//User configuration
var userConfig = {
    scanParameters: {
        'period': 1,    // seconds of advertising scan
        'active': 1,      // 1-> active scan, 0-> passive scan
    },
    advFilter: null
};

//Application start
main(); // Call main function

/**
 * Main program entry point
 * 
 */
async function main() {
    init()//Setup CTRL-C and exit handlers

    console.log(chalk.green.bold(figlet.textSync('NETRUNR B24C/E', { horizontalLayout: 'default' })));
    console.log(chalk.green.bold('Beacon Scanner (Async version) Application with Multi-Gateway support'));
    console.log(chalk.red.bold('Press Ctrl-C to exit'));

    try {
        let cred = await myCLUI.getCredentials();//get user credentials (CLI)
        try {
            ret = await gapiMain.auth(cred);//try auth - if JWT token is ok, this will work
        }
        catch (err) { //otherwise use login - don't use logout when exiting. Logout will invalidate the current token
            ret = await gapiMain.login(cred);//login
        }

        let gwidList = await myCLUI.selectMultiGateway(ret.gwid);//get gateway Selection (CLI)
        if (!gwidList) {
            await axShutdown(3, 'No Gateways Selected. Shutting down...');//Exit program 
        }

        userConfig.scanParameters = await myCLUI.getScanPeriodType();//get scan parameters 

        advFilterFileName = await myCLUI.useADVFilter();//get scan parameters 
        if (advFilterFileName) {
            if (fs.existsSync(advFilterFileName)) {
                var filterObj = fs.readFileSync(advFilterFileName, 'utf8');
                userConfig.advFilter = JSON5.parse(filterObj).devList.map(item => item.toUpperCase());
            }
            else
                await axShutdown(3, 'File does not exist... ' + advFilterFileName);//Error - exit
        }

        for (let i = 0; i < gwidList.length; i++) {
            gwArray[i] = new multiGW(cred.user, cred.pwd, gwidList[i]);//create an instance of netrunr object for each gateway
            mainLogin(gwArray[i]);
        }
        //statusList.start();
        //displayScanResults(1500);
    } catch (err) {
        await axShutdown(3, 'Error! Exiting... ' + JSON.stringify(err, Object.getOwnPropertyNames(err)));//Error - exit
    }
}

/**
 * Create a connection to each gateway + start scan
 * 
 * @param {object} gwObj - Gateway object
 */
async function mainLogin(gwObj) {
    try {
        await gwObj.gapiAsync.auth({ 'user': gwObj.user, 'pwd': gwObj.pwd });           //Use Auth, not login

        gwObj.gapiAsync.config({ 'gwid': gwObj.gwid });                                 //select gateway (CLI)

        await gwObj.gapiAsync.open({});                                                 //open connection to gateway

        let ver = await gwObj.gapiAsync.version(5000);                                //Check gateway version - if gateway is not online(err), exit 

        let cdev = await gwObj.gapiAsync.show({});//list all devices connected to gateway
        if (cdev.nodes.length > 0) {
            await gwObj.gapiAsync.disconnect({ did: '*' }); //disconnect any connected devices
        }
        gwObj.gapiAsync.event({ 'did': '*' }, (robj) => { myGatewayEventHandler(gwObj, robj) }, null);           //Attach event handlers
        gwObj.gapiAsync.report({ 'did': '*' }, (robj) => { myGatewayReportHandler(gwObj, robj) }, null);         //Attach report handlers

        await axScanForBLEdev(gwObj, userConfig.scanParameters.active, userConfig.scanParameters.period);//scan for BLE devices

    } catch (err) {
        await axShutdownGW(gwObj, 3, 'Error! Exiting... ' + JSON.stringify(err, Object.getOwnPropertyNames(err)));//Error - exit gateway
    }
}

/**
 * Scan for BLE devices and generate "scan complete" event at the end of scan
 *
 * @param {object} gwObj - Gateway object
 * @param {number} scanMode - Scan mode  1-> active, 0-> passive
 * @param {number} scanPeriod - Scan period in seconds
 */
async function axScanForBLEdev(gwObj, scanMode, scanPeriod) {
    if (!exitFlag) {
        try {
            let ret = await gwObj.gapiAsync.list({ 'active': scanMode, 'period': scanPeriod });
        } catch (err) {
            console.log('List failed' + JSON.stringify(err, Object.getOwnPropertyNames(err)));
        }
    }
};


/**
 * Event handler (for scan complete, disconnection, etc events)
 *
 * @param {object} gwObj - Gateway object
 * @param {Object} iobj - Event handler object - see API docs
 */
async function myGatewayEventHandler(gwObj, iobj) {
    let dev = [];
    dev.type = 0;
    switch (iobj.event) {
        case 1: //disconnect event
            console.log('Device disconnect event' + JSON.stringify(iobj, null, 0));
            break;
        case 39://Scan complete event
            if (!exitFlag) {//Do not process events when in exit mode
                await axScanForBLEdev(gwObj, userConfig.scanParameters.active, userConfig.scanParameters.period);//scan for BLE devices
            }
            break;
        default:
            console.log('Other unhandled event [' + iobj.event + ']');
    }
}


/**
 * Report handler (for advertisement data, notification and indication events)
 *
 * @param {object} gwObj - Gateway object
 * @param {Object} iobj - Report handler object - see API docs 
 */
function myGatewayReportHandler(gwObj, iobj) {
    switch (iobj.report) {
        case 1://adv report
            gwObj.advRate = iobj.nodes.length;
            var advArray = axAddGWIDInfo(gwObj, iobj.nodes); //add gateway info
            var advFilter = advArray.filter(advMacIDFilter)
            //var advArrayMap = advFilter.map(axAdvExtractData);//Extract data
            var advArrayMap = advFilter.map(axIBeaconExtractData);//Extract data
            writeAdvDataToInflux(gwObj.gwid, advFilter, gwObj.advRate);
            //var advPrnArray = axParseAdv(gwObj, iobj.nodes);
            axPrintAdvArrayScreen(advArrayMap);//Print data to screen 
            break;
        case 27://Notification report
            console.log('Notification received: ' + JSON.stringify(iobj, null, 0))
            break;
        default:
            console.log('(Other report) ' + JSON.stringify(iobj, null, 0))
    }
}

/**
 * Function to add gateway ID to adv data
 *
 * @param {object} gwObj - Gateway object
 * @param {Object[]} advItem - advArray - Array of advertsisement objects from report callback
 * @returns {Object} advObj - advArray - Array of advertsisement objects
 */
function axAddGWIDInfo(gwObj, advArray) {
    var advObj = [];
    var item;
    for (var i = 0; i < advArray.length; i++) {
        item = advArray[i];
        item.gw = gwObj.gwid;// add gwid info
        advObj.push(item);
    }
    return advObj;
}

/**
 * Call this function to gracefully shutdown all connections
 * 
 * @param {number} retryCount - Number of retry attempts 
 * @param {string} prnStr - String to print before exit  
 */
async function axShutdown(retryCount, prnStr) {
    console.log(prnStr);
    exitFlag = true;
    statusList.stop();
    for (let i = 0; i < gwArray.length; i++) {
        await axShutdownGW(gwArray[i], retryCount, prnStr)
    }
    if (gapiMain.isLogin) {
        await gapiMain.logout({});//logout
    }
    process.exit()
};

/**
 * Call this function to gracefully shutdown all connections
 *
 * @param {object} gwObj - Gateway object
 * @param {number} retryCount - Number of retry attempts 
 * @param {string} prnStr - String to print before exit  
 */
async function axShutdownGW(gwObj, retryCount, prnStr) {
    console.log('[' + gwObj.gwid + ']' + prnStr);
    if (gwObj.gapiAsync.isOpen) {//stop scanning
        if (gwObj.gapiAsync.isGWlive) {//only if gw is alive
            try {
                let ret = await gwObj.gapiAsync.list({ 'active': userConfig.scanMode, 'period': 0 });//stop scan
                let cdev = await gwObj.gapiAsync.show({});
                if (cdev.nodes.length > 0) {
                    await gwObj.gapiAsync.disconnect({ did: '*' });
                }
            } catch (err) {
                console.log('Error' + JSON.stringify(err, Object.getOwnPropertyNames(err)));
                if (retryCount > 0)
                    setTimeout(async () => { await axShutdownGW(gwObj, retryCount--, retryCount + ' Shutdown...') }, 100);
            }
        }
        await gwObj.gapiAsync.close({});
    }
};

/**
 * Setup CTRL-C and Exit handlers
 * 
 */
function init() {
    //Used to monitor for ctrl-c and exit program
    process.stdin.resume();//so the program will not close instantly
    process.on("SIGINT", function () {
        axShutdown(3, "Received Ctrl-C - shutting down.. please wait");
    });

    //On exit handler
    process.on('exit', function () {
        console.log('Goodbye!');
    });

    // Ensure any unhandled promise rejections get logged.
    process.on('unhandledRejection', err => {
        //axShutdown(3, "Unhandled promise rejection - shutting down.. " + + JSON.stringify(err, Object.getOwnPropertyNames(err)));
        process.exit()
    })
}


// Utitlity Functions

/**
 * Format adv packets to print to screen using console.log
 * 
 * @param {Object[]} advArray - Array of advertsisement objects from report callback
 */
function axPrintAdvArrayScreen(advArray) {
    for (var i = 0; i < advArray.length; i++) {
        console.log(JSON.stringify(advArray[i], null, 0));
    }
}

/**
 * Parse advertisement packets
 *
 * @param {object} gwObj - Gateway object
 * @param {Object[]} advArray - Array of advertsisement objects from report callback
 * @returns 
 */
function axParseAdv(gwObj, advArray) {
    var advArrayMap = advArray.map(item => axAdvExtractData(gwObj, item));//Extract data
    var advArrayFilter = advArrayMap.filter(axAdvMatchAll);//Filter adv
    return advArrayFilter;
}

/**
 * Function to extract advertisement data
 * 
 * @param {Object} advItem - Single advertisement object
 * @returns {Object} advObj - Single parsed advertisement data object
 */
function advMacIDFilter(advItem) {
    macID = myUtils.addrDisplaySwapEndianness(advItem.did)
    if (userConfig.advFilter) {
        for (let i = 0; i < userConfig.advFilter.length; i++) {
            if (macID == userConfig.advFilter[i]) {
                return true;
            }
        }
        return false
    }
    return true
}

/**
 * Function to extract advertisement data
 * 
 * @param {Object} advItem - Single advertisement object
 * @returns {Object} advObj - Single parsed advertisement data object
 */
function axAdvExtractData(advItem) {
    advObj = {
        gw: advItem.gw,// add gwid info
        ts: myUtils.convertUnixTimeToDateTime(advItem.tss + 1e-6 * advItem.tsus),    //Time stamp
        //did: myUtils.addrDisplaySwapEndianness(advItem.did),      //BLE address
        did: advItem.did,                                   //BLE address - only raw address can be used by API
        dt: advItem.dtype,                                  // Adress type
        ev: advItem.ev,                                     //adv packet type
        rssi: advItem.rssi,                                 //adv packet RSSI in dBm
        adv: advItem.adv.length,                            //payload length of adv packet
        rsp: advItem.rsp.length,                            //payload length of rsp packet
        name: axParseAdvGetName(advItem.adv, advItem.rsp),  //BLE device name
        //adv1: JSON.stringify(advItem.adv, null, 0),       //payload of adv packet
        //rsp1: JSON.stringify(advItem.rsp, null, 0),       //payload of rsp packet
    };
    return advObj;
}

/**
 * Function to extract advertisement data
 *
 * @param {object} gwObj - Gateway object
 * @param {Object} advItem - Single advertisement object
 * @returns {Object} advObj - Single parsed advertisement data object
 */
function axAdvExtractData2(gwObj, advItem) {
    advObj = {
        gw: gwObj.gwid,
        ts: myUtils.convertUnixTimeToDateTime(advItem.tss + 1e-6 * advItem.tsus),    //Time stamp
        did: myUtils.addrDisplaySwapEndianness(advItem.did),        //BLE address
        dt: advItem.dtype,                                  // Adress type
        ev: advItem.ev,                                     //adv packet type
        rssi: advItem.rssi,                                 //adv packet RSSI in dBm
        name: axParseAdvGetName(advItem.adv, advItem.rsp),  //BLE device name
        //adv1: JSON.stringify(advItem.adv, null, 0),       //payload of adv packet
        //rsp1: JSON.stringify(advItem.rsp, null, 0),       //payload of rsp packet
    };
    return advObj;
}

/**
 * Function to match all devices(dummy)
 * 
 * @param {any} advItem 
 * @returns {boolean} - true if advertsiment has to be retained
 */
function axAdvMatchAll(advItem) {
    return (true);
}


/**
 * Function to match TI sensorTag, see http://processors.wiki.ti.com/index.php/CC2650_SensorTag_User%27s_Guide
 * 
 * @param {any} advItem 
 * @returns {boolean} - true if advertsiment has to be retained
 */
function axAdvMatchSensorTag(advItem) {
    return (advItem.name == "CC2650 SensorTag");
}


/**
 * Get device name from advertisement packet
 * 
 * @param {Object} adv - Advertisement payload
 * @param {Object} rsp - Scan response payload
 * @returns {string} - Name of the device or null if not present
 */
function axParseAdvGetName(adv, rsp) {
    var didName = '';
    for (var i = 0; i < adv.length; i++) {
        if ((adv[i].t == 8) || (adv[i].t == 9)) {
            didName = adv[i].v;
            return didName;
        }
    }
    for (var i = 0; i < rsp.length; i++) {
        if ((rsp[i].t == 8) || (rsp[i].t == 9)) {
            didName = rsp[i].v;
            return didName;
        }
    }
    return didName;
}

/**
 * Create InfluxDB object
 * 
 * @param {Object} db - database object with properties
 * @returns {Object} - Instance of db object
 */
const influx = new Influx.InfluxDB({
    host: 'localhost',
    database: 'beaconstats',
    schema: [
        {
            measurement: 'raw_adv',
            fields: {
                rssi: Influx.FieldType.INTEGER,
                ad: Influx.FieldType.STRING,
                dtype: Influx.FieldType.INTEGER,
                ev: Influx.FieldType.INTEGER,
                ts: Influx.FieldType.INTEGER
            },
            tags: ['macid', 'gwid']
        },
        {
            measurement: 'rate_m',
            fields: { count: Influx.FieldType.INTEGER },
            tags: ['gwid']
        }
    ]
});

/**
 * Check if database exists. Create if it does not exist
 * 
 */
influx.getDatabaseNames()
    .then(names => {
        if (!names.includes('beaconstats')) {
            return influx.createDatabase('beaconstats');
        }
    })
    .catch(error => influxDB_OK = false);


/**
 * Extract adv info and format it in InfluxDB schema
 * 
 * @param {String} gwid - gateway ID
 * @param {String} advObj - Array of advertisements
 */
function writeAdvDataToInflux(gwid, advObj, advRate) {
    if (influxDB_OK) {
        for (var i = 0; i < advObj.length; i++) {
            writeAdvDataToInfluxDataPoint({
                gwid: gwid,
                macid: advObj[i].did,
                rssi: advObj[i].rssi,
                dtype: advObj[i].dtype,
                ev: advObj[i].ev,
                ts: (advObj[i].tss + 1e-6 * advObj[i].tsus) * 1e9,
                ad: JSON.stringify({
                    adv: advObj[i].adv,
                    rsp: advObj[i].rsp
                }),
                epoch: (advObj[i].tss + 1e-6 * advObj[i].tsus) * 1e9
            });
        }
        writeAdvRateDataToInfluxDataPoint({
            gwid: gwid,
            count: advRate
        });
    }

}



/**
 * Write an single datapoint into InfluxDB
 * 
 * @param {Object} data - Influx db data
 */
function writeAdvDataToInfluxDataPoint(data) {
    if (influxDB_OK) {
        influx.writePoints([
            {
                measurement: 'raw_adv',
                tags: {
                    macid: data.macid,
                    gwid: data.gwid,
                },
                fields: {
                    rssi: data.rssi,
                    ad: data.ad,
                    dtype: data.dtype,
                    ev: data.ev,
                    ts: data.ts
                },
                timestamp: data.epoch,
            }
        ], {
                database: 'beaconstats',
            })
            .catch(error => {
                console.error(`Error saving data to InfluxDB! ${error.stack}`)
            });
    }
}

/**
 * Write an adv rate datapoint into InfluxDB
 * 
 * @param {Object} data - Influx db data
 */
function writeAdvRateDataToInfluxDataPoint(data) {
    if (influxDB_OK) {
        influx.writePoints([
            {
                measurement: 'rate_m',
                tags: {
                    gwid: data.gwid
                },
                fields: {
                    count: data.count,
                },
            }
        ], {
                database: 'beaconstats',
            })
            .catch(error => {
                console.error(`Error saving data to InfluxDB! ${error.stack}`)
            });
    }
}

/**
 * Display scan results periodically
 *
 * @param {int} delay_ms - update delay
 */
function displayScanResults(delay_ms) {
    var statStr = "Scanning ...";
    if (exitFlag) {
        statusList.stop();
    }
    else {
        for (let i = 0; i < gwArray.length; i++) {
            statStr = statStr + `[${gwArray[i].gwid}(${gwArray[i].advRate})]`
        }
        statStr = statStr + `               `;
        statusList.message(statStr);
        setTimeout(displayScanResults, delay_ms, delay_ms);
    }
}

/**
 * Function toExtract iBeacon data
 * 
 * @param {any} advItem 
 * @returns {boolean} - true if advertsiment has to be retained
 */
function axIBeaconExtractData(advItem) {
    let beaconData = {}
    beaconData.ts = myUtils.convertUnixTimeToDateTime(advItem.tss + 1e-6 * advItem.tsus);
    beaconData.gw = advItem.gw;
    beaconData.did = advItem.did;
    beaconData.dt = advItem.dt;
    beaconData.ev = advItem.ev;
    beaconData.rssi = advItem.rssi;
    beaconData.name = advItem.name;
    for (let i = 0; i < advItem.adv.length; i++) {
        if (advItem.adv[i].t == 255) {
            if (advItem.adv[i].v.length == 50) {
                const buf = Buffer.from(advItem.adv[i].v, 'hex');
                beaconData.manuf = decimalToHex(buf.readUInt16LE(0), 4);//Little-endian 16-bit to unsigned integer - Temperature
                beaconData.type = decimalToHex(buf.readUInt8(2), 2);//Little-endian 16-bit to unsigned integer - Temperature
                beaconData.len = decimalToHex(buf.readUInt8(3), 2);//Little-endian 16-bit to unsigned integer - Temperature
                beaconData.UID = advItem.adv[i].v.slice(8, 40);
                beaconData.major = decimalToHex(buf.readUInt16BE(20), 4);//Little-endian 16-bit to unsigned integer - Temperature
                beaconData.minor = decimalToHex(buf.readUInt16BE(22), 4);//Little-endian 16-bit to unsigned integer - Temperature
                beaconData.cal_rssi = buf.readInt8(24);//Little-endian 16-bit to unsigned integer - Temperature
            }
        }
    }
    //console.log(JSON.stringify(beaconData))
    return beaconData;
}

function decimalToHex(d, padding) {
    var hex = Number(d).toString(16);
    padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

    while (hex.length < padding) {
        hex = "0" + hex;
    }

    return hex;
}