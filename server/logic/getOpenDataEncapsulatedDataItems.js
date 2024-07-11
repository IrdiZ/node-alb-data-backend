const { Client } = require("pg");
const fs = require("fs");
require("dotenv").config({
  path: __dirname + "/../../.env",
}); // This loads the environment variables from .env into process.env
const https = require("https");

const client = new Client({
  user: "postgres",
  host: "localhost",
  database: "postgres",
  password: process.env.SECRET_KEY,
  port: 5432,
});
function clientConnection() {
  return new Promise((resolve, reject) => {
    client
      .connect()
      .then(() => {
        console.log("Connected to PostgreSQL!");
        resolve(client); // Resolve the client instance once connected
      })
      .catch((reason) => {
        console.error("Error connecting to PostgreSQL ...", reason);
        reject(reason); // Reject with the reason if connection fails
      });
  });
}

clientConnection()
  .then((client) => {
    // Use the connected client for queries
    return client.query("SELECT slug, id from maindataitem;");
  })
  .then((res) => {
    console.log("Query result:", res.rows);
    console.log(" " + res.rows.length);
    getDataItemPerSlug(res.rows)
      .then((allData) => {
        console.log("All data retrieved, its length is", allData.length);

        //for each object
        for (const object of allData) {
          console.log(object);
          //TODO get content and columns into maindataitem

          const serviceDataList = object.serviceDataList; // assuming serviceDataList is part of object
          // get id
          getIdByTitle(object.name)
            .then((result) => {
              console.log("Result:", result);
              // Further processing of the result here
              // this means all serviceDataCategoryIds are null
              const insertPromises = serviceDataList.map((el) => {
                const customJsonEntry = {
                  dataitemid: result[0].id, // get it from main item,
                  name: el.name,
                  url: el.url,
                  type: el.type,
                  icon: el.icon,
                  html: el.html,
                  slug: el.slug,
                  downloadNumber: el.downloadNumber,
                  serviceDataCategoryId: el.serviceDataCategoryId,
                };

                return insertServiceDataListItem(customJsonEntry);
              });

              return Promise.all(insertPromises);
            })
            .then(() => {
              console.log("All entries inserted successfully.");
            })
            .catch((error) => {
              console.error("Error:", error);
            });
        }

        //TODO now we handle serviceDataCategoryList

        // //write to file
        // fs.writeFile("output.json", JSON.stringify(allData), "utf8", (err) => {
        //   if (err) {
        //     console.error("Error writing file:", err);
        //     return;
        //   }
        //   console.log("File has been saved successfully.");
        // });
      })
      .catch((error) => {
        console.error("Error retrieving data:", error);
      });
  })
  .catch((error) => {
    console.error("Error during query:", error);
  });

function insertServiceDataListItem(entry) {
  return new Promise((resolve, reject) => {
    const queryText = `
        INSERT INTO serviceDataListItem 
        (dataitemid, name, url, type, icon, html, slug, downloadNumber, serviceDataCategoryId) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
    const values = [
      entry.dataitemid,
      entry.name,
      entry.url,
      entry.type,
      entry.icon,
      entry.html,
      entry.slug,
      entry.downloadNumber,
      entry.serviceDataCategoryId,
    ];

    client
      .query(queryText, values)
      .then((res) => {
        resolve(res);
      })
      .catch((err) => {
        reject("Error executing insert query", err);
      });
  });
}

function getIdByTitle(title) {
  return new Promise((resolve, reject) => {
    if (!client._connected) {
      client.connect().catch((err) => {
        return reject("Error connecting to PostgreSQL:", err);
      });
    }

    const queryText = "SELECT id FROM maindataitem WHERE title = $1";
    const values = [title];

    client
      .query(queryText, values)
      .then((res) => {
        resolve(res.rows);
      })
      .catch((err) => {
        reject("Error executing query", err);
      });
  });
}

//? Nice improvement here, Promise.all significantly reduced fetching time
//? as opposed to before attempt using just simple iterative fetching
//? from 10-20s to around 1s
/*
 * @returns {JSON} returns the slug info as json obj
 */
async function getDataItemPerSlug(slugObjectArray) {
  try {
    const fetchPromises = slugObjectArray.map(async (slugObject) => {
      try {
        const data = await fetchFromCustomUrl(slugObject.slug);
        console.log(`Data retrieved for slug ${slugObject.slug}`);

        jsonobject = JSON.parse(data);
        return jsonobject;
      } catch (error) {
        console.error(
          `Error fetching data for slug ${slugObject.slug}:`,
          error
        );
        return null; // or handle the error as needed
      }
    });

    const allObjectList = await Promise.all(fetchPromises);
    return allObjectList.filter((data) => data !== null);
  } catch (error) {
    console.error("Error in getDataItemPerSlug:", error);
    return []; // or handle the error as needed
  }
}

function fetchFromCustomUrl(slug) {
  return new Promise((resolve, reject) => {
    let finalData = "";
    https
      .get(
        {
          hostname: "opendata.gov.al",
          agent: false, // Create a new agent just for this one request,
          path: "/api/sq/services/" + slug,
        },
        (res) => {
          // Handle response data
          res.on("data", (d) => {
            finalData += d;
          });

          // Resolve finalData when response ends
          res.on("end", () => {
            resolve(finalData);
          });
        }
      )
      .on("error", (e) => {
        reject(e); // Reject promise on error
      });
  });
}
