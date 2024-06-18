function seedRandom(seed) {
    function xmur3(str) {
        for (var i = 0, h = 1779033703 ^ str.length; i < str.length; i++) {
            h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
            h = h << 13 | h >>> 19;
        }
        return function() {
            h = Math.imul(h ^ h >>> 16, 2246822507);
            h = Math.imul(h ^ h >>> 13, 3266489909);
            return (h ^= h >>> 16) >>> 0;
        }
    }

    function mulberry32(a) {
        return function() {
            var t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }
    }

    const seedFunc = xmur3(seed);
    return mulberry32(seedFunc());
}

// Use a data atual como semente
const today = new Date();
const seed = today.getFullYear().toString() + (today.getMonth() + 1).toString() + today.getDate().toString();
const random = seedRandom(seed);

// Função para obter um número aleatório com base na semente
function getRandom() {
    return random();
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const messageElement = document.getElementById('message');
const cellSizeRange = document.getElementById('cellSizeRange');
const cellSizeValue = document.getElementById('cellSizeValue');
const cellSizeLabel = document.getElementById('cellSizeLabel');
const startButton = document.getElementById('startButton');

let cellSize = 25;
let cols, rows;
let grid = [];
let stack = [];
let player = { x: 0, y: 0 };
let exit;
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

cellSizeRange.addEventListener('input', updateCellSizeValue);
startButton.addEventListener('click', startGame);
canvas.addEventListener('touchstart', handleTouchStart, false);
canvas.addEventListener('touchmove', handleTouchMove, false);
canvas.addEventListener('touchend', handleTouchEnd, false);

function updateCellSizeValue() {
    cellSize = parseInt(cellSizeRange.value);
    cellSizeValue.innerText = cellSize;
}

function resizeMaze() {
    cols = Math.round(canvas.width / cellSize);
    rows = Math.round(canvas.height / cellSize);
    exit = getRandomCorner();
}

function initGrid() {
    grid = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            grid.push(new Cell(x, y));
        }
    }
}

class Cell {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.visited = false;
        this.walls = [true, true, true, true]; // Topo, Direita, Fundo, Esquerda
    }

    draw() {
        const x = this.x * cellSize;
        const y = this.y * cellSize;
        ctx.strokeStyle = 'white';  // Cor das bordas
        ctx.fillStyle = 'black'; // Cor do preenchimento das células visitadas

        if (this.walls[0]) ctx.strokeRect(x, y, cellSize, 0); // Topo
        if (this.walls[1]) ctx.strokeRect(x + cellSize, y, 0, cellSize); // Direita
        if (this.walls[2]) ctx.strokeRect(x, y + cellSize, cellSize, 0); // Fundo
        if (this.walls[3]) ctx.strokeRect(x, y, 0, cellSize); // Esquerda

        if (this.visited) {
            ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        }
    }
}

function generateMaze() {
    const start = grid[0];
    stack = [start];
    start.visited = true;

    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const next = getRandomNeighbor(current);

        if (next) {
            next.visited = true;
            stack.push(next);
            removeWalls(current, next);
        } else {
            stack.pop();
        }
    }

    drawMaze();
}

function drawMaze() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    grid.forEach(cell => cell.draw());
    drawExit();
}

function removeWalls(current, next) {
    const x = current.x - next.x;
    const y = current.y - next.y;

    if (x === 1) {
        current.walls[3] = false;
        next.walls[1] = false;
    } else if (x === -1) {
        current.walls[1] = false;
        next.walls[3] = false;
    }

    if (y === 1) {
        current.walls[0] = false;
        next.walls[2] = false;
    } else if (y === -1) {
        current.walls[2] = false;
        next.walls[0] = false;
    }
}

