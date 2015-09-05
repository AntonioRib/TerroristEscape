// DancingDog.js - inicial version by AMD/2014
				//updated version by AntónioRibeiro e VascoCoelho/2014 


// GENERAL FUNCTIONS

function create(proto) { // Create object and applies init(...) to it
	function F() {}
	F.prototype = proto;
	var obj = new F();
	if( arguments.length > 1 )
		obj.init.apply(obj, Array.prototype.slice.apply(arguments).slice(1));
	return obj;
}

function extend(proto, added) { // Creates new prototype that extends existing prototype
	function F() {}
	F.prototype = proto;
	var proto1 = new F();
	for(prop in added)
		proto1[prop] = added[prop]; 
	return proto1;
}

function rand(n) {
	return Math.floor(Math.random() * n);
}

function distance(x1, y1, x2, y2) {
	var distx = Math.abs(x1 - x2);
	var disty = Math.abs(y1 - y2);
	return Math.ceil(Math.sqrt(distx*distx + disty*disty));
}


function neighbours(x1, y1){
	var choice = [];
	for(i in around){
		if(!world[x1+around[i][0]][y1+around[i][1]].isObject()){
			choice.push([x1+around[i][0], y1+around[i][1]]);
		}
	}
	return choice;
}

function mesg(m) {
	return alert(m);
}


// GLOBAL CONSTANTS

//WORLD CONSTATNTS
const WORLD_WIDTH = 31;
const WORLD_HEIGHT = 18;
const ACTOR_PIXELS = 32;
const N_BOWLS = 120;
const N_CRABS = 5;
const around = [[0,-1],[-1,0],[1,0],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];

//EVENT CONSTANTS
const MIN_SPEED = 0;
const MAX_SPEED = 10;
const DEFL_SPEED = 5;
const SECS_FOR_RESUME = 3;
const MIN_DISTANCE = 5;

//IMAGE CONSTANTS
const N_IMAGES = 5;
const DOG_IMAGE_NAME = "http://i61.tinypic.com/e147n.png";
const CRAB_IMAGE_NAME = "http://i59.tinypic.com/33xe9fn.png";
const BLOCK_IMAGE_NAME = "http://gamedesign.wdfiles.com/local--files/spri" +
						"teart%3Asprite-art-101-brick-wall-iii/brick_wall.png";
const BOWL_IMAGE_NAME = "http://i60.tinypic.com/j6379c.png";
const EMPTY_IMAGE_NAME = "http://ctp.di.fct.unl.pt/~amd/misc/empty.jpg";

//EXCEPTIONS CONSTANTS
const GAMEOVER_CODE = "Game Over";
const WIN_CODE = "Win";

//ID'S CONSTANTS
const HIGHSCORENAME_CODE = "highScoreName";
const STUCK_CODE = "stuckLabel";
const HIGHSCORE_CODE = "highScore";
const HIGHSCORELABEL_CODE = "highScoreLabel";
const TIME_LABEL = "timeLabel";
const PAUSEBUTTON_LABEL = "PauseButton";
const WINNER_SCORE = 500;

//LABELS CONSTANTS
const GAMEOVER_LABEL = "GameOver. Infelizmente foste apanhado." +
		" Mas nao te preocupes podes tentar outra vez! Basta clicares OK. ";
const WIN_LABEL = "Bom trabalho! Venceste os terroristas, e a vitoria na " +
		"guerra pode estar mais próxima!" +
		" Como recompensa tens a oportunidade de entrar no nosso highscore! " +
		"Qual é o teu nome? ";

const DEFAULT_NAME = "O teu nome";
const HIGHSCORE_LABEL = "High Score: ";
const PAUSE_LABEL = "Pause";
const UNPAUSE_LABEL = "Unpause";
const ENEMIESSTUCK_LABEL = "Inimigos Presos:";


//GLOBAL VARIABLES
var ctx, loaded, time, empty, world, dog, crabs, intervalID, bowls, 
							dijkstraMatrix, matrixQueue, crabsStuck = 0, paused;


// ACTORS

var PreActor = {
	image: null,
	isCharacter: function(){
		return false;	
	},
	
	isObject: function(){
		return false;
	},
	canMove: function(dx, dy){
		return true;	
	},
};

