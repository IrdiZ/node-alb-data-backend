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
        console.error(
          `Error executing insert query for serviceDataListItem: ${err.message}`
        );
        reject(`Error executing insert query: ${err.message}`);
      });
  });
}

function insertServiceDataCategoryListItem(entry) {
  return new Promise((resolve, reject) => {
    const queryText = `
        INSERT INTO servicedatacategorylistitem 
        (id, name, dataitemid) 
        VALUES ($1, $2, $3)
      `;
    const values = [entry.id, entry.name, entry.dataitemid];

    client
      .query(queryText, values)
      .then((res) => {
        resolve(res);
      })
      .catch((err) => {
        console.error(
          `Error executing insert query for serviceDataCategoryListItem: ${err.message}`
        );
        reject(new Error(`Error executing insert query: ${err.message}`));
      });
  });
}

//? cant enforce foreign key contraint here, idk why

clientConnection()
  .then((client) => {
    // Use the connected client for queries
    return client.query("SELECT slug, id from maindataitem;");
  })
  .then((res) => {
    console.log("Query result:", res.rows);
    console.log(" " + res.rows.length);
    return getDataItemPerSlug(res.rows);
  })
  .then((allData) => {
    console.log("All data retrieved, its length is", allData.length);

    const categoryPromises = allData.map((object) => {
      const serviceDataCategoryList = object.serviceDataCategoryList || [];

      return serviceDataCategoryList.map((el) => {
        return getIdByTitle(object.name).then((result) => {
          if (el.data.length === 0) {
            return;
          }
          const customJsonEntry = {
            id: el.data[0].serviceDataCategoryId,
            name: el.name,
            dataitemid: result[0].id,
          };

          const nestedServiceDataList = el.data || [];

          const nestedInsertPromises = nestedServiceDataList.map((nestedEl) => {
            const nestedEntry = {
              dataitemid: result[0].id,
              name: nestedEl.name,
              url: nestedEl.url,
              type: nestedEl.type,
              icon: nestedEl.icon,
              html: nestedEl.html,
              slug: nestedEl.slug,
              downloadNumber: nestedEl.downloadNumber,
              serviceDataCategoryId: nestedEl.serviceDataCategoryId,
            };
            return insertServiceDataListItem(nestedEntry);
          });

          return Promise.all(nestedInsertPromises).then(() => {
            if (customJsonEntry.id) {
              return insertServiceDataCategoryListItem(customJsonEntry);
            }
          });
        });
      });
    });

    // Flatten the array of promises
    const flattenedCategoryPromises = categoryPromises.flat();

    return Promise.all(flattenedCategoryPromises).then(() => {
      const dataPromises = allData.map((object) => {
        const serviceDataList = object.serviceDataList || [];

        return serviceDataList.map((el) => {
          return getIdByTitle(object.name).then((result) => {
            const customJsonEntry = {
              dataitemid: result && result.length > 0 ? result[0].id : null,
              name: el.name,
              url: el.url,
              type: el.type,
              icon: el.icon,
              html: el.html,
              slug: el.slug,
              downloadNumber: el.downloadNumber,
              serviceDataCategoryId: el.serviceDataCategoryId || null,
            };

            return insertServiceDataListItem(customJsonEntry);
          });
        });
      });

      // Flatten the array of promises
      const flattenedDataPromises = dataPromises.flat();

      return Promise.all(flattenedDataPromises);
    });
  })
  .then(() => {
    console.log("All entries inserted successfully.");
  })
  .catch((error) => {
    console.error("Error:", error);
  });

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
        console.error(`Error executing query for getIdByTitle: ${err.message}`);
        reject(`Error executing query: ${err.message}`);
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

        const jsonobject = JSON.parse(data);
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

function fetchFromCustomUrl(slug, retries = 3) {
  return new Promise((resolve, reject) => {
    const attemptFetch = (attempt) => {
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
          if (attempt < retries) {
            console.log(`Retrying fetch... attempt ${attempt + 1}`);
            attemptFetch(attempt + 1); // Retry the fetch
          } else {
            reject(e); // Reject promise on error after all retries
          }
        });
    };

    attemptFetch(0); // Start with the first attempt
  });
}
