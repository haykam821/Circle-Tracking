const config = require("./config.json");

const snoowrap = require("snoowrap");
const circler = require("circle-of-trust");
const reddit = new snoowrap(config.auth);

const amap = require("async").map;

const ct = reddit.getSubreddit("circletracking");
ct.fetch();

const cot = reddit.getSubreddit("CircleofTrust");
cot.fetch();

const moment = require("moment");

const table = require("markdown-table");
function section(title, description, data) {
    const header = `# ${title}`;
    const intervals = [
        "Overall",
        "24 hours",
        "12 hours",
        "6 hours",
        "3 hours",
    ];

    const circles = new Array(data.length).fill([]);
    data.forEach(row => {
        row.forEach((value, index) => {
            circles[index].push(`[${value.name}](${value.post_link})${value.betrayed ? " 💀" : ""}`);
        })
    });
    circles.unshift(intervals);

    const output = [];
    output.push(header, description, table(circles));
    return output.join("\n\n");
}

function transpose(a) {
    return a[0].map((_, c) => a.map(r => r[c]));
}

function within(circle, time) {
    return moment.unix(circle.timestamp).diff(moment(), "seconds") > time;
}
function fwithin(array, time) {
    return array.filter(circle => {
        return within(circle, time);
    });
}

(async function() {
    //const circled = await circler("haykam821");
    const topUnbetrayed = await cot.getTop({
        time: "all",
    });
    const topCircles = await Promise.all(topUnbetrayed.filter(value => {
        return value.selftext === ""; // mods' text posts should be ignored
    }).map(async value => {
        const circling = circler(value.author.name);
        circling.post_link = value.url;
        return circling;
    }));
    
    const data = [
        topCircles, fwithin(topCircles, 3600 * 24), fwithin(topCircles, 3600 * 12), fwithin(topCircles, 3600 * 6), fwithin(topCircles, 3600 * 3),
    ];
    console.log(data)
    const sections = [
        config.preamble,
        section("Largest Unbetrayed", "These are the circles that are still going strong and have the largest joiners without getting betrayed.", transpose(data)),
    ].join("\n\n");

    if (config.submit) {
        ct.submitSelfpost({
            title: `Circle Statistics - ${moment().format("l [at] LT")}`,
            text: sections,
        });
    } else {
        process.stdout.write(sections + "\n\n");
    }
})();