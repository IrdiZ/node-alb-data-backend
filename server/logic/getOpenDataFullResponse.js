const https = require("https");

// So i dont need cookie now?
// wtf, ok?

/**
 * Retrieves full response based on provided filter array asynchronously.
 * @param {number[] | null | undefined} filterArray - Array of length 2, where each is either 0 or 1.
 * @param {function(Error, string): void} callback - Callback function to handle the response or error.
 */
function getOpenDataFullResponse(filterArray, callback) {
  // with both openInformation and OpenData Filter on
  let customServiceTypeFilter = filterArray || [1, 2];
  let finalData = "";
  // post data
  const postData = {
    search: "",
    categoryFilter: [],
    typeFilter: [],
    institutionFilter: [],
    serviceTypeFilter: customServiceTypeFilter,
  };
  // Json payload
  const post_payload = JSON.stringify(postData);

  const options = {
    hostname: "opendata.gov.al",
    path: "/api/sq/services-filter",
    agent: false, // Create a new agent just for this one request,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(post_payload),
    },
  };

  const req = https.request(options, (res) => {
    console.log("statusCode:", res.statusCode);
    console.log("headers:", res.headers);

    res.on("data", (chunk) => {
      // Accumlate chunks
      finalData += chunk;
    });

    res.on("end", () => {
      console.log("Data retrieved with success!");
      callback(null, finalData); // Pass data to callback
    });
  });

  req.write(post_payload);
  //no need for end agent = false;

  req.on("error", (e) => {
    console.error("Request error:", e);
    callback(e);
  });
}

module.exports = { getOpenDataFullResponse };
