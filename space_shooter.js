
/**
 * Initialize the Game and starts it.
 */
 let game = new Game();

 function init() {
     game.init();    
 }

/**
 * Define a singleton object which will hold all the images and will create them once
 */
 let imageHolder = new function() {
	// Define images
	this.background = new Image();
    this.spaceship = new Image();
    this.projectile = new Image();
    this.enemy = new Image();
    this.enemyProjectile = new Image();

    // Make sure all images are loaded before the start of the game
    let numImages = 5;
    let numLoaded = 0;

    function imageLoaded() {
        numLoaded++;
        if (numLoaded === numImages) {
            window.init();
        }
    }

    this.background.onload = function() {
        imageLoaded();
    }
    this.spaceship.onload = function() {
        imageLoaded();
    }
    this.projectile.onload = function() {
        imageLoaded();
    }
    this.enemy.onload = function() {
        imageLoaded();
    }
    this.enemyProjectile.onload = function() {
        imageLoaded();
    }

	// Set images src
	this.background.src = "resources/bg.png";
    this.spaceship.src = "resources/ship.png";
    this.projectile.src = "resources/bullet.png";
    this.enemy.src = "resources/enemy.png";
    this.enemyProjectile.src = "resources/bullet_enemy.png";
}


/**
 * Creates the Drawable object which will be the base class for
 * all drawable objects in the game. Sets up default letiables
 * that all child objects will inherit, as well as the default
 * functions.
 */
 function Drawable() {
	this.init = function(x, y, width, height) {
		// Default letiables
		this.x = x;
		this.y = y;
        this.width = width;
        this.height = height;
	}
	this.speed = 0;
	this.canvasWidth = 0;
	this.canvasHeight = 0;
    this.canCollide = "";
    this.isColliding = false;
    this.type = "";

	// Define abstract function to be implemented in child objects
	this.draw = function() {
	};
    this.move = function() {
    };
    this.canCollideWith = function(object) {
        return (this.canCollide === object.type);
    };
}


/**
 * Creates the Background object which will become a child of
 * the Drawable object. The background is drawn on the "background"
 * canvas and creates the illusion of moving by panning the image.
 */
 function Background() {
	this.speed = 1.5; // Redefine speed of the background for panning

	// Implement abstract function
	this.draw = function() {

		// Pan background
		this.y += this.speed;

		this.context.drawImage(imageHolder.background, this.x, this.y);

		// Draw another image at the top edge of the first image
		this.context.drawImage(imageHolder.background, this.x, this.y - this.canvasHeight);

		// If the image scrolled off the screen, reset
		if (this.y >= this.canvasHeight)
			this.y = 0;
	};
}
// Set Background to inherit properties from Drawable
Background.prototype = new Drawable();



/**
 * Creates the Projectile object which the ship fires. The projectiles are
 * drawn on the "main" canvas.
 */
function Projectile(object) {
    this.alive = false; // Is set to true if the projectile is currently in use
    let self = object;

    // Sets the projectile properties
    this.spawn = function(x, y, speed) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.alive = true;
    };
    /*
	 * Uses a "drity rectangle" to erase the bullet and moves it.
     * This technique clears only the area around the projectile, thus eliminating the need to redraw the whole canvas which is resource expensive
	 * Returns true if the bullet moved off the screen, indicating that
	 * the bullet is ready to be cleared by the pool, otherwise draws
	 * the bullet.
	 */
    this.draw = function() {
        this.context.clearRect(this.x-1, this.y-1, this.width+2, this.height+2);
        this.y -= this.speed;

        if (this.isColliding) {
            return true;
        }
        else if (self === "projectile" && this.y <= 0 - this.height) {
            return true;
        } 
        else if (self === "enemyProjectile" && this.y >= this.canvasHeight) {
            return true;
        }
        else {
            if (self === "projectile") {
                this.context.drawImage(imageHolder.projectile, this.x, this.y);
            }
            else if (self === "enemyProjectile") {
                this.context.drawImage(imageHolder.enemyProjectile, this.x, this.y);
            }
            return false;
        }
    };

    // Reset the projectile properties
    this.clear = function() {
        this.x = 0;
        this.y = 0;
        this.speed = 0;
        this.alive = false;
        this.isColliding = false;
    };
}
Projectile.prototype = new Drawable();


