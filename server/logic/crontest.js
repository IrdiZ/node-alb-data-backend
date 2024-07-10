var cron = require("node-cron");
/*  timeString format source: https://www.npmjs.com/package/node-cron
    Last updated: 7/10/2024
 # ┌────────────── second (optional)
 # │ ┌──────────── minute
 # │ │ ┌────────── hour
 # │ │ │ ┌──────── day of month
 # │ │ │ │ ┌────── month
 # │ │ │ │ │ ┌──── day of week
 # │ │ │ │ │ │
 # │ │ │ │ │ │
 # * * * * * *
 Check link for additional options such as 0-59 [sec], etc.
*/
var timeString = "* * * * *";

if (cron.validate(timeString)) {
  cron.schedule(
    timeString,
    () => {
      console.log("Running a job every minute at Europe/Tirane timezone");
    },
    {
      scheduled: true,
      timezone: "Europe/Tirane",
    }
  );
} else {
  console.log("timeString is not correct!: " + timeString);
}
