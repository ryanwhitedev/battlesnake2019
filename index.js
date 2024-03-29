const bodyParser = require('body-parser')
const express = require('express')
const logger = require('morgan')
const app = express()
const {
  fallbackHandler,
  notFoundHandler,
  genericErrorHandler,
  poweredByHandler
} = require('./handlers.js')
const pathfinding = require('./app/pathfinding');

// For deployment to Heroku, the port needs to be set using ENV, so
// we check for the port number in process.env
app.set('port', (process.env.PORT || 9001))

app.enable('verbose errors')

app.use(logger('dev'))
app.use(bodyParser.json())
app.use(poweredByHandler)

// --- SNAKE LOGIC GOES BELOW THIS LINE ---
function foodPath(board, you) {
  const food = pathfinding.findClosestFood(board, you);
  if(!food) return null;

  return pathfinding.closestToFood(board, you, food);
}

function isLongest(board, you) {
  const enemySnakes = board.snakes.filter((snake) => {
    return !util.isDeepStrictEqual(you.body, snake.body) ? snake : false;
  });

  for(let i = 0; i < enemySnakes.length; i++) {
    if(enemySnakes[i].body.length >= you.body.length) {
      return false;
    }
  }
  return true;
}

// Last resort to stay alive
function survive(board, you) {
  const snakeHead = you.body[0];
  return pathfinding.getPossibleMoves(board, snakeHead);
}

function chaseTail(board, you) {
  const tail = you.body[you.body.length - 1];
  return pathfinding.findRoute(board, you, tail);
}

// Handle POST request to '/start'
app.post('/start', (request, response) => {
  // NOTE: Do something here to start the game

  // Response data
  const data = {
    color: '#DFFF00',
  }

  return response.json(data)
})

// Handle POST request to '/move'
app.post('/move', (request, response) => {
  // NOTE: Do something here to generate your move  
  const { board, you } = request.body;
  let target = null;
  
  if(you.health < 35 || !isLongest(board, you)) {
    target = foodPath(board, you);
  }

  if (!target) {
    target = chaseTail(board, you);
  } 

  if(!target) {
    target = survive(board, you);
  }

  const move = target[0].move;

  // // Response data
  const data = {
    move // one of: ['up','down','left','right']
  };

  return response.json(data);
});

app.post('/end', (request, response) => {
  // NOTE: Any cleanup when a game is complete.
  return response.json({})
})

app.post('/ping', (request, response) => {
  // Used for checking if this snake is still alive.
  return response.json({});
})

// --- SNAKE LOGIC GOES ABOVE THIS LINE ---

app.use('*', fallbackHandler)
app.use(notFoundHandler)
app.use(genericErrorHandler)

app.listen(app.get('port'), () => {
  console.log('Server listening on port %s', app.get('port'))
})
