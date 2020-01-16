require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const winston = require('winston') // logging library
const uuid = require('uuid/v4')
const { NODE_ENV } = require('./config')
const app = express()
// format morgan whether in development or production
const morganOption = (NODE_ENV === 'production')
  ? 'tiny' // if in production 'tiny'
  : 'common'; // else 'common'

// require and configure a logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'info.log' })
    ]
})
if (NODE_ENV !== 'production') { 
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }))
}

app.use(morgan(morganOption))
app.use(helmet())
app.use(cors())
app.use(express.json());

// API KEY VALIDATION MIDDLEWARE
app.use(function validateBearerToken(req, res, next) {
    const apiToken = process.env.API_TOKEN
    const authToken = req.get('Authorization')
    logger.error(`Unauthorized request to path: ${req.path}`);
    if(!authToken || authToken.split(' ')[1] !== apiToken) {
        logger.error()
        return res.status(401).json({ error: 'Unauthorized request' })
    }
    // move to the next middleware
    next()
})
// ERROR HANDLER
app.use(function errorHandler(error, req, res, next) {
    let response
    if (NODE_ENV === 'production') {
        response = { error: { message: 'server error'}}
    } else {
        console.error(error)
        response = { message: error.message, error }
    }
    res.status(500).json(response)
    next()
})

// Construct cards and lists to use in the GET endpoints
const cards = [
    {
        id: 1,
        title: 'Task One',
        content: 'This is card one'},
    {
        id: 2,
        title: 'Task Two',
        content: 'This is card two'
    },
    {
        id: 3,
        title: 'Task Three',
        content: 'This is card three'
    }
];
const lists = [{
    id: 1,
    header: 'List One',
    cardIds: [1]
}];


// GET ENDPOINTS
app.get('/cards', (req, res) => {
    res.json(cards)
})
app.get('/lists', (req, res) => {
    res.json(lists)
})

// GET cards or lists by id
app.get('/cards/:id', (req, res) => {
    const { id } = req.params;
    const card = cards.find(c => c.id == id);
    // validate card is found
    if(!card) {
        logger.error(`Card with id ${id} is not found.`);
        return res.status(404).send('Card not found');
    }
    res.json(card);
})

app.get('/lists/:id', (req, res) => {
    const { id } = req.params;
    const list = lists.find(li => li.id == id);
    // validate list is found
    if (!list) {
        logger.error(`List with id ${id} is not found.`);
        return res.status(404).send('Card not found');
    }
    res.json(list);
})


// POST ENDPOINTS
app.post('/cards', (req, res) => {
    // get data from body to use in the POST cards endpoint
    const { title, content } = req.body;
    // validate that both title and content exist
    // log error if not
    if(!title) {
        logger.error(`Title is required`);
        return res.status(400).send('Invalid data');
    }
    if(!content) {
        logger.error(`Content is required`);
        return res.status(400).send('Invalid data');
    }
    // Generate an ID and push a card object into the array
    const id = uuid(); // generate an id
    const card = {
        id, 
        title,
        content
    }
    cards.push(card)
    // Log the card creation and send a res including a location header
    logger.info(`Card with id ${id} created`);
    res.status(201)
    .location(`http://localhost:8000/card/${id}`)
    .json(card);
})

app.post('/lists', (req, res) => {
    // get data from body to use in the POST lists endpoint
    const { header, cardIds = [] } = req.body;
    // validate that both header and cardIds exist
    if (!header) {
        logger.error(`Header is required`);
        return res.status(400).send('Invalid data');
    }
    // Check that all IDs in list refer to actual IDs of cards in the cards array
    console.log(cardIds);
    if (cardIds.length > 0) {
        let valid = true;
        cardIds.forEach(cid => {
            const card = cards.find(c => c.id == cid);
            if (!card) {
              logger.error(`Card with id ${cid} not found in cards array.`);
              valid = false;
            }
        });
        if(!valid) {
            return res.status(400).send('Invalid data');
        }
    }
    // Generate an ID and push a list object into the array
    const id = uuid();
    const list = {
        id,
        header,
        cardIds
    }
    // Log the list creation and push a list object into the array
    lists.push(list);
    res.status(201)
    .location(`http://localhost:8000/list/${id}`)
    .json({id});
})

module.exports = app