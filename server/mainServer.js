const express = require("express");
const app = express();
const port = 3000;

const { runCustomQuery } = require("./api/runCustomQuery");

// Simple middleware function that logs request details
const loggerMiddleware = (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next(); // Pass control to the next middleware/handler
};

// Use the logger middleware for all routes
app.use(loggerMiddleware);

// Define the '/' endpoint
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.get("/api/json-links", async (req, res) => {
  // Example usage of the imported runCustomQuery function
  const query = "SELECT url FROM servicedatalistitem where type='JSON'";

  runCustomQuery(query)
    .then((data) => {
      //proccess and complete links
      data = completeLinks(data);
      res.send(data);
    })
    .catch((err) => {
      console.error("Error executing query:", err);
    });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

function completeLinks(data) {
  let str = "http://opendata.gov.al";
  for (var el of data) {
    if (!el.url.includes(str)) {
      el.url = str + el.url;
    }
  }
  return data;
}