function getRandomNeighbor(cell) {
    const neighbors = [];

    const top = grid[index(cell.x, cell.y - 1)];
    const right = grid[index(cell.x + 1, cell.y)];
    const bottom = grid[index(cell.x, cell.y + 1)];
    const left = grid[index(cell.x - 1, cell.y)];

    if (top && !top.visited) neighbors.push(top);
    if (right && !right.visited) neighbors.push(right);
    if (bottom && !bottom.visited) neighbors.push(bottom);
    if (left && !left.visited) neighbors.push(left);

    if (neighbors.length > 0) {
        const randIndex = Math.floor(getRandom() * neighbors.length);
        return neighbors[randIndex];
    } else {
        return undefined;
    }
}

function index(x, y) {
    if (x < 0 || y < 0 || x >= cols || y >= rows) {
        return -1;
    }
    return x + y * cols;
}

function drawPlayer() {
    ctx.fillStyle = 'blue';  // Cor do jogador
    ctx.fillRect(player.x * cellSize + 2, player.y * cellSize + 2, cellSize - 4, cellSize - 4);
}

function drawExit() {
    ctx.fillStyle = 'green';  // Cor da saída
    ctx.fillRect(exit.x * cellSize + 2, exit.y * cellSize + 2, cellSize - 4, cellSize - 4);
}

function checkExit() {
    if (player.x === exit.x && player.y === exit.y) {
        messageElement.innerText = 'Parabéns! Você saiu do labirinto!';
        document.removeEventListener('keydown', movePlayer);
    }
}

function movePlayer(event) {
    const key = event.key;

    if ((key === 'ArrowUp' || key === 'w') && !grid[index(player.x, player.y)].walls[0]) {
        player.y -= 1;
    } else if ((key === 'ArrowRight' || key === 'd') && !grid[index(player.x, player.y)].walls[1]) {
        player.x += 1;
    } else if ((key === 'ArrowDown' || key === 's') && !grid[index(player.x, player.y)].walls[2]) {
        player.y += 1;
    } else if ((key === 'ArrowLeft' || key === 'a') && !grid[index(player.x, player.y)].walls[3]) {
        player.x -= 1;
    } else if (key === 't' || key === 'T') {
        player = getRandomCorner();
        if (player.x === exit.x && player.y === exit.y) {
            player = getDifferentRandomCorner(exit);
        }
    }

    drawMaze();
    drawPlayer();
    checkExit();
}

function handleTouchStart(event) {
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}

function handleTouchMove(event) {
    const touch = event.touches[0];
    touchEndX = touch.clientX;
    touchEndY = touch.clientY;
}

function handleTouchEnd() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0) {
            movePlayer({ key: 'ArrowRight' });
        } else {
            movePlayer({ key: 'ArrowLeft' });
        }
    } else {
        if (deltaY > 0) {
            movePlayer({ key: 'ArrowDown' });
        } else {
            movePlayer({ key: 'ArrowUp' });
        }
    }
}



function getRandomCorner() {
    const corners = [
        { x: 0, y: 0 },
        { x: cols - 1, y: 0 },
        { x: 0, y: rows - 1 },
        { x: cols - 1, y: rows - 1 }
    ];
    return corners[Math.floor(getRandom() * corners.length)];
}

function getDifferentRandomCorner(corner) {
    let newCorner;
    do {
        newCorner = getRandomCorner();
    } while (newCorner.x === corner.x && newCorner.y === corner.y);
    return newCorner;
}

function initGame() {
    initGrid();
    generateMaze();
    drawPlayer();
    document.addEventListener('keydown', movePlayer);
}

function startGame() {
    resizeMaze();
    player = getRandomCorner();
    exit = getDifferentRandomCorner(player);
    messageElement.innerText = '';
    document.getElementById('cellSizeRange').style.display = 'none';
    document.getElementById('cellSizeValue').style.display = 'none';
    document.getElementById('cellSizeLabel').style.display = 'none';
    document.getElementById('startButton').style.display = 'none';
    document.getElementById('h2').style.display = 'none';
    document.getElementById('h3').style.display = 'none';
    document.getElementById('gameCanvas').style.display = 'block';
    initGame();
}

// Inicializa a visualização do tamanho da célula
updateCellSizeValue();