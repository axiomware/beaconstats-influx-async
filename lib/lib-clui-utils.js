var inquirer = require('inquirer');
var Preferences = require("preferences");
var myUtils = require("./lib-generic-utils.js");
var prefs = new Preferences('myAdvApp_uniqueID1234');    //Preferences are stored in system file

/**
 * Get user credentails from command line interface (CLI)
 * 
 * @returns {Object} username and password
 */
async function getCredentials() {
    var questions = [
        {
            name: 'user',
            type: 'input',
            message: 'Enter your Axiomware account username(e-mail):',
            default: () => { return prefs.user ? prefs.user : null; },//Use previously stored username
            validate: (email) => { return myUtils.validateEmail(email) ? true : 'Please enter valid e-mail address'; }
        },
        {
            name: 'pwd',
            type: 'password',
            mask: '*',
            message: 'Enter your password:',
            default: () => { return prefs.pwd ? prefs.pwd : null; },//Use previously stored password(see comment below)
            validate: (value) => { return (value.length > 0) ? true : 'Please enter your password'; }
        }
    ];

    let answer = await inquirer.prompt(questions);
    prefs.user = answer.user;
    //prefs.pwd = answer.pwd; //Don't store password for security reasons. Enable this during development for convenience
    return { user: answer.user, pwd: answer.pwd };
}

/**
 * Get user choice of gateway selection (CLI)
 * 
 * @param {string []} gwidList - List of gateways
 * @returns {string} selected gateway
 */
async function selectGateway(gwidList) {
    var choice_ext = gwidList;//gwidList;
    choice_ext.push('Exit');
    var questions = [
        {
            type: 'list',
            name: 'gwid',
            message: 'Login success! Select the Netrunr gateway for connection:',
            choices: choice_ext,
        }
    ];
    let answers = await inquirer.prompt(questions);
    if (answers.gwid == 'Exit')
        return null;
    else
        return answers.gwid;
}

/**
 * Get user choice of gateway selection (CLI)
 * 
 * @param {string []} gwidList - List of gateways
 * @returns {string | null} selected list of gateways or null
 */
async function selectSingleGateway(gwidList) {
    var choice_ext = gwidList;//gwidList;
    choice_ext.push('Exit');
    var questions = [
        {
            type: 'list',
            name: 'gwid',
            message: 'Login success! Select the Netrunr gateway for connection:',
            choices: choice_ext,
        }
    ];
    let answers = await inquirer.prompt(questions);
    if (answers.gwid == 'Exit')
        return null;
    else
        return [answers.gwid];
}

/**
 * Get user choice of gateway selection (CLI)
 * 
 * @param {string []} gwidList - List of gateways
 * @returns {string | null} selected list of gateways or null
 */
async function selectMultiGateway(gwidList) {
    var choice_ext = gwidList;//gwidList;
    var questions = [
        {
            type: 'checkbox',
            name: 'gwid',
            message: 'Login success! Select the Netrunr gateway(s) for connection:',
            choices: choice_ext,
        }
    ];
    let answers = await inquirer.prompt(questions);
    if (answers.gwid.length == 0)
        return null;
    else
        return answers.gwid;
}

/**
 * get user choice of scan type period (CLI)
 * 
 * @returns {Object} type and scan period in seconds 
 */
async function getScanPeriodType() {
    var questions = [
        {
            name: 'type',
            type: 'list',
            message: 'Connection open success! Enter scan type:',
            choices: [{ name: 'Active', value: 1 }, { name: 'Passive', value: 0 }]
        },
        {
            name: 'period',
            type: 'input',
            message: 'Enter scan period (seconds):',
            default: () => { return prefs.period ? prefs.period : 5; },//Use previously stored adv period
            validate: (value) => { return ((parseInt(value) != NaN) && (parseInt(value) >= 0)) ? true : 'Please enter scan period in seconds'; },
        }
    ];

    let answers = await inquirer.prompt(questions);
    prefs.period = parseInt(answers.period);
    return { 'active': answers.type, 'period': parseInt(answers.period) }
}

/**
 * get user choice to recoonect after disconnection (CLI)
 * 
 * @returns {Object} true -> reconnect
 */
async function getReconnectOption() {
    var question = [
        {
            name: 'reconnect',
            type: 'list',
            message: 'Reconnect after a disconnection?',
            choices: [{ name: 'Yes', value: true }, { name: 'No', value: false }]
        }
    ];

    let answer = await inquirer.prompt(question);
    return answer.reconnect
}

/**
 * get user choice of D600 Scan Mode (CLI)
 * 
 * @returns {Object} true -> reconnect
 */
async function getD600ScanMode() {
    var question = [
        {
            name: 'scanMode',
            type: 'list',
            message: 'Choose D600 Scan Mode',
            choices: [{ name: 'Single Scan Mode', value: 0 }, { name: 'Continuous Scan Mode', value: 1 }]
        }
    ];

    let answer = await inquirer.prompt(question);
    return answer.scanMode
}

