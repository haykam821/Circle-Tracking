const config = require("./config.json");

const snoowrap = require("snoowrap");
const circler = require("circle-of-trust");
const reddit = new snoowrap(config.auth);

const ct = reddit.getSubreddit("circletracking");
ct.fetch();

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
            circles[index].push(`[${value.name}](${value.link})${value.betrayed ? " 💀" : ""}`);
        })
    });
    circles.unshift(intervals);

    const output = [];
    output.push(header, description, table(circles));
    return output.join("\n\n");
}

(async function() {
    const circled = await circler("haykam821");
    const sections = [
        section("Largest Unbetrayed", "These are the circles that are still going strong and have the largest joiners without getting betrayed.", [
            [circled],
        ]),
    ].join("\n\n");

    ct.submitSelfpost({
        title: `Circle Statistics - ${moment().format("l [at] LT")}`,
        text: sections,
    });
})();