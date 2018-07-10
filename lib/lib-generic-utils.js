/**
 * Validate email
 * 
 * @param {string} email - string in valid email format
 * @returns boolean - true if valid email address based on RegEx match
 */
function validateEmail(email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

/**
 * Swap endianness of a hex-string 
 * 
 * @param {string} hexStr - Hex string(make sure length is even)
 * @returns {string} 
 */
function swapEndianness(hexStr) {
    if (hexStr.length > 2)
        return hexStr.replace(/^(.(..)*)$/, "0$1").match(/../g).reverse().join("");
    else
        return hexStr
}

/**
 * Swap endianness of a hex-string. Format it to standard BLE address style
 * 
 * @param {string} hexStr - Hex string(make sure length is even) 
 * @returns {string}
 */
function addrDisplaySwapEndianness(hexStr) {
    if (hexStr.length > 2)
        return hexStr.replace(/^(.(..)*)$/, "0$1").match(/../g).reverse().join(":").toUpperCase();
    else
        return hexStr
}


/**
 * Convert unix seconds to time string - local time (yyyy-mm-ddThh:mm:ss.sss).
 * 
 * @param {Number} s - Number is Unix time format in seconds
 * @returns {string} - in local time format
 */
function convertUnixTimeToDateTime(s) {
    var d = new Date(s * 1000);
    var localISOTime = new Date(d.getTime() - d.getTimezoneOffset() * 60 * 1000).toISOString().slice(0, -1);
    return localISOTime;
}

/**
 * Get local time in time string - local time (yyyy-mm-ddThh:mm:ss.sss).
 * 
 * @returns {string} - in local time format
 */
function getCurrentDateTime() {
    var d = new Date();
    var localISOTime = new Date(d.getTime() - d.getTimezoneOffset() * 60 * 1000).toISOString().slice(0, -1);
    return localISOTime;
};

/**
 * Sleep for a ms milliseconds.
 * Use this async await 
 * For eg: sleep for 20 ms
 * await mylib.sleep(20);
 *
 *
 * 
 * @returns {promise} - returns a promise
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/** @const */
module.exports = {
    validateEmail,
    swapEndianness,
    addrDisplaySwapEndianness,
    convertUnixTimeToDateTime,
    getCurrentDateTime,
	sleep
};