/**
 * Get user choice of multi-gateway selection (CLI)
 *
 * @param {string []} choiceList  - List of sensors
 * @returns {string} selected list of sensors
 */
async function selectSensor(choiceList, message = 'Select one or more data sources:') {
    var question = [
        {
            type: 'checkbox',
            name: 'sensors',
            message: message,
            choices: choiceList
        }
    ];
    let answer = await inquirer.prompt(question);
    if (answer.sensors.length == 0)
        return null;
    else
        return answer.sensors;
}

/**
 * Get user choice of data sources or exit
 *
 * @param {string []} choiceList  - List of sensors
 * @returns {string} selected list of sensors
 */
async function selectNotificationSourcesOrExit(choiceList, message = 'Select one or more data sources:') {
    var questions = [
        {
            type: 'checkbox',
            name: 'sensors',
            message: message,
            choices: choiceList
        },
        {
            name: 'selExit',
            type: 'list',
            message: 'No Data Source(s) Selected. ' + message,
            choices: [{ name: 'Select one or more data sources', value: 1 }, { name: 'Exit', value: 2 }],
            when: (value) => { return (value.sensors.length == 0) },
        },
    ];
    let answers = await inquirer.prompt(questions);
    if (answers.sensors.length == 0) {
        if (answers.selExit == 2)
            return null;//exit
        else
            await selectNotificationSourcesOrExit(choiceList);//reselect
    }
    else
        return answers.sensors;
}

/**
 * Get user choice of data sources
 *
 * @param {string []} choiceList  - List of sensors
 * @returns {string} selected list of sensors
 */
async function selectNotificationSources(choiceList, message = 'Select one or more data sources:') {
    if (choiceList.length > 0) {
        var questions = [
            {
                type: 'checkbox',
                name: 'sensors',
                message: message,
                choices: choiceList
            },
        ];
        let answers = await inquirer.prompt(questions);
        if (answers.sensors.length == 0)
            return null;
        else
            return answers.sensors;
    }
    else
        return null;
}

/**
 * get user choice of BLE device to connect and read GATT table (CLI)
 *
 * @param {object []} advDeviceList  - List of BLE devices that are advertising
 * @returns {Object} Device address, Address type and Name (null if not present)
 */
async function selectBLEdevice(advDeviceList) {
    var N = Object.keys(advDeviceList).length;
    var choiceList = [];
    var i = 0;

    for (var key in advDeviceList) {
        if (advDeviceList.hasOwnProperty(key)) {
            choiceList[i] = {
                name: (i + 1).toString() + ') [' + myUtils.addrDisplaySwapEndianness(advDeviceList[key].did) + '] ' + advDeviceList[key].rssi + 'dBm ' + advDeviceList[key].name,
                value: { type: 0, did: advDeviceList[key].did, dtype: advDeviceList[key].dt, name: advDeviceList[key].name }
            }
            i++;
        }
    }
    choiceList.push(new inquirer.Separator());
    choiceList.push({ name: 'Scan again', value: { type: 1 } });
    choiceList.push({ name: 'Exit', value: { type: 2 } });

    var question = [
        {
            name: 'device',
            type: 'list',
            message: 'Found ' + Object.keys(advDeviceList).length + ' Device(s). Select Device to connect',
            choices: choiceList,
            paginated: true,
            pageSize: 30
        },
    ];

    let answer = await inquirer.prompt(question);
    if (answer.device.type == 2)
        return { type: 2 };//exit
    else if (answer.device.type == 1)
        return { type: 1 };//rescan
    else
        return { type: 0, did: answer.device.did, dtype: answer.device.dtype, name: answer.device.name };//connect to device
}

/**
 * get user choice of BLE device to connect (CLI)
 *
 * @param {object []} advDeviceList  - List of BLE devices that are advertising
 * @returns {Object} Device address, Address type and Name (null if not present)
 */
async function selectBLEdeviceMulti(advDeviceList) {
    var choiceList = [];
    var i = 0;

    for (var key in advDeviceList) {
        if (advDeviceList.hasOwnProperty(key)) {
            choiceList[i] = {
                name: (i + 1).toString() + ') [' + myUtils.addrDisplaySwapEndianness(advDeviceList[key].did) + '] ' + advDeviceList[key].rssi + 'dBm ' + advDeviceList[key].name,
                value: { type: 0, sensorType: 0, did: advDeviceList[key].did, dtype: advDeviceList[key].dt, name: advDeviceList[key].name, adv: advDeviceList[key].adv, rsp: advDeviceList[key].rsp }
            }
            i++;
        }
    }

    var questions = [
        {
            name: 'deviceList',
            type: 'checkbox',
            message: 'Found ' + Object.keys(advDeviceList).length + ' Device(s). Select one or more devices to connect (none to exit)',
            choices: choiceList,
            paginated: true,
            pageSize: 30
        },
        {
            name: 'scanExit',
            type: 'list',
            message: 'No Device(s) Selected. Select one of the choices',
            choices: [{ name: 'Rescan for BLE devices', value: 1 }, { name: 'Exit', value: 2 }],
            when: (value) => { return (value.deviceList.length == 0) },
        },
    ];

    let answers = await inquirer.prompt(questions);
    if (answers.deviceList.length == 0) {
        if (answers.scanExit == 2)
            return { type: 2 };//exit
        else
            return { type: 1 };//rescan
    }
    else
        return { type: 0, deviceList: answers.deviceList };//connect to device
}