/**
 * QuadTree object.
 *
 * The quadrant indexes are numbered as below:
 *     |
 *  1  |  0
 * —-+—-
 *  2  |  3
 *     |
 */
function QuadTree(boundBox, lvl) {
    let maxObjects = 10;
    this.bounds = boundBox || {
        x: 0,
        y: 0,
        width: 0,
        height: 0
    };

    let objects = [];
    this.nodes = [];
    let level = lvl || 0;
    let maxLevels = 5;

    // Clears the quadTree and all nodes of objects
    this.clear = function() {
        objects = [];
        for(let i = 0; i < this.nodes.length;i++) {
            this.nodes[i].clear();
        }
        this.nodes = [];
    };

    // Get all the object in the tree
    this.getAllObjects = function(returnedObjects) {
        for(let i = 0; i < this.nodes.length; i++) {
            this.nodes[i].getAllObjects(returnedObjects);
        }

        for (let i = 0, len = objects.length; i < len;i++) {
            returnedObjects.push(objects[i]);
        }
        return returnedObjects;
    };


    /*
	 * Return all objects that the object could collide with
	 */
	this.findObjects = function(returnedObjects, obj) {
		if (typeof obj === "undefined") {
			console.log("UNDEFINED OBJECT");
			return;
		}

		let index = this.getIndex(obj);
		if (index != -1 && this.nodes.length) {
			this.nodes[index].findObjects(returnedObjects, obj);
		}
		for (let i = 0, len = objects.length; i < len; i++) {
			returnedObjects.push(objects[i]);
		}
		return returnedObjects;
	};

    /*
    * Insert the object into the quadTree. If the tree
	 * excedes the capacity, it will split and add all
	 * objects to their corresponding nodes.
	 */
	this.insert = function(obj) {
		if (typeof obj === "undefined") {
			return;
		}

		if (obj instanceof Array) {
			for (let i = 0, len = obj.length; i < len; i++) {
				this.insert(obj[i]);
			}
			return;
		}

		if (this.nodes.length) {
			let index = this.getIndex(obj);
			// Only add the object to a subnode if it can fit completely
			// within one
			if (index != -1) {
				this.nodes[index].insert(obj);
				return;
			}
		}

		objects.push(obj);

		// Prevent infinite splitting
		if (objects.length > maxObjects && level < maxLevels) {
			if (this.nodes[0] == null) {
				this.split();
			}

			let i = 0;
			while (i < objects.length) {

				let index = this.getIndex(objects[i]);
				if (index != -1) {
					this.nodes[index].insert((objects.splice(i,1))[0]);
				}
				else {
					i++;
				}
			}
		}
	};
	/*
	 * Determine which node the object belongs to. -1 means
	 * object cannot completely fit within a node and is part
	 * of the current node
	 */
	this.getIndex = function(obj) {
		let index = -1;
		let verticalMidpoint = this.bounds.x + this.bounds.width / 2;
		let horizontalMidpoint = this.bounds.y + this.bounds.height / 2;

		// Object can fit completely within the top quadrant
		let topQuadrant = (obj.y < horizontalMidpoint && obj.y + obj.height < horizontalMidpoint);

		// Object can fit completely within the bottom quandrant
		let bottomQuadrant = (obj.y > horizontalMidpoint);

		// Object can fit completely within the left quadrants
		if (obj.x < verticalMidpoint &&
				obj.x + obj.width < verticalMidpoint) {
			if (topQuadrant) {
				index = 1;
			}
			else if (bottomQuadrant) {
				index = 2;
			}
		}

		// Object can fix completely within the right quandrants
		else if (obj.x > verticalMidpoint) {
			if (topQuadrant) {
				index = 0;
			}
			else if (bottomQuadrant) {
				index = 3;
			}
		}
		return index;
	};
    
	/*
	 * Splits the node into 4 subnodes
	 */
	this.split = function() {
		// Bitwise or [html5rocks]
		let subWidth = (this.bounds.width / 2) | 0;
		let subHeight = (this.bounds.height / 2) | 0;
		this.nodes[0] = new QuadTree({
			x: this.bounds.x + subWidth,
			y: this.bounds.y,
			width: subWidth,
			height: subHeight
		}, level+1);
		this.nodes[1] = new QuadTree({
			x: this.bounds.x,
			y: this.bounds.y,
			width: subWidth,
			height: subHeight
		}, level+1);
		this.nodes[2] = new QuadTree({
			x: this.bounds.x,
			y: this.bounds.y + subHeight,
			width: subWidth,
			height: subHeight
		}, level+1);
		this.nodes[3] = new QuadTree({
			x: this.bounds.x + subWidth,
			y: this.bounds.y + subHeight,
			width: subWidth,
			height: subHeight
		}, level+1);
	};
}


