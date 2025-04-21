// console.log("hello world");

const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.send("Helloo World!");
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});