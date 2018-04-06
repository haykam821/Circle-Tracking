const config = require("./config.json");
const version = require("./package.json").version;

const snoowrap = require("snoowrap");
const circler = require("circle-of-trust");
const reddit = new snoowrap({
    password: config.auth.password,
    username: config.auth.username,
    clientId: config.auth.clientId,
    clientSecret: config.auth.clientSecret,
    userAgent: `r/${config.outputSubreddit} for info | v${version}`,
});

const ct = reddit.getSubreddit(config.outputSubreddit);
ct.fetch();

const cot = reddit.getSubreddit("CircleofTrust");
cot.fetch();

const moment = require("moment");

const table = require("markdown-table");
function section(title, description, data) {
    const intervals = [
        "#",
        "Overall",
        "72 hours",
        "48 hours",
        "24 hours",
        "12 hours"
    ];

    const circles = data.map((row, index) => {
        const output = row.map(value => {
            return value ? `[${value.name}](${value.link}) (+${value.members}) ${value.betrayed ? " 💀" : ""}` : "";
        });
        output.unshift(index + 1);

        return output;
    });
    circles.unshift(intervals);

    const output = [];
    output.push(config.preamble, description, table(circles));
    return {
        header: title,
        text: output.join("\n\n"),
    };
}

function transpose(a) {
    return a[0].map((_, c) => a.map(r => r[c]));
}

function within(circle, time) {
    const circleCreation = moment(circle.creation_date);
    const now = moment();

    const diff = now.diff(circleCreation, "hours");
    return diff < time;
}
function fwithin(array, time) {
    return array.filter(circle => {
        return within(circle, time);
    }).sort((item, item2) => {
        const memberReturn = item.members > item2.members ? -1 : 1;
        return memberReturn;
    });
}
function filterify(value, filter = function(){return true}) {
    const topCircles = value.filter(filter).splice(0, 20);
    return [
        fwithin(topCircles, Infinity), // A very large number is overall, I guess.
        fwithin(topCircles, 72),
        fwithin(topCircles, 48), 
        fwithin(topCircles, 24),
        fwithin(topCircles, 12),
    ];
}
function dataify(value, filter) {
    return transpose(filterify(value, filter));
}

(async function() {
    const topFew = await cot.getTop({
        time: "all",
    });
    const top = await topFew.fetchMore({
        amount: 750,
    });
    const topCircles = await Promise.all(top.filter(value => {
        return value.selftext === ""; // mods' text posts should be ignored
    }).map(async value => {
        const circling = await circler(value.author.name);
        return circling;
    }));
    const sections = [
        section("Largest Circles", "These are the largest circles, based on how many members have joined before betrayal (if it has happened yet).", dataify(topCircles)),
        section("Largest Circles (without Betrayal)", "These are the circles that are still going strong and have the largest joiners without getting betrayed.", dataify(topCircles, v => !v.betrayed)),
    ];

    if (config.submit) {
        sections.forEach(value => {
            ct.submitSelfpost({
                title: `${value.header} - ${moment().format("l [at] LT")}`,
                text: value.text,
            });
        });
    } else {
        //process.stdout.write(config.preamble + "\n\n" + sections + "\n\n");
    }
})();