/**
 * Custom Pool object. Holds Projectile objects to be managed to prevent
 * garbage collection. Projectiles in the back of the array are free and in the front are in use
 */
function Pool(mSize) {
    let size = mSize; // Max num of projectiles allowed in the pool
    let pool = [];

    // Returns all alive objects in the pool to be added in the quadTree
    this.getPool = function() {
        let obj = [];
        for(let i = 0; i < size; i++) {
            if(pool[i].alive) {
                obj.push(pool[i]);
            }
        }
        return obj;
    }

    // Populate the pool array with Projectile objects
    this.init = function(object) {
        if (object == "projectile") {
            for(let i = 0; i < size; i++) {
                // Initialize the object
                let projectile = new Projectile("projectile");
                projectile.init(0, 0, imageHolder.projectile.width, imageHolder.projectile.height);
                projectile.canCollide = "enemy";
                projectile.type = "projectile";
                pool[i] = projectile;
            }
        }
        else if (object == "enemy") {
            for(let i = 0; i < size; i++) {
                let enemy = new Enemy();
                enemy.init(0, 0, imageHolder.enemy.width, imageHolder.enemy.height);
                pool[i] = enemy;
            }
        }
        else if (object == "enemyProjectile") {
            for(let i = 0; i < size; i++) {
                let projectile = new Projectile("enemyProjectile");
                projectile.init(0, 0, imageHolder.enemyProjectile.width, imageHolder.projectile.height);
                projectile.canCollide = "ship";
                projectile.type = "enemyProjectile";
                pool[i] = projectile;
            }
        }
    };


    /*
	 * Grabs the last item in the list and initializes it and
	 * pushes it to the front of the array.
	 */
    this.get = function(x, y, speed) {
        if(!pool[size - 1].alive) {
            pool[size - 1].spawn(x, y, speed);
            pool.unshift(pool.pop());
        }
    };
    /*
	 * Used for the ship to be able to get two projectiles at once. If
	 * only the get() function is used twice, the ship is able to
	 * fire and only have 1 projectile spawn instead of 2.
	 */
    this.getTwo = function(x1, y1, speed1, x2, y2, speed2) {
        if(!pool[size - 1].alive && !pool[size - 2].alive) {
            this.get(x1, y1, speed1);
            this.get(x2, y2, speed2);
        }
    };
    /*
	 * Draws any in use Projectiles. If a projectile goes off the screen,
	 * clears it and pushes it to the front of the array.
	 */
    this.animate = function() {
        for(let i = 0; i < size; i++) {
            // Draws the projectiles until it finds a projectile that is not alive
            if(pool[i].alive) {
                if (pool[i].draw()) {
                        pool[i].clear();
                        pool.push((pool.splice(i, 1))[0]);
                }
            }
            else {
                break;
            }
        }
    };
}


/**
 * Create the Ship object that the player controls. The ship is
 * drawn on the "ship" canvas and uses dirty rectangles to move
 * around the screen.
 */