/**
 * get user choice of BLE device to connect (CLI)
 *
 * @param {object []} advDeviceList  - List of BLE devices that are advertising
 * @returns {Object} Device address, Address type and Name (null if not present)
 */
async function selectBLEdeviceMultiGW(advDeviceList) {
    var choiceList = [];
    var i = 0;

    for (var key in advDeviceList) {
        if (advDeviceList.hasOwnProperty(key)) {
            choiceList[i] = {
                name: (i + 1).toString() + ') [' + myUtils.addrDisplaySwapEndianness(advDeviceList[key].did) + ']->[' + advDeviceList[key].gw +'] ' + advDeviceList[key].rssi + 'dBm ' + advDeviceList[key].name,
                value: { type: 0, sensorType: 0, did: advDeviceList[key].did, dtype: advDeviceList[key].dt, name: advDeviceList[key].name, gw: advDeviceList[key].gw, adv: advDeviceList[key].adv, rsp: advDeviceList[key].rsp }
            }
            i++;
        }
    }

    var questions = [
        {
            name: 'deviceList',
            type: 'checkbox',
            message: 'Found ' + Object.keys(advDeviceList).length + ' Device(s). Select one or more devices to connect (none to exit)',
            choices: choiceList,
            paginated: true,
            pageSize: 30
        },
        {
            name: 'scanExit',
            type: 'list',
            message: 'No Device(s) Selected. Select one of the choices',
            choices: [{ name: 'Rescan for BLE devices', value: 1 }, { name: 'Continue without BLE connections', value: 3 }, { name: 'Exit', value: 2 }],
            when: (value) => { return (value.deviceList.length == 0) },
        },
    ];

    let answers = await inquirer.prompt(questions);
    if (answers.deviceList.length == 0) {
        if (answers.scanExit == 2)
            return { type: 2, deviceList: answers.deviceList };//exit
        else if (answers.scanExit == 3)
            return { type: 0, deviceList: answers.deviceList };//connect to device
        else
            return { type: 1, deviceList: answers.deviceList };//rescan
    }
    else
        return { type: 0, deviceList: answers.deviceList };//connect to device
}

/**
 * get user choice of file name (CLI)
 * 
 * @returns {string | null} filename 
 */
async function getFilename() {
    var questions = [
        {
            name: 'logFileState',
            type: 'list',
            message: 'Save advertisement data to file?',
            choices: [{ name: 'Yes', value: true }, { name: 'No', value: false }],
        },
        {
            name: 'logFileName',
            type: 'input',
            message: 'Enter file name for storing data:',
            default: () => { return prefs.dataFileName ? prefs.dataFileName : null },
            when: (answers) => { return answers.logFileState; },//Execute this question only if previous answer is true
        }
    ];

    let answers = await inquirer.prompt(questions);
    if (answers.logFileState)
        prefs.dataFileName = answers.logFileName;
    return answers.logFileState ? answers.logFileName : null;
}

/**
 * get user choice of file name (CLI)
 * 
 * @returns {string | null} filename 
 */
async function useADVFilter() {
    var questions = [
        {
            name: 'advFilterState',
            type: 'list',
            message: 'Use advertisment filter',
            choices: [{ name: 'Yes', value: true }, { name: 'No', value: false }],
        },
        {
            name: 'filterFileName',
            type: 'input',
            message: 'Enter file name with advertisment MAC ID:',
            default: () => { return prefs.filterFileName ? prefs.filterFileName : null },
            when: (answers) => { return answers.advFilterState; },//Execute this question only if previous answer is true
        }
    ];

    let answers = await inquirer.prompt(questions);
    if (answers.advFilterState)
        prefs.filterFileName = answers.filterFileName;
    return answers.advFilterState ? answers.filterFileName : null;
}

/** @const */
module.exports = {
    getCredentials,
    selectGateway,
    selectSingleGateway,
    selectMultiGateway,
    getScanPeriodType,
    getReconnectOption,
    selectSensor,
    selectNotificationSources,
    selectNotificationSourcesOrExit,
    selectBLEdevice,
    selectBLEdeviceMulti,
    selectBLEdeviceMultiGW,
    getFilename,
    useADVFilter,
    getD600ScanMode
};
