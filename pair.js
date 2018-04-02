"use strict";

const wifi = require('node-wifi');
const axios = require('axios');

let NETWORK_SSID;
let NETWORK_PASSWORD;
let HTTPS_SERVER_IP;
let HTTPS_SERVER_PORT;
checkArguments();

wifi.init({
    iface : null
});

new Promise(resolve => findSwitchNetwork(resolve))
    .then(network => connect(network))
    .then(connected => getSwitchInfo())
    .then(infos => setupSwitch())
    .catch(error => console.log(error));

/**
 * Checks that 4 arguments have been passed to the script.
 * See usage below.
 */
function checkArguments() {
    if (process.argv.length != 6) {
        console.log('Usage :');
        console.log('\tnode pair.js <network_ssid> <network_password> <https_server_ip> <https_server_port>');
        console.log();
        console.log('\t* network_ssid      - SSID of your home wifi network');
        console.log('\t* network_password  - Password of your home wifi network');
        console.log('\t* https_server_ip   - The IP of your HTTPS server which will then give the websocket server IP and port');
        console.log('\t* https_server_port - The port of your HTTPS server which will then give the websocket server IP and port');
        process.exit();
    } else {
        NETWORK_SSID = process.argv[2];
        NETWORK_PASSWORD = process.argv[3];
        HTTPS_SERVER_IP = process.argv[4];
        HTTPS_SERVER_PORT = parseInt(process.argv[5]);
    }
}

/**
 * Finds and returns the switch's wifi network.
 * 
 * @param {*} resolve 
 */
function findSwitchNetwork(resolve) {
    console.log('Searching for the switch...');

    wifi.scan((err, networks) => {
        if (err) {
            console.log(err);
        } else {
            let network = networks.filter(n => n.ssid.startsWith('ITEAD-'))[0];

            if (!network) {
                findSwitchNetwork(resolve);
            } else {
                resolve(network);
            }
        }
    });
}

/**
 * Connect to the wifi network.
 * 
 * @param {*} network 
 */
function connect(network) {
    return new Promise(resolve => {
        wifi.connect({
            ssid : network.ssid,
            password : '12345678'
        }, function(err) {
            if (err) {
                throw err;
            } else {
                console.log('Connected to ' + network.ssid + ".");
            }

            resolve(true);
        });
    });
}

/**
 * Collects the device ID and API key of the switch.
 */
function getSwitchInfo() {
    return new Promise(resolve => {
        axios.get('http://10.10.7.1/device')
            .then(response => {
                console.log();
                console.log('Device ID : ' + response.data.deviceid);
                console.log('API key : ' + response.data.apikey);
                console.log();

                resolve({ deviceId: response.data.deviceid, apiKey: response.data.apiKey });
            })
            .catch(error => { throw error; });
    });
}

/**
 * Sets up the switch with the credentials to connect to the wifi network and to communicate with the HTTPS server.
 */
function setupSwitch() {
    return new Promise(resolve => {
        axios.post('http://10.10.7.1/ap', {
                version: 4,
                ssid: NETWORK_SSID,
                password: NETWORK_PASSWORD,
                serverName: HTTPS_SERVER_IP,
                port: HTTPS_SERVER_PORT
            })
            .then(response => {
                if (!response.data.error) {
                    console.log('Switch setup correctly.');
                } else {
                    console.log('An error occured during switch setup.');
                }

                resolve(true);
            })
            .catch(error => { throw error; });
    });
}

/**
 * Disconnects from the currently connected wifi network.
 * 
 */
function disconnect() {
    return new Promise(resolve =>  {
        wifi.disconnect(function(err) {
            if (err) {
                throw err;
            }

            console.log('Disconnected.');

            resolve(true);
        });
    });   
}