function Ship() {
    this.speed = 3; // ship speed is set to 3px per frame
    this.projectilePool = new Pool(30);
    let fireRate = 12;
    let counter = 0;
    this.canCollide = "enemyProjectile"; // the ship object can collide with the enemy projectiles
    this.type = "ship";

    this.init = function(x, y, width, height) {
		// Defualt letiables
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.alive = true;
		this.isColliding = false;
		this.projectilePool.init("projectile");
	}

    this.draw = function() {
        this.context.drawImage(imageHolder.spaceship, this.x, this.y);
    };

    this.move = function() {
        counter++;
        // Determine if the action is a move action
        if (KEY_STATUS.left || KEY_STATUS.right || KEY_STATUS.down ||
                                        KEY_STATUS.up) {
            // The ship moved, so erase it's current image so it can
			// be redrawn in it's new location
			this.context.clearRect(this.x, this.y, this.width, this.height);

			// Update x and y according to the direction to move and
			// redraw the ship. Change the else if's to if statements
			// to have diagonal movement.
			if (KEY_STATUS.left) {
				this.x -= this.speed
				if (this.x <= 0) // Keep player within the screen
					this.x = 0;
			} else if (KEY_STATUS.right) {
				this.x += this.speed
				if (this.x >= this.canvasWidth - this.width)
					this.x = this.canvasWidth - this.width;
			} else if (KEY_STATUS.up) {
				this.y -= this.speed
				if (this.y <= this.canvasHeight/4*3)
					this.y = this.canvasHeight/4*3;
			} else if (KEY_STATUS.down) {
				this.y += this.speed
				if (this.y >= this.canvasHeight - this.height)
					this.y = this.canvasHeight - this.height;
			}
        }

			// Finish by redrawing the ship if its now colliding with anything
            if(!this.isColliding){
                    this.draw();
            }
            else {
                this.alive = false;
                game.gameOver();
            }
        
		if (KEY_STATUS.space && counter >= fireRate && !this.isColliding) {
			this.fire();
			counter = 0;
		}
    };

    /*
	 * Fires two bullets
	 */
	this.fire = function() {
		this.projectilePool.getTwo(this.x+6, this.y, 3,
		                       this.x+33, this.y, 3);

        game.laser.get();
	};
}
Ship.prototype = new Drawable();


/**
 * Create the Enemy ship object
 */
function Enemy() {
    let percentFire = .01;  // Chance to fire every movement
    let chance = 0;
    this.alive = false;
    this.canCollide = "projectile";
    this.type = "enemy";

    this.spawn = function(x, y, speed) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.speedX = 0;
        this.speedY = speed;
        this.alive = true;
        this.leftEdge = this.x - 90;
        this.rightEdge = this.x + 90;
        this.bottomEdge = this.y + 140;
    };

    this.draw = function() {
        this.context.clearRect(this.x-1, this.y, this.width+1, this.height);
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x <= this.leftEdge) {
            this.speedX = this.speed;
        }
        else if (this.x >= this.rightEdge + this.width) {
            this.speedX = -this.speed;
        }
        else if (this.y >= this.bottomEdge) {
            this.speed = 1.5;
            this.speedY = 0;
            this.y -= 5;
            this.speedX = -this.speed;
        }

        // If the enemy is not colliding with the players projectiles draw it
        if (!this.isColliding) {
            this.context.drawImage(imageHolder.enemy, this.x, this.y);

            //The enemy has a chance to shoot every movement
            chance = Math.floor(Math.random() * 101);
            if (chance/100 < percentFire) {
                this.fire();
            }
            return false;
        }
        else {
            game.playerScore += 100;
            game.explosion.get();
            return true;
        }
    };

    // Fires the projectiles
    this.fire = function() {
        game.enemyProjectilePool.get(this.x+this.width/2, this.y+this.height, -2.5);
    };


    this.clear = function() {
        this.x = 0;
        this.y = 0;
        this.speed = 0;
        this.speedX = 0;
        this.speedY = 0;
        this.alive = false;
        this.isColliding = false;
    };
}
Enemy.prototype = new Drawable();


