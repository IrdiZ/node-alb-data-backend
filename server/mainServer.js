const express = require("express");
const app = express();
const port = 3000;

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

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
