const { Pool } = require("pg");
require("dotenv").config({
  path: __dirname + "/../../.env",
});
// Replace these with your actual database connection details
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "postgres",
  password: process.env.SECRET_KEY,
  port: 5432,
});

async function runCustomQuery(query) {
  try {
    const client = await pool.connect();
    try {
      const res = await client.query(query);
      //console.log("Query result:", res.rows);
      return res.rows;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Error executing query", err.stack);
  }
}

module.exports = { runCustomQuery };