/**
 * The Game object will hold all objects and data for the game.
 */

 function Game() {
	/*
	 * Gets canvas information and context and sets up all game
	 * objects.
	 * Returns true if the canvas is supported and false if it
	 * is not. This is to stop the animation script from constantly
	 * running on older browsers.
	 */
	this.init = function() {
		// Get the canvas element
		this.bgCanvas = document.getElementById('background');
        this.shipCanvas = document.getElementById('playerShip');
        this.mainCanvas = document.getElementById('main');


    // Test to see if canvas is supported. Only need to
	// check one canvas
    if(this.bgCanvas.getContext) {
		this.bgContext = this.bgCanvas.getContext('2d');
        this.shipContext = this.shipCanvas.getContext('2d');
        this.mainContext = this.mainCanvas.getContext('2d');

		// Initialize objects to contain their context and canvas
		// information
		Background.prototype.context = this.bgContext;
		Background.prototype.canvasWidth = this.bgCanvas.width;
		Background.prototype.canvasHeight = this.bgCanvas.height;

        Ship.prototype.context = this.shipContext;
        Ship.prototype.canvasWidth = this.shipCanvas.width;
        Ship.prototype.canvasHeight = this.shipCanvas.height;

        Projectile.prototype.context = this.mainContext;
        Projectile.prototype.canvasWidth = this.mainCanvas.width;
        Projectile.prototype.canvasHeight = this.mainCanvas.height;

        Enemy.prototype.context = this.mainContext;
        Enemy.prototype.canvasWidth = this.mainCanvas.width;
        Enemy.prototype.canvasHeight = this.mainCanvas.height;

		// Initialize the background object
		this.background = new Background();
		this.background.init(0,0); // Set draw point to 0,0

        // Initialize the ship object
        this.ship = new Ship();

        // Set the ship to start near the bottom middle of the canvas
		this.shipStartX = this.shipCanvas.width/2 - imageHolder.spaceship.width;
		this.shipStartY = this.shipCanvas.height/4*3 + imageHolder.spaceship.height*2;
		this.ship.init(this.shipStartX, this.shipStartY, imageHolder.spaceship.width,
			               imageHolder.spaceship.height);

        // Initialize the enemy pool object
        this.enemyPool = new Pool(30);
        this.enemyPool.init("enemy");
        this.spawnEnemyWaves();
        
        this.enemyProjectilePool = new Pool(50);
        this.enemyProjectilePool.init("enemyProjectile");

        // Start QuadTree
        this.quadTree = new QuadTree({x:0,y:0,width:this.mainCanvas.width,height:this.mainCanvas.height});

        this.playerScore = 0;

        // Audio files
			this.laser = new SoundPool(10);
			this.laser.init("laser");

			this.explosion = new SoundPool(20);
			this.explosion.init("explosion");

			this.backgroundAudio = new Audio("sounds/kick_shock.wav");
			this.backgroundAudio.loop = true;
			this.backgroundAudio.volume = .25;
			this.backgroundAudio.load();

			this.gameOverAudio = new Audio("sounds/game_over.wav");
			this.gameOverAudio.loop = true;
			this.gameOverAudio.volume = .25;
			this.gameOverAudio.load();

			this.checkAudio = window.setInterval(function(){checkReadyState()},1000);   
    }
};

    // Spawn a new wave of enemies
    this.spawnEnemyWaves = function() {

        let height = imageHolder.enemy.height;
        let width = imageHolder.enemy.width;
        let x = 100;
        let y = -height;  // This makes sure the ships are spwaned just above the screen
        let spacer = y * 1.5; // Determines the space between the rows of ships

        for(let i = 1; i <= 18; i++) {
            this.enemyPool.get(x, y, 2);
            x += width + 25; // Space between each ship in a row in px
            if (i % 6 == 0) { 
                x = 100;
                y += spacer;
            }
        }
    }

    // Start the animation loop
	this.start = function() {
        this.ship.draw();
        this.backgroundAudio.play();
		animate();
	};



    // Restart the game
	this.restart = function() {

        this.gameOverAudio.pause();

		document.getElementById('game-over').style.display = "none";

		this.bgContext.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
		this.shipContext.clearRect(0, 0, this.shipCanvas.width, this.shipCanvas.height);
		this.mainContext.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);

		this.quadTree.clear();

		this.background.init(0,0);

		this.ship.init(this.shipStartX, this.shipStartY,
		               imageHolder.spaceship.width, imageHolder.spaceship.height);

		this.enemyPool.init("enemy");
		this.spawnEnemyWaves();
		this.enemyProjectilePool.init("enemyProjectile");

		this.playerScore = 0;

        this.backgroundAudio.currentTime = 0;
		this.backgroundAudio.play();

		this.start();
	};

    // Game over
	this.gameOver = function() {
        this.backgroundAudio.pause();
		this.gameOverAudio.currentTime = 0;
		this.gameOverAudio.play();
		document.getElementById('game-over').style.display = "block";
	};

 }


/**
 * Ensure the game sound has loaded before starting the game
 */
function checkReadyState() {
	if (game.gameOverAudio.readyState === 4 && game.backgroundAudio.readyState === 4) {
		window.clearInterval(game.checkAudio);
		document.getElementById('loading').style.display = "none";
		game.start();
	}
}


/**
 * A sound pool to use for the sound effects
 */