var Actor = extend(PreActor, {
	x: 0, y: 0,
	init: function(x, y) {
		this.x = x;
		this.y = y;
		this.show();
	},
	show: function() {
		world[this.x][this.y] = this;
		ctx.drawImage(this.image, this.x * ACTOR_PIXELS, 
												this.y * ACTOR_PIXELS);
	},
	hide: function() {
		world[this.x][this.y] = empty;
		ctx.drawImage(empty.image, this.x * ACTOR_PIXELS, 
												this.y * ACTOR_PIXELS);
	},
	
	move: function(dx, dy) {
		var next = world[this.x+dx][this.y+dy];
		if(next.isObject() && next.canMove(dx, dy)){
			next.move(dx, dy);			
			this.step(dx, dy);
		} else if(!next.isObject()){			
			this.step(dx, dy);
			
		}
	},
	
	step: function(dx, dy){
		this.hide();
		this.x += dx;
		this.y += dy;
		this.show();
	},
	
	canMove: function(dx, dy){
		return world[this.x+dx][this.y+dy].canMove(dx, dy);	
	},
});

var Empty = extend(PreActor, {
});

var Dog = extend(Actor, {
	isCharacter: function(){
		return true;
	},
	
	move: function(dx, dy) {
		var next = world[this.x+dx][this.y+dy];
		if(next.isObject() && next.canMove(dx, dy)){
			next.move(dx, dy);			
			this.step(dx, dy);
		} else if(!next.isObject()){			
			this.step(dx, dy);
		}
		resetMatrix(this.x, this.y)
		fillDijkstraMatrix(this.x, this.y, 0);
	},
});

var Crab = extend(Actor, {
	stuck: false,
	animation: function(xt, yt) {
		var choice = shortestStep(this.x, this.y);
		if(choice != -1){
			if(this.stuck == true){
				this.stuck = false;
				crabsStuck--;
				updateCrabsStuck();
			}
			this.hide();
			this.x = choice[0]; 
			this.y = choice[1];
			this.show();
		} else {
			if(this.stuck != true){
				this.stuck = true;
				crabsStuck++;
				updateCrabsStuck();
			};
		};
		if(this.x == xt && this.y == yt){
			throw GAMEOVER_CODE;
		} else if(crabsStuck == N_CRABS){
			throw WIN_CODE;
		}
	},
	
	isCharacter: function(){
		return true;
	},
	
	isObject: function(){
		return true;
	},
	
	canMove: function(dx, dy){
		return false;	
	},
});

var Block = extend(Actor, {
	isObject: function(){
		return true;
	},
	
	canMove: function(dx, dy){
		return false;	
	},
});

var Bowl = extend(Actor, {
	isObject: function(){
		return true;
	},
});

//DIJKSTRA ALGORITHM

function createMatrix() { //creates the matrix for dijkstra's algorithm
	matrixQueue = [];
	var w = new Array(WORLD_WIDTH);
	for( var x = 0 ; x < WORLD_WIDTH ; x++ ) {
		var a = new Array(WORLD_HEIGHT);
		for( var y = 0 ; y < WORLD_HEIGHT ; y++ )
			a[y] = Number.MAX_VALUE;
		w[x] = a;
	}
	return w;
}

//fills the matrix with the number of cells you have to step on
//to get on the target cell (coordinates x,y)
function fillDijkstraMatrix(x, y){ 
	var level = 0;
	matrixQueue.push([x,y]);
	var cell, cellsLeft = [];
	cellsLeft[level] = 0;
	while(matrixQueue.length != 0){
		cell = matrixQueue.shift();
		var posNeighbours = neighbours(cell[0], cell[1]);
		cellsLeft[level] += posNeighbours.length;
		if(cellsLeft[level] > 0){
			cellsLeft[level+1] = 0;
			for(n in posNeighbours){
				if(dijkstraMatrix[posNeighbours[n][0]][posNeighbours[n][1]] 
														== Number.MAX_VALUE){
					dijkstraMatrix[posNeighbours[n][0]][posNeighbours[n][1]] 
																	= level+1;
					matrixQueue.push([posNeighbours[n][0],posNeighbours[n][1]]);
				}
				cellsLeft[level]--;
			}
		}
		if(cellsLeft[level] == 0){
			level++;
		}
	}
}

//gives the next step something on coordinates (x,y) as to take
function shortestStep(x, y){
	var possibilities = neighbours(x, y);
	if(possibilities.length == 0){
		return -1;
	}
	var choice = possibilities[0];
	for(i in possibilities){
		if(dijkstraMatrix[possibilities[i][0]][possibilities[i][1]] 
									< dijkstraMatrix[choice[0]][choice[1]] ||
				distance([possibilities[i][0]], [possibilities[i][1]], x, y) 
									< distance([choice[0]], [choice[1]], x, y)){
			choice = possibilities[i];
		}; 
	};
	if(dijkstraMatrix[choice[0]][choice[1]] == Number.MAX_VALUE){
		return [x,y];
	}
	return choice;
}


