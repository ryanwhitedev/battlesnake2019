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
const util = require('util');
const Heap = require('heap');

// For deployment to Heroku, the port needs to be set using ENV, so
// we check for the port number in process.env
app.set('port', (process.env.PORT || 9001))

app.enable('verbose errors')

app.use(logger('dev'))
app.use(bodyParser.json())
app.use(poweredByHandler)

// --- SNAKE LOGIC GOES BELOW THIS LINE ---
function samePoint(pointA, pointB) {
  return pointA.x === pointB.x && pointA.y === pointB.y;
}

// Remove moves that fall outside of board (grid) boundaries
function insideGrid(move, { height, width }) {
  return move.x >= 0 && move.x < width && move.y >= 0 && move.y < height;
}

function distanceToTarget(self, target) {
  return Math.abs(self.x - target.x) + Math.abs(self.y - target.y);
}

function avoidCollisions(move, snake) {
  for (let i = 0; i < snake.length; i++) {
    let isSamePoint = samePoint(move, snake[i]);
    if (isSamePoint) return false;
  }
  return true;
}

function getOtherSnakes({ snakes }, { body: self }) {
  return snakes.filter((snake) => {
    if (!util.isDeepStrictEqual(self, snake.body)) return snake;
  });
}

// ID used as key to store node in reachedList object
function nodeID(node) {
  return `${node.x},${node.y}`;
}

function storeReachedNodes(list, node, route) {
  const id = nodeID(node);
  return list[id] = route;
}

function findReachedNodes(list, node) {
  const id = nodeID(node);
  return list[id];
}

// Implement A* pathfinding algorithm to find best route
function findRoute(board, you, target) {
  const snakeHead = you.body[0];
  const minHeap = new Heap((a, b) => a.score - b.score);       // smallest element will `pop()` first
  const reachedList = {};

  minHeap.push({ 
    route: [snakeHead], 
    score: distanceToTarget(snakeHead, target) 
  });
  reachedList[nodeID(snakeHead)] = [snakeHead];

  while (!minHeap.empty()) {
    let route = minHeap.pop().route;
    let endpoint = route[route.length - 1];
    console.log(endpoint)
    if (samePoint(endpoint, target)) {
      return route;
    }

    let moves = getPossibleDirections(board, you, endpoint);
    moves.forEach((move) => {
      let newRoute = route.concat(move);
      let newScore = newRoute.length + distanceToTarget(move, target);

      minHeap.push({
        route: newRoute,
        score: newScore
      });
      
      let reachedNode = findReachedNodes(reachedList, move);
      if(!reachedNode || reachedNode.length > newRoute.length) {
        storeReachedNodes(reachedList, move, newRoute)
      }
    });
  }

  return null;
}

// Return possible moves within board boundary
function getPossibleDirections(board, you, snakeHead) {
  const otherSnakes = getOtherSnakes(board, you);
  const moves = [
    { x: snakeHead.x, y: snakeHead.y + 1, move: 'down' },
    { x: snakeHead.x, y: snakeHead.y - 1, move: 'up' },
    { x: snakeHead.x + 1, y: snakeHead.y, move: 'right' },
    { x: snakeHead.x - 1, y: snakeHead.y, move: 'left' },
  ];

  return moves.filter((move) => {
    if (!insideGrid(move, board)) {
      return false;
    } 
    if(!avoidCollisions(move, you.body)) {
      return false;
    }
    for (let i = 0; i < otherSnakes.length; i++) {
      if(avoidCollisions(move, otherSnakes[i].body)) {
        return false;
      }
    }
    return move;
  });
}

function findClosestFood(snakeHead, arr) {
  const distances = arr.map((item) => distanceToTarget(snakeHead, item));

  let min = null;
  for(let i = 0; i <= distances.length; i++) {
    if (min === null || distances[i] < min) {
      min = distances[i];
    }
  }

  const idx = distances.indexOf(min);
  return arr[idx];
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
  // const nextMove = calcMove(request.body);
  
  const { board, you } = request.body;
  const target = findClosestFood(you.body[0], board.food);
  const route = findRoute(board, you, target);
  const move = route[1].move;

  // // Response data
  const data = {
    move // one of: ['up','down','left','right']
  }

  return response.json(data)
})

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
