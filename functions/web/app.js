'use strict';

const AWS = require("aws-sdk");
AWS.config.update({ region: process.env.AWS_REGION });
const docClient = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10'
});

const serverless = require('serverless-http');
const express    = require('express');
const bodyParser = require('body-parser');

const app = express();

// const auth = require('./lib/auth');

const rooms   = require('./rooms.js');
const room    = require('./room.js');
const results = require('./results.js');
const vote    = require('./vote.js');
const owner   = require('./owner.js');

// const sequence = require('../sequence.js')

app.use('/', express.static(__dirname + '/public'));
// app.use(auth);

app.set('views', './functions/web/views');
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/rooms', (req, res) => { rooms.index(req, res); });
app.post('/rooms', (req, res) => { rooms.create(req, res); });

app.get('/rooms/:roomId', (req, res) => { room.index(req, res); });

app.get( '/rooms/:roomId/owner',         (req, res) => { owner.index(req, res); });
app.get( '/rooms/:roomId/owner/starion', (req, res) => { owner.starion(req, res); });
app.get( '/rooms/:roomId/owner/starion_csv', (req, res) => { owner.starion_csv(req, res); });
app.post('/rooms/:roomId/owner/rank',   (req, res) => { owner.rank(req, res); });
app.post('/rooms/:roomId/owner/decide', (req, res) => { owner.decide(req, res); });
app.post('/rooms/:roomId/owner/lose', (req, res)   => { owner.lose(req, res); });
app.post('/rooms/:roomId/owner/remove', (req, res) => { owner.remove(req, res); });


app.get('/rooms/:roomId/results', (req, res) => { results.index(req, res); });

app.get( '/rooms/:roomId/vote', (req, res) => { vote.index(req, res); });
app.post('/rooms/:roomId/vote', (req, res) => { vote.vote(req, res); });

module.exports.handler = serverless(app);


// Promise内の捕捉されなかった例外の詳細なスタックトレースを表示する
process.on('unhandledRejection', console.dir);