function resetMatrix(x1, y1){ //resets the matrix for dijkstra's algorithm
	for( var x = 0 ; x < WORLD_WIDTH ; x++ ) {
		for( var y = 0 ; y < WORLD_HEIGHT ; y++ )
			dijkstraMatrix[x][y] = Number.MAX_VALUE;
	}
	dijkstraMatrix[x1][y1] = 0;
}

// EVENT HANDLING

function animationEvent() {
	if(paused == false){
		time++;
		try{
			updateTimeLabel(Math.floor(time/60), time%60);
			for(i in crabs){
				crabs[i].animation(dog.x, dog.y);
			};
		} catch (err){
			if(err == GAMEOVER_CODE){
				gameOver();
			} else if (err == WIN_CODE){
				winner();
			};
		};
	};
}

function setSpeed(speed) {
	if( (speed < MIN_SPEED) || (MAX_SPEED < speed) )
		speed = MIN_SPEED;
	intervalID = window.setInterval(animationEvent,(MAX_SPEED+1)*100-speed*100);
}

function keyEvent(k) {
	// http://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
	if(paused == false){
		var code = k.keyCode;
		switch(code) {
			case 37: case 79: case 74: dog.move(-1, 0); break; //  LEFT, O, J
			case 38: case 81: case 73: dog.move(0, -1); break; //    UP, Q, I
			case 39: case 80: case 76: dog.move(1, 0);  break; // RIGHT, P, L
			case 40: case 65: case 75: dog.move(0, 1);  break; //  DOWN, A, K
	//		default: dog.key(code); break;
		};
	};
}

function setEvents() {
	window.clearInterval(intervalID);
	setSpeed(DEFL_SPEED);
	addEventListener("keydown", keyEvent, false);
}

//resets the world
function resetGame(){
	for(i in bowls){
		bowls[i].hide();
		bowls[i] = null;
	}
	for(i in crabs){
		crabs[i].hide();
		crabs[i] = null;
	}
	dog.hide();
	crabsStuck = 0;
	time = 0;
	createWorld();
}

function restart(){
	if(paused){
		pauseButton();
	}
	resetGame();
}

function gameOver(){
	mesg(GAMEOVER_LABEL);		
	resetGame();
}

function winner(){
	var score = time+WINNER_SCORE;
	var name = prompt(WIN_LABEL+score, DEFAULT_NAME);
	if(name != null){
		updateHighScore(name, score);
	}
	resetGame();
}

function updateHighScore(name, score){
	var highScore = getHighScore();
	if(highScore < score){
		window.localStorage.setItem(HIGHSCORE_CODE, score);
		window.localStorage.setItem(HIGHSCORENAME_CODE, name);
		document.getElementById(HIGHSCORELABEL_CODE).innerHTML=HIGHSCORE_LABEL
							+window.localStorage.getItem(HIGHSCORENAME_CODE)
							+" - "+window.localStorage.getItem(HIGHSCORE_CODE);
		document.getElementById(HIGHSCORELABEL_CODE).style.visibility = "visible";
	};
}

function getHighScore(){
	if(window.localStorage.getItem(HIGHSCORE_CODE)){
		return window.localStorage.getItem(HIGHSCORE_CODE);
	}
		return 0;
}


// INITIALIZATIONS

function createEmptyWorld() {
	var w = new Array(WORLD_WIDTH);
	for( var x = 0 ; x < WORLD_WIDTH ; x++ ) {
		var a = new Array(WORLD_HEIGHT);
		for( var y = 0 ; y < WORLD_HEIGHT ; y++ )
			a[y] = empty;
		w[x] = a;
	}
	return w;
}

function createBlocks() {
	for(var i = 0; i<WORLD_WIDTH; i++){
		create(Block, i, 0);
		create(Block, i, WORLD_HEIGHT - 1);
		dijkstraMatrix[i][0] = Number.MAX_VALUE;
		dijkstraMatrix[i][WORLD_HEIGHT - 1] = Number.MAX_VALUE;
	}
	for(var i = 0; i<WORLD_HEIGHT; i++){
		create(Block, 0, i);
		create(Block, WORLD_WIDTH - 1, i);
		dijkstraMatrix[0][i] = Number.MAX_VALUE;
		dijkstraMatrix[WORLD_WIDTH - 1][i] = Number.MAX_VALUE;
	};
}

