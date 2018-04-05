const config = require("./config.json");

const snoowrap = require("snoowrap");
const circles = require("circle-of-trust");
const reddit = new snoowrap(config.auth);

const table = require("markdown-table");