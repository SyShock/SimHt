#!/usr/bin/env node

'use strict';

const server = require("./server.js")
const port = 8080;

server.instance.listen(port);
console.info(`SimHt started on port :${port}`)