function createDog() {
	var x = 0, y = 0;
	while(true){	
		x = rand(WORLD_WIDTH);
		y = rand(WORLD_HEIGHT);
		if(world[x][y].isObject() || world[x][y].isCharacter()){
			continue;	
		}
		dog = create(Dog, x, y);
		dijkstraMatrix[x][y] = 0;
		break;
	};
}

function createCrabs() {
	crabs = [];
	var x = 0, y = 0;
	for(var i = 0; i<N_CRABS; i++){
		x = rand(WORLD_WIDTH);
		y = rand(WORLD_HEIGHT);
		if(world[x][y].isObject() || world[x][y].isCharacter() || distance(x, y, dog.x, dog.y)<5){
			i--;
			continue;
		}
		crabs[i] = create(Crab, x, y);
		dijkstraMatrix[x][y] = Number.MAX_VALUE;
		console.log("Created Crab number "+i+" on X:"+x+" and Y:"+y);
	};
}

function createBowls() {
	bowls = [];
	var x = 0, y = 0;
	for(var i = 0; i<N_BOWLS; i++){
		x = rand(WORLD_WIDTH);
		y = rand(WORLD_HEIGHT);
		if(world[x][y].isObject() || world[x][y].isCharacter()){
			i--;
			continue;
		}
		bowls[i] = create(Bowl, x, y);
		dijkstraMatrix[x][y] = Number.MAX_VALUE;
		console.log("Created bowls number "+i+" on X:"+x+" and Y:"+y);
	};
}

function createWorld() {
	world = createEmptyWorld();
	dijkstraMatrix = createMatrix();
	createBlocks();
	createDog();
	createCrabs();
	createBowls();
	paused = false;
	fillDijkstraMatrix(dog.x, dog.y);
}


function loadImage(name) {
	var image = new Image();
	image.src = name;
	image.onload = function() {
		loaded++;
		if( loaded == N_IMAGES ) { // wait for images loaded
			createWorld();
			setEvents();
		}
	};
	return image;
}

function loadImages() {
	loaded = 0;
	Dog.image = loadImage(DOG_IMAGE_NAME);
	Crab.image = loadImage(CRAB_IMAGE_NAME);
	Block.image = loadImage(BLOCK_IMAGE_NAME);
	Bowl.image = loadImage(BOWL_IMAGE_NAME);
	Empty.image = loadImage(EMPTY_IMAGE_NAME);
}

function initializeAll() {
	ctx = document.getElementById("canvas1").getContext("2d");
	empty = create(Empty);	// only one empty actor needed
	time = 0;
	loadImages();
}

// HTML and FORM

function onLoad() {
	var highScore = window.localStorage.getItem(HIGHSCORE_CODE);
	var highScoreLabel = document.getElementById(HIGHSCORELABEL_CODE);
	if(highScore > 0){
		highScoreLabel.innerHTML += window.localStorage.getItem(HIGHSCORENAME_CODE)+" - "+highScore;
	} else {
		highScoreLabel.style.visibility = "hidden";
	};
}

function restartButton() { 
	if(confirm("Are you sure you want to restart? All progress is going to be lost.")){
		restart();
	}
}

function startButton() { 
	document.getElementById("start").style.display = "none";
	document.getElementById("game").style.display = "inline";
	initializeAll();
}

function formatTime(time) {
	if(time < 10){
		return '0'+time;
	}
	return time;
}

function pauseButton(){
	var canvas = document.getElementById("canvas1");
	var button = document.getElementById(PAUSE_LABEL);
	var counter = SECS_FOR_RESUME;
	if(paused == true){
		var id = setInterval(function(){
			button.value = counter;
			counter--;
			if(counter < 0){	
				paused = false;
				button.value = PAUSE_LABEL;
				animationEvent();
				clearInterval(id);
			}
		}, 1000);
		canvas.style.display = "inline";
	} else {
		canvas.style.display = "none";
		button.value = UNPAUSE_LABEL;
		paused = true;
	};
};


function updateTimeLabel(min, secs){
	document.getElementById(TIME_LABEL).innerHTML = formatTime(min)+"M:"
	+formatTime(secs)+"S"; 
};

function updateCrabsStuck(){
	document.getElementById(STUCK_CODE).innerHTML = ENEMIESSTUCK_LABEL
															+crabsStuck;
}