function SoundPool(maxSize) {
	let size = maxSize; // Max bullets allowed in the pool
	let pool = [];
	this.pool = pool;
	let currSound = 0;

    /*
	 * Populates the pool array with the given object
	 */
	this.init = function(object) {
		if (object == "laser") {
			for (let i = 0; i < size; i++) {
				// Initalize the object
				laser = new Audio("sounds/laser.wav");
				laser.volume = .12;
				laser.load();
				pool[i] = laser;
			}
		}
		else if (object == "explosion") {
			for (let i = 0; i < size; i++) {
				let explosion = new Audio("sounds/explosion.wav");
				explosion.volume = .1;
				explosion.load();
				pool[i] = explosion;
			}
		}
	};

    
    /*
	 * Plays a sound
	 */
	this.get = function() {
		if(pool[currSound].currentTime == 0 || pool[currSound].ended) {
			pool[currSound].play();
		}
		currSound = (currSound + 1) % size;
	};
}



/**
 * The animation loop. Calls the requestAnimationFrame shim to
 * optimize the game loop and draws all game objects. This
 * function must be a gobal function and cannot be within an
 * object.
 */
 function animate() {

    // Display the score
    document.getElementById('score').innerHTML = game.playerScore;

    // Insert the objects in the quadtree
    game.quadTree.clear();
    game.quadTree.insert(game.ship);
    game.quadTree.insert(game.ship.projectilePool.getPool());
    game.quadTree.insert(game.enemyPool.getPool());
    game.quadTree.insert(game.enemyProjectilePool.getPool());


    checkCollision();


    if (game.enemyPool.getPool().length === 0) {
        game.spawnEnemyWaves();
    }

    // Animate game objects
    if(game.ship.alive) {
        requestAnimFrame( animate );

	    game.background.draw();
        game.ship.move();
        game.ship.projectilePool.animate();
        game.enemyPool.animate();
        game.enemyProjectilePool.animate();
    }
}

// Function which checks for collisions
function checkCollision() {
    let obj = [];
    game.quadTree.getAllObjects(obj);

    for(let x = 0, len = obj.length; x < len; x++) {
        game.quadTree.findObjects(o = [], obj[x]);

        for(y = 0, length = o.length; y < length; y++) {
            
            // Detect collision logic
            if (obj[x].canCollide === o[y].type &&
				(obj[x].x < o[y].x + o[y].width &&
			     obj[x].x + obj[x].width > o[y].x &&
				 obj[x].y < o[y].y + o[y].height &&
				 obj[x].y + obj[x].height > o[y].y)) {
				obj[x].isColliding = true;
				o[y].isColliding = true;
			}
        }
    }
};



// Original code by Doug McInnes
KEY_CODES = {
    32: 'space',
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down',
  }
  // Creates the array to hold the KEY_CODES and sets all their values
  // to false. Checking true/flase is the quickest way to check status
  // of a key press and which one was pressed when determining
  // when to move and which direction.
  KEY_STATUS = {};
  for (code in KEY_CODES) {
    KEY_STATUS[ KEY_CODES[ code ]] = false;
  }
  /**
   * Sets up the document to listen to onkeydown events (fired when
   * any key on the keyboard is pressed down). When a key is pressed,
   * it sets the appropriate direction to true to let us know which
   * key it was.
   */
  document.onkeydown = function(e) {
    // Firefox and opera use charCode instead of keyCode to
    // return which key was pressed.
    let keyCode = (e.keyCode) ? e.keyCode : e.charCode;
    if (KEY_CODES[keyCode]) {
      e.preventDefault();
      KEY_STATUS[KEY_CODES[keyCode]] = true;
    }
  }
  /**
   * Sets up the document to listen to ownkeyup events (fired when
   * any key on the keyboard is released). When a key is released,
   * it sets teh appropriate direction to false to let us know which
   * key it was.
   */
  document.onkeyup = function(e) {
    let keyCode = (e.keyCode) ? e.keyCode : e.charCode;
    if (KEY_CODES[keyCode]) {
      e.preventDefault();
      KEY_STATUS[KEY_CODES[keyCode]] = false;
    }
  }



/**
 * Finds the first API that works to optimize the animation loop,
 * otherwise defaults to setTimeout().
 * set to run at 60FPS
 */
window.requestAnimFrame = (function(){
	return  window.requestAnimationFrame   ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame    ||
			window.oRequestAnimationFrame      ||
			window.msRequestAnimationFrame     ||
			function(/* function */ callback, /* DOMElement */ element){
				window.setTimeout(callback, 1000 / 60);
			};
})();
