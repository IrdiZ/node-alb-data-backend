const express = require("express");
const app = express();
const port = 3000;
const fs = require("fs");
const path = require("path");
const { runCustomQuery } = require("./api/runCustomQuery");
const cors = require("cors");

app.use(cors());

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

app.get("/api/json-download", async (req, res) => {
  // Example usage of the imported runCustomQuery function
  const query = "SELECT name, url FROM servicedatalistitem where type='JSON'";

  runCustomQuery(query)
    .then((data) => {
      //proccess and complete links
      data = completeLinks(data);
      res.send("Downloaded Successfully!");
    })
    .catch((err) => {
      console.error("Error executing query:", err);
    });
});

app.get("/api/json-files", async (req, res) => {
  try {
    // Example usage of the imported runCustomQuery function
    const query = "SELECT name FROM servicedatalistitem where type='JSON'";

    const data = await runCustomQuery(query);

    // Array to store results
    const results = [];

    // Iterate through data and read corresponding JSON files
    await Promise.all(
      data.map(async (obj) => {
        const fileName = `${obj.name.trim()}.json`;
        const filePath = path.join(__dirname, "data", fileName);

        // Check if file exists
        if (fs.existsSync(filePath)) {
          // Read file content synchronously (assuming small file sizes)
          const jsonData = JSON.parse(fs.readFileSync(filePath, "utf8"));
          results.push({ name: obj.name, data: jsonData });
        } else {
          console.error(`File ${fileName} not found.`);
        }
      })
    );

    // Return results as JSON response
    res.json(results);
  } catch (error) {
    console.error("Error fetching JSON files:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

function completeLinks(data) {
  let str = "http://opendata.gov.al";
  return data.map((el) => {
    if (!el.url.includes(str)) {
      el.url = str + el.url;
    }
    if (el.url.includes("/filter/json")) {
      el.dateInput = true;
    } else {
      el.dateInput = false;
      let fileUrl = el.url;
      let outputLocationPath = "./data/" + el.name.trim() + ".json";
      downloadFile(fileUrl, outputLocationPath)
        .then(() => {
          console.log("File downloaded successfully.");
        })
        .catch((error) => {
          console.error("Error downloading file:", error);
        });
    }
    return el;
  });
}

const { createWriteStream } = require("fs");
const axios = require("axios");

async function downloadFile(fileUrl, outputLocationPath) {
  const writer = createWriteStream(outputLocationPath);

  return axios({
    method: "get",
    url: fileUrl,
    responseType: "stream",
  }).then((response) => {
    // Ensure that the user can call `then()` only when the file has
    // been downloaded entirely.
    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      let error = null;
      writer.on("error", (err) => {
        error = err;
        writer.close();
        reject(err);
      });
      writer.on("close", () => {
        if (!error) {
          resolve(true);
        }
        // No need to call the reject here, as it will have been called in the
        // 'error' stream.
      });
    });
  });
}
