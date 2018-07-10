var CLI = require('clui');
var clear = CLI.Clear;
var clc = require('cli-color');
const Influx = require('influx');
var myUtils = require('./lib/lib-generic-utils.js');



var Line = CLI.Line,
    LineBuffer = CLI.LineBuffer;

const influx = new Influx.InfluxDB({
    host: 'localhost',
    database: 'beaconstats'
});

setInterval(getInfluxData, 2600);
//getInfluxData();

async function getInfluxData() {
    try {
        var dispData = {
            msg: "Press CTRL-C to Exit",
            gw: [],
            data: {}
        };
        
        var ifql5 = `select rssi  from raw_adv group by * order by desc limit 1`;
        var ifql6 = `select count(rssi)  from raw_adv group by *`;
        
        var nodeVal5 = await influx.query(ifql5)
        var nodeVal6 = await influx.query(ifql6)
        //console.log(JSON.stringify(nodeVal5));
        for (let i = 0; i < nodeVal5.length; i++) {
            dispData.gw.indexOf(nodeVal5[i].gwid) === -1 ? dispData.gw.push(nodeVal5[i].gwid) : 0;
            var cTime = Date.now();
            var tDiff = cTime - nodeVal5[i].time.getTime()
            if (!dispData.data.hasOwnProperty(nodeVal5[i].macid)) {
                dispData.data[nodeVal5[i].macid] = {}
            }
            if (!dispData.data[nodeVal5[i].macid].hasOwnProperty(nodeVal5[i].gwid)) {
                dispData.data[nodeVal5[i].macid][nodeVal5[i].gwid] = { exist: true, rssi: nodeVal5[i].rssi, etime: tDiff / 1000, count: 0 };
            }
        }
        for (let i = 0; i < nodeVal6.length; i++) {
            if (dispData.data.hasOwnProperty(nodeVal6[i].macid)) {
                if (dispData.data[nodeVal6[i].macid].hasOwnProperty(nodeVal6[i].gwid)) {
                    dispData.data[nodeVal6[i].macid][nodeVal6[i].gwid].count = nodeVal6[i].count;;
                }
            }
        }
        printData(dispData)
    } catch (err) {
        console.log('Error! Exiting... ' + JSON.stringify(err, Object.getOwnPropertyNames(err)));
    }

}


function printData(sdata) {

    var xh = process.stdout.columns;
    var vh = process.stdout.rows;
    var outputBuffer = new LineBuffer({
        x: 1,
        y: 0,
        width: xh - 1,
        height: vh
    });
    var message = new Line(outputBuffer)
        .column(sdata.msg, xh - 1, [clc.green])
        .fill()
        .store();

    var blankLine = new Line(outputBuffer)
        .fill()
        .store();

    var header2 = new Line(outputBuffer)
    header2.column('', 20, [clc.cyan])
    for (let i = 0; i < sdata.gw.length; i++) {
        header2.column(sdata.gw[i], 20, [clc.cyan])
    }
    header2.fill().store();

    var header3 = new Line(outputBuffer)
    header3.column('Device ID', 20, [clc.cyan])
    for (let i = 0; i < sdata.gw.length; i++) {
        header3.column('RSSI/COUNT/ETIME', 20, [clc.cyan])
    }
    header3.fill().store();

    var line;
    for (let key in sdata.data) {
        if (sdata.data.hasOwnProperty(key)) {
            line = new Line(outputBuffer)
            line.column(myUtils.addrDisplaySwapEndianness(key), 20)
            for (let j = 0; j < sdata.gw.length; j++) {
                if (sdata.data[key].hasOwnProperty(sdata.gw[j])) {
                    if (sdata.data[key][sdata.gw[j]].etime < 30) {
                        line.column(sdata.data[key][sdata.gw[j]].rssi.toFixed(0) + ' dB/' + sdata.data[key][sdata.gw[j]].count.toFixed(0) + '/' + sdata.data[key][sdata.gw[j]].etime.toFixed(1) + ' S', 20, [clc.green])
                    }
                    else if (sdata.data[key][sdata.gw[j]].etime < 120) {
                        line.column(sdata.data[key][sdata.gw[j]].rssi.toFixed(0) + ' dB/' + sdata.data[key][sdata.gw[j]].count.toFixed(0) + '/' + sdata.data[key][sdata.gw[j]].etime.toFixed(1) + ' S', 20, [clc.yellow])
                    }
                    else {
                        line.column(sdata.data[key][sdata.gw[j]].rssi.toFixed(0) + ' dB/' + sdata.data[key][sdata.gw[j]].count.toFixed(0) + '/' + sdata.data[key][sdata.gw[j]].etime.toFixed(1) + ' S', 20, [clc.redBright])
                    }
                }
                else
                    line.column('-', 20)
            }
            line.fill().store();
        }
    }
    clear();
    outputBuffer.output();
}

