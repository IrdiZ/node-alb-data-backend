//send request to url:
// https://opendata.gov.al/
// HTTP is HTTP protocol over TLS,SSL.

//http agent
// Manages connection persistence and reuse for http clients.
// Maintains queue of pending requests, reusing a single socket connection for each.
let aspCookie = null;
https = require("https");

https.get(
  {
    hostname: "opendata.gov.al",
    agent: false, // Create a new agent just for this one request,
    path: "/",
  },
  (res) => {
    //get raw headers from response
    rawHeaders = res.rawHeaders;
    for (const el of rawHeaders) {
      //check if asp cookie is part of that
      if (el.includes(".AspNetCore.Antiforgery.2IaIegZAh2o")) {
        aspCookie = el;
      }
    }
  }
);

function getTheAspCookie() {
  if (aspCookie != null) {
    return aspCookie;
  } else {
    throw new Error("Asp Cookie not found");
  }
}

module.exports = { getTheAspCookie };
