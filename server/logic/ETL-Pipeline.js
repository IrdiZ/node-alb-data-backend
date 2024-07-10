// This is ODA only, will make plug and play module later for different Data Sources

const { Client } = require("pg");
const { getOpenDataFullResponse } = require("./getOpenDataFullResponse");
require("dotenv").config({
  path: __dirname + "/../../.env",
}); // This loads the environment variables from .env into process.env

// Client object with postgres credentials
const client = new Client({
  user: "postgres",
  password: process.env.SECRET_KEY,
  host: "localhost",
  post: "5432",
  database: "postgres",
});

// connection with postgres db
client
  .connect()
  .then(() => {
    console.log("Connected to PostgreSQL!");
    //truncateTable("maindataitem")
    //we dont truncate here anymore
    synchronizeDBwithDS().catch((err) => {
      console.log("Error during proccess data operation:", err);
    });
  })
  .catch((reason) => {
    console.log("Error connecting to PostgreSQL ...", reason);
  });

async function synchronizeDBwithDS() {
  try {
    const sqlQuery = "SELECT COUNT(*) FROM maindataitem";
    const res = await client.query(sqlQuery);
    console.log(res.rows[0].count);
    if (res.rows[0].count == 0) {
      try {
        let mainDataObject;

        getOpenDataFullResponse(null, (error, response) => {
          if (error) {
            console.log("Error fetching data: ", error);
            return;
          } else {
            mainDataObject = response;
            //Turn string into json
            mainDataJson = JSON.parse(mainDataObject);

            for (const el of mainDataJson) {
              insertData(
                el.id,
                el.title,
                el.description,
                el.categories,
                el.organisationalStructureName,
                el.hasTable,
                el.hasGraph,
                el.hasMap,
                el.bigIcon,
                el.slug,
                el.url,
                el.publishedDate,
                el.updatedDate,
                el.lastUpdatedDate
              );
            }
          }
          console.log("All data inserted with success!");
        });
      } catch (err) {
        console.log("Error inserting data:", err);
      }
    } else {
      //TODO new DB column del_flag to ensure when items get deleted by DS they are kept on our DB

      //TODO add synch logic, that accounts for
      // new data, updated data, removed data, add del flag to that entry

      //Pseudocode

      //Check for updates first
      //Get each id from DS, compare DS date with DB date of entry
      // if date of DS on same-id entry is newer then update entry on DB

      //Check for inserts then
      //Get each id from DS, if i cant find it in DB, then its a new entry
      //Add it

      //Take ids of my DataBase, say from [36-127] so 91 items
      //check if these ids exist within DS, if not theyve been deleted.
      //Mark them with the deleted flag

      console.log("Synchronising...");
    }
  } catch (err) {
    console.log("Error on etl processing pipeline", err);
  }
}

async function insertData(
  id,
  title,
  description,
  categories,
  organisationalStructureName,
  hasTable,
  hasGraph,
  hasMap,
  bigIcon,
  slug,
  url,
  publishedDate,
  updatedDate,
  lastUpdatedDate
) {
  try {
    const query = `
      INSERT INTO maindataitem (
        id, title, description, categories, orgstructname,
        hasTable, hasGraph, hasMap, bigIcon, slug, url,
        publishedDate, updatedDate, lastUpdatedDate
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `;

    const urlValue = url !== undefined ? url : null;

    const values = [
      id,
      title,
      description,
      categories,
      organisationalStructureName,
      hasTable,
      hasGraph,
      hasMap,
      bigIcon,
      slug,
      urlValue,
      publishedDate,
      updatedDate,
      lastUpdatedDate,
    ];

    const res = await client.query(query, values);

    // console.log("Data inserted successfully:", res.rows[0]);
    return res.rows[0]; // Return the inserted row if needed
  } catch (err) {
    console.error("Error executing query:", err);
    throw err; // Handle or propagate the error
  }
}

//? This is for testing purposes
async function truncateTable(tableName) {
  try {
    const res = await client.query(`TRUNCATE TABLE ${tableName}`);
    console.log(`Table ${tableName} truncated successfully`);
    return res;
  } catch (err) {
    console.error("Error truncating table:", err);
    throw err;
  }
}
