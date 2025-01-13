const express = require('express')


const bodyParser = require('body-parser');
var passport = require('passport');
var session = require('express-session');

var env = require('dotenv').config(); 
var env = process.env.NODE_ENV;
var config = require('./config.json')[env];

//=========configuring express=========//
const port = process.env.PORT || 3000;

const app = express();

app.use(express.urlencoded( { extended: true } ));
app.use(express.json()); 
app.use(session({
    secret: 'secretkey',
    resave: false,
    saveUninitialized: false
}));
app.use(express.static("public"));

//=====================================//

const DB = require('./database')(config);
console.log(DB.db);
app.get('/', async (req, res) => {
  res.json({
    "status": true,
    "message": "Hello World" 
  }).status(200);
});

app.listen(port, async() => {
  console.log(`app listening on port ${port}`)
})