require("dotenv").config();
const express = require("express");
const path = require("path");
const app = express();
const cors = require('cors');
const axios = require("axios");
const crypto = require("crypto");
const { pipeline } = require("stream");


const circleci = require("./routes/circleci")

let port = process.env.PORT || "5000";

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use('/v1/cicd',circleci)


app.listen(port, () => {
    console.log(`App Running at http://localhost:${port}`);
})