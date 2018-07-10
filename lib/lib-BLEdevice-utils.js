
module.exports = class devBLE {
    constructor(connectionParameters, gattTable) {
        // invokes the setter
        this._connectionParameters = {
            'did': '',
            'dtype': '',
            'interval_min': connectionParameters.interval_min, // x1.25ms - Connection intervalk min
            'interval_max': connectionParameters.interval_max, // x1.25ms - Connection interval max
            'latency': connectionParameters.latency,       // Salve latency
            'timeout': connectionParameters.timeout,      // x10ms - Supervision timeout
        };
        this._gattDataCache = false;

        this._gattData = {};
        this._gattData['services'] = [];
        for (let i = 0; i < gattTable.services.length; i++) {
            this._gattData.services[i] = { uuid: gattTable.services[i].uuid, characteristics: [] };
            for (let j = 0; j < gattTable.services[i].characteristics.length; j++) {
                this._gattData.services[i].characteristics.push({
                    uuid: gattTable.services[i].characteristics[j].uuid,
                    name: gattTable.services[i].characteristics[j].name,
                    enable: gattTable.services[i].characteristics[j].enable,
                    selected: false,
                    handle: null,
                    properties: null,
                })
            }
        }
    }

    getConnectionParameters(did, dtype) {
        this._connectionParameters.did = did;
        this._connectionParameters.dtype = dtype;
        return this._connectionParameters;
    }

    getNotificationChoiceList() {
        var srcList = [];
        for (let i = 0; i < this._gattData.services.length; i++) {
            for (let j = 0; j < this._gattData.services[i].characteristics.length; j++) {
                if (this._gattData.services[i].characteristics[j].enable) {
                    srcList.push({
                        name: this._gattData.services[i].characteristics[j].name,
                        value: {
                            uuid: this._gattData.services[i].characteristics[j].uuid,
                            i: i,
                            j: j
                        },
                        checked: this._gattData.services[i].characteristics[j].selected
                    })
                }
            }
        }
        return srcList;
    }

    setNotificationChoices(selectionList) {
        var srcList = [];
        if (selectionList) {
            for (let k = 0; k < selectionList.length; k++) {
                this._gattData.services[selectionList[k].i].characteristics[selectionList[k].j].selected = true;
            }
        }
    }

    getNotificationChoices() {
        var srcList = [];
        for (let i = 0; i < this._gattData.services.length; i++) {
            for (let j = 0; j < this._gattData.services[i].characteristics.length; j++) {
                if (this._gattData.services[i].characteristics[j].enable && this._gattData.services[i].characteristics[j].selected) {
                    srcList.push({
                        name: this._gattData.services[i].characteristics[j].name,
                        uuid: this._gattData.services[i].characteristics[j].uuid,
                        handle: this._gattData.services[i].characteristics[j].handle,
                        properties: this._gattData.services[i].characteristics[j].properties,
                        i: i,
                        j: j
                    })
                }
            }
        }
        return srcList;
    }

    get gattDataCacheFlag() {
        return this._gattDataCache;
    }

    set gattDataCacheFlag(flag) {
        this._gattDataCache = flag;
    }


    getServicesList() {
        var srvList = [];
        for (let i = 0; i < this._gattData.services.length; i++) {
            for (let j = 0; j < this._gattData.services[i].characteristics.length; j++) {
                srvList.push({
                    uuid: this._gattData.services[i].uuid,
                    i: i,
                });
            }
        }
        return srvList;
    }

    getCharactericsList(service) {
        let charList = [];
        let i = service.i;
        for (let j = 0; j < this._gattData.services[i].characteristics.length; j++) {
            charList.push({
                name: this._gattData.services[i].characteristics[j].name,
                suuid: this._gattData.services[i].uuid,
                cuuid: this._gattData.services[i].characteristics[j].uuid,
                handle: this._gattData.services[i].characteristics[j].handle,
                properties: this._gattData.services[i].characteristics[j].properties,
                i: i,
                j: j,
            });
        }
        return charList;
    }

    setCharactericsHandle(char, charHandleInfo) {
        let i = char.i;
        let j = char.j;
        if (charHandleInfo) {
            if (charHandleInfo.hasOwnProperty('handle'))
                this._gattData.services[i].characteristics[j].handle = charHandleInfo.handle;
            if (charHandleInfo.hasOwnProperty('properties'))
                this._gattData.services[i].characteristics[j].properties = charHandleInfo.properties;
            if (charHandleInfo.hasOwnProperty('name'))
                this._gattData.services[i].characteristics[j].name = charHandleInfo.name;
        }
    }

    getCharactericsHandle(suuid, cuuid) {
        let handle = null;
        for (let i = 0; i < this._gattData.services.length; i++) {
            for (let j = 0; j < this._gattData.services[i].characteristics.length; j++) {
                if (this._gattData.services[i].uuid == suuid && this._gattData.services[i].characteristics[j].uuid == cuuid) {
                    handle = this._gattData.services[i].characteristics[j].handle;
                }
            }
        }
        return handle;
    }

    get gattData1() {
        return this._gattData1;
    }

    get gattData() {
        return this._gattData;
    }
};