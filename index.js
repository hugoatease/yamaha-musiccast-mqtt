#!/usr/bin/env node

const yargs = require("yargs");
const mqtt = require("mqtt");
const YamahaYXC = require("yamaha-yxc-nodejs");

const argv = yargs.options({
  host: {
    describe: "Musiccast device IP",
    demandOption: true,
  },
  "mqtt-url": {
    describe: "MQTT connection URL",
    demandOption: true,
  },
  "mqtt-prefix": {
    default: "musiccast",
  },
  interval: {
    describe: "Device polling interval (in seconds)",
    default: 60,
  },
}).argv;

const yamaha = new YamahaYXC(argv.host);
const client = mqtt.connect(argv.mqttUrl);

const executeCommand = (message) => {
  console.log("message", message);
  const { command, args } = JSON.parse(message);
  const method = yamaha[command];
  Reflect.apply(method, yamaha, args);
};

const fetchStatus = async () => {
  const [status, networkStatus, funcStatus, locationInfo] = await Promise.all([
    yamaha.getStatus(),
    yamaha.getNetworkStatus(),
    yamaha.getFuncStatus(),
    yamaha.getLocationInfo(),
  ]).then((results) => results.map(JSON.parse));
  const result = JSON.stringify({
    status,
    networkStatus,
    funcStatus,
    locationInfo,
  });
  client.publish(`${argv.mqttPrefix}/status`, result);
};

const handleMessage = (topic, ...params) => {
  if (topic === `${argv.mqttPrefix}/command`) {
    executeCommand(...params);
  }
};

client.on("message", handleMessage);
client.subscribe(`${argv.mqttPrefix}/command`);

fetchStatus();
setInterval(fetchStatus, argv.interval * 1000);
