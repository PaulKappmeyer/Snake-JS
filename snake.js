const NUM_COLS = 33;
const NUM_ROWS = 17;

let BODYSIZE;
const NUM_FOOD = 13;
let NUM_FOOD_MISSED = 0;

let canvas;
let snake;
let foods = [];

const container = "snake-container";
let conatinerDiv;

let running = true;
let darkMode = false;
let darkModeButton;
const DARK_MODE_BACKGROUND = "#282828";
const DARK_MODE_TEXT_FILL = "#FFFFFF";
const LIGHT_MODE_BACKGROUND = "#FFFFFF"; //"#DCDCDC";
const LIGHT_MODE_TEXT_FILL = "#000000";

let pg_blind;

function setup() {
    calcBODYSIZE();
    canvas = createCanvas(NUM_COLS * BODYSIZE, NUM_ROWS * BODYSIZE);
    canvas.parent(container);
    conatinerDiv = select("#" + container);

    pg_blind = createGraphics(width, height);

    snake = new Snake();

    darkModeButton = createButton("light mode");
    darkModeButton.mousePressed(toggleDarkMode);
    darkModeButton.parent(container);
    darkModeButton.position(width + 5, 0);
    toggleDarkMode();

    for (let i = 0; i < NUM_FOOD; i++) {
        foods[i] = new Food();
        foods[i].init();
    }
}

function toggleDarkMode() {
    darkMode = !darkMode;
    if (darkMode == true) {
        darkModeButton.elt.innerHTML = "light mode";
        conatinerDiv.style('background-color', DARK_MODE_BACKGROUND);
    } else {
        darkModeButton.elt.innerHTML = "dark mode";
        conatinerDiv.style('background-color', LIGHT_MODE_BACKGROUND);
    }
}

function windowResized() {
    let OLD_BODYSIZE = BODYSIZE;
    // calc new size
    calcBODYSIZE()
    resizeCanvas(NUM_COLS * BODYSIZE, NUM_ROWS * BODYSIZE);

    // pass old size
    for (const food of foods) {
        food.onWindowResized()
    }
    snake.onWindowResized(OLD_BODYSIZE);

    darkModeButton.position(width + 5, 0);

    pg_blind = createGraphics(width, height);
}

function calcBODYSIZE() {
    BODYSIZE = Math.floor(Math.min((windowWidth - 100) / NUM_COLS, (windowHeight - 100) / NUM_ROWS));
}

function draw() {
    if (!focused) {
        running = false;
    }

    if (running) {
        // update: snake movement and animations
        snake.update();

        // update: food respawning and animations
        for (const food of foods) {
            food.update();
        }
    }

    // draw: background
    if (darkMode) {
        background(DARK_MODE_BACKGROUND);
    } else {
        background(LIGHT_MODE_BACKGROUND);
    }


    // draw: food
    for (const food of foods) {
        food.show();
    }

    // draw: snake
    snake.show();

    // draw: snake blinded overlay
    if (snake.blinded == true) {
        pg_blind.background(0, 0, 0, 255 * Math.pow((1 - snake.blindTime / SNAKE_BLIND_TIME), 0.075));
        pg_blind.erase();
        pg_blind.noStroke();
        pg_blind.circle(snake.head.smoothPosition.x + BODYSIZE / 2, snake.head.smoothPosition.y + BODYSIZE / 2, min(width / 2, height / 2));
        pg_blind.noErase();

        image(pg_blind, 0, 0);
        pg_blind.clear();
    }

    // draw: text
    noStroke()
    if (darkMode) {
        fill(DARK_MODE_TEXT_FILL);
    } else {
        if (snake.blinded) {
            fill(DARK_MODE_TEXT_FILL);
        } else {
            fill(LIGHT_MODE_TEXT_FILL);
        }
    }
    textSize(12);
    textAlign(LEFT, CENTER);
    text("Length: " + snake.body.length, 5, 10);
    text("Highscore: " + snake.highscore, 5, 25);
    text("Speed: ", 5, 40);
    text("Boost: ", 5, 55);
    text("Food missed: " + NUM_FOOD_MISSED, 5, 70);

    // debugging 
    // text("fps: " + Math.round(frameRate()), width - 75, 10);
    // text("deltatime: " + Math.round(deltaTime), width - 75, 25);

    // draw: speed HUD
    stroke(0);
    noFill()
    rectMode(CORNER)
    rect(50, 35, 70, 10);

    fill(100, 0, 0, 150);
    rect(50, 35, 3000 / snake.movetime_ms, 10);

    // draw: boost HUD
    stroke(0);
    noFill()
    rect(50, 50, 70, 10);

    fill(0, 100, 0, 150);
    rect(50, 50, (snake.currentBoostCapacity / MAX_BOOST) * 70, 10);

    // draw: pause overlay
    if (!running) {
        rectMode(CORNER);
        noStroke();
        fill(0, 0, 0, 100);
        rect(0, 0, width, height);

        if (darkMode) {
            fill(DARK_MODE_TEXT_FILL);
        } else {
            if (snake.blinded) {
                fill(DARK_MODE_TEXT_FILL);
            } else {
                fill(LIGHT_MODE_TEXT_FILL);
            }
        }
        textSize(100);
        textAlign(CENTER, CENTER);
        text("PAUSED", width / 2, height / 2);
    }
}

// ------------------------------------------------------------------- input
const W_KEY = 87;
const S_KEY = 83;
const A_KEY = 65;
const D_KEY = 68;
const P_KEY = 80;

function keyPressed() {
    switch (keyCode) {
        case W_KEY:
        case UP_ARROW:
            snake.setMoveDirection("NORTH");
            break;

        case S_KEY:
        case DOWN_ARROW:
            snake.setMoveDirection("SOUTH");
            break;

        case D_KEY:
        case RIGHT_ARROW:
            snake.setMoveDirection("WEST");
            break;

        case A_KEY:
        case LEFT_ARROW:
            snake.setMoveDirection("EAST");
            break;

        case P_KEY:
            toggleRunning();
            break;
    }
    return false;
}

function mouseClicked() {
    if (mouseX < 0 || mouseY < 0 || mouseX > width || mouseY > height) {
        running = false;
    } else {
        running = true;
    }
}

function toggleRunning() {
    running = !running;
}

// ------------------------------------------------------------------- snake
const MAX_MOVETIME_MS = 140;
const MIN_MOVETIME_MS = 40;
const REMOVE_ANIMATION_TIME_MS = 250;
const SPEED_DECAY = 0.125;
const MAX_BOOST = 100;
const SNAKE_BLIND_TIME = 7500;

class Snake {
    constructor() {
        this.head = new Bodypart(createVector(0, 0), createVector(1, 0), color(25, 255, 80));
        this.direction = "WEST";
        this.desiredDirection = "WEST";
        this.body = [this.head];
        let initalLength = 5;
        for (let i = 0; i < initalLength - 1; i++) {
            this.body.push(Bodypart.fromOther(this.body.at(-1)));
        }
        this.timeSinceLastMove = 0;
        this.removed = [];
        this.highscore = initalLength;

        this.currentBoostCapacity = MAX_BOOST;
        this.movetime_ms = MAX_MOVETIME_MS;
        this.move_animation_time_ms = MAX_MOVETIME_MS;
        this.moveLerpAmount = 0;

        this.blinded = false;
        this.blindTime = 0;
    }

    update() {
        // update: blind animation
        if (this.blinded == true) {
            this.blindTime += deltaTime;

            if (this.blindTime >= SNAKE_BLIND_TIME) {
                this.blinded = false;
            }
        }

        // update: refill boost capacity
        this.currentBoostCapacity = constrain(this.currentBoostCapacity + SPEED_DECAY * deltaTime, 0, MAX_BOOST);

        // update: snake speed decay
        this.movetime_ms = constrain(this.movetime_ms + SPEED_DECAY * deltaTime, MIN_MOVETIME_MS, MAX_MOVETIME_MS)
        this.move_animation_time_ms = this.movetime_ms;

        // update: animations
        for (const part of this.removed) {
            part.updateAnimations();
        }
        this.removed = this.removed.filter((part) => alpha(part.partColor) > 0);

        this.moveLerpAmount = constrain(this.timeSinceLastMove / this.move_animation_time_ms, 0, 1);
        for (const part of this.body) {
            part.updateAnimations()
        }


        // update: move timer
        this.timeSinceLastMove += deltaTime;
        if (this.timeSinceLastMove < this.movetime_ms) {
            return;
        }
        this.timeSinceLastMove -= this.movetime_ms;

        // update tail: grid positions
        for (let i = this.body.length - 1; i >= 1; i--) {
            this.body[i].currentPosition.set(this.body[i - 1].currentPosition);
            this.body[i].targetPosition.set(this.body[i - 1].targetPosition);
            this.body[i].didLooparound = this.body[i - 1].didLooparound;
        }

        // update head: grid position
        this.head.currentPosition.set(this.head.targetPosition);

        // check collision with itself
        let collisionIndex = -1;
        for (let i = 1; i < this.body.length; i++) {
            if (this.head.currentPosition.equals(this.body[i].currentPosition)) {
                collisionIndex = i;
                break;
            }
        }
        if (collisionIndex != -1) {
            this.head.startEatAnimation();
            for (const part of this.body.splice(collisionIndex)) {
                part.startRemoveAnimation()
                this.removed.push(part);
            }
        }

        // check collision with food
        for (let i = 0; i < foods.length; i++) {
            let food = foods[i];
            if (this.head.currentPosition.equals(food.currentPosition)) {
                this.head.startEatAnimation();
                food.onEat();
            }
        }

        // move
        this.direction = this.desiredDirection;
        this.head.didLooparound = false;
        switch (this.direction) {
            case "NORTH":
                this.head.targetPosition.add(0, -1);

                if (this.head.targetPosition.y < 0) {
                    this.head.currentPosition.add(0, NUM_ROWS);
                    this.head.targetPosition.add(0, NUM_ROWS);
                    this.head.didLooparound = true;
                }
                break;

            case "SOUTH":
                this.head.targetPosition.add(0, 1);

                if (this.head.targetPosition.y >= NUM_ROWS) {
                    this.head.currentPosition.sub(0, NUM_ROWS);
                    this.head.targetPosition.sub(0, NUM_ROWS);
                    this.head.didLooparound = true;
                }
                break;

            case "WEST":
                this.head.targetPosition.add(1, 0);

                if (this.head.targetPosition.x >= NUM_COLS) {
                    this.head.currentPosition.sub(NUM_COLS, 0);
                    this.head.targetPosition.sub(NUM_COLS, 0);
                    this.head.didLooparound = true;
                }
                break;

            case "EAST":
                this.head.targetPosition.add(-1, 0);

                if (this.head.targetPosition.x < 0) {
                    this.head.currentPosition.add(NUM_COLS, 0);
                    this.head.targetPosition.add(NUM_COLS, 0);
                    this.head.didLooparound = true;
                }
                break;
        }
    }

    startBlind() {
        this.blinded = true;
        this.blindTime = 0;
    }

    addPart() {
        this.body.push(Bodypart.fromOther(this.body.at(-1)));
        if (this.body.length > this.highscore) {
            this.highscore = this.body.length;
        }
    }

    removePart() {
        if (this.body.length <= 1) {
            return;
        }
        let part = this.body.pop();
        part.startRemoveAnimation()
        this.removed.push(part);
    }

    onWindowResized(OLD_BODYSIZE) {
        for (const part of this.removed) {
            part.onWindowResized(OLD_BODYSIZE);
        }
        for (const part of this.body) {
            part.onWindowResized(OLD_BODYSIZE);
        }
    }

    show() {
        // draw parts that are going to be removed
        for (let i = this.removed.length - 1; i >= 0; i--) {
            this.removed[i].show();
        }

        // draw body
        for (let i = this.body.length - 1; i >= 0; i--) {
            this.body[i].show();
        }

        // draw head: eyes
        this.drawEyes();
    }

    drawEyes() {
        fill(255, 255, 255, 200);
        let headX = this.head.smoothPosition.x;
        let headY = this.head.smoothPosition.y;
        let eyeSize = this.head.currentSize / 4;
        let offset = 2 * eyeSize / 3;
        let eyeX1 = headX - offset;
        let eyeX2 = headX + offset;
        let eyeY = headY - offset;

        circle(eyeX1, eyeY, eyeSize);
        circle(eyeX2, eyeY, eyeSize);

        if (this.head.didLooparound) {
            circle(eyeX1 + width, eyeY, eyeSize);
            circle(eyeX2 + width, eyeY, eyeSize);

            circle(eyeX1 - width, eyeY, eyeSize);
            circle(eyeX2 - width, eyeY, eyeSize);

            circle(eyeX1, eyeY + height, eyeSize);
            circle(eyeX2, eyeY + height, eyeSize);

            circle(eyeX1, eyeY - height, eyeSize);
            circle(eyeX2, eyeY - height, eyeSize);
        }
    }

    setMoveDirection(desiredDirection) {
        if (running == false) {
            toggleRunning();
        }

        if (isOppositeDirection(this.direction, desiredDirection)) {
            return;
        }
        // speed up
        if (this.direction == desiredDirection) {
            this.boostSpeed()
            return;
        }
        this.desiredDirection = desiredDirection;
    }

    boostSpeed() {
        this.currentBoostCapacity /= 2;
        this.movetime_ms -= this.currentBoostCapacity;
        this.move_animation_time_ms = this.movetime_ms;
    }
}

function isOppositeDirection(directionOne, directionTwo) {
    switch (directionOne) {
        case "NORTH":
            return directionTwo == "SOUTH";

        case "SOUTH":
            return directionTwo == "NORTH";

        case "WEST":
            return directionTwo == "EAST";

        case "EAST":
            return directionTwo == "WEST";
    }
}

const MAX_R_CHANGE = 45;
const MAX_G_CHANGE = 45;
const MAX_B_CHANGE = 45;

const BODYPART_SPAWN_TIME_MS = 250;

class Bodypart {
    constructor(currentPosition, targetPosition, partColor) {
        this.currentPosition = currentPosition;
        this.targetPosition = targetPosition;
        this.smoothPosition = p5.Vector.mult(this.currentPosition, BODYSIZE).add(BODYSIZE / 2, BODYSIZE / 2);
        this.partColor = partColor;
        this.currentSize = BODYSIZE;
        this.didLooparound = false;

        this.inSpawnAnimation = false;
        this.spawnAnimationTime = 0;

        this.inEatAnimation = false;
        this.eatAnimationTime = 0;

        this.inRemoveAnimation = false;
        this.removeAnimationTime = 0;
    }

    static fromXY(x, y, partColor) {
        let part = new Bodypart(createVector(x, y), createVector(x, y), partColor);
        return part;
    }

    static fromOther(other) {
        let part = new Bodypart(other.currentPosition.copy(), other.currentPosition.copy(), Bodypart.modifyColor(other.partColor));
        other.behind = part;
        part.startSpawnAnimation();
        return part;
    }

    static modifyColor(partColor) {
        let r = red(partColor);
        let g = green(partColor);
        let b = blue(partColor);
        let rChangeBound = getRandomArbitrary(15, MAX_R_CHANGE);
        let gChangeBound = getRandomArbitrary(15, MAX_G_CHANGE);
        let bChangeBound = getRandomArbitrary(15, MAX_B_CHANGE);
        let newR = constrain(r + getRandomArbitrary(-rChangeBound, rChangeBound), 0, 255);
        let newG = constrain(g + getRandomArbitrary(-gChangeBound, gChangeBound), 0, 255);
        let newB = constrain(b + getRandomArbitrary(-bChangeBound, bChangeBound), 0, 255)
        return color(newR, newG, newB);
    }

    onWindowResized(OLD_BODYSIZE) {
        if (this.inSpawnAnimation) {
            let offset = (OLD_BODYSIZE - this.currentSize) / 2;
            this.smoothPosition.sub(offset, offset).div(OLD_BODYSIZE).mult(BODYSIZE);
            this.currentSize = lerp(0, BODYSIZE, this.spawnAnimationTime / BODYPART_SPAWN_TIME_MS);
            offset = (BODYSIZE - this.currentSize) / 2;
            this.smoothPosition.add(offset, offset);
        } else {
            this.smoothPosition.div(OLD_BODYSIZE).mult(BODYSIZE);
            this.currentSize = BODYSIZE;
        }
    }

    updateAnimations() {
        if (this.inRemoveAnimation) {
            this.updateRemoveAnimation();
            return;
        }

        this.updateMoveAnimation();

        if (this.inSpawnAnimation) {
            this.updateSpawnAnimation();
            return;
        }

        if (this.inEatAnimation) {
            this.updateEatAnimation();
        }
    }

    // ----------------- eat animation
    startEatAnimation() {
        if (this.inEatAnimation) {
            return;
        }
        this.inEatAnimation = true;
        this.eatAnimationTime = 0;
    }

    updateEatAnimation() {
        this.eatAnimationTime += deltaTime;
        if (this.eatAnimationTime >= BODYPART_SPAWN_TIME_MS) {
            this.inEatAnimation = false;
            this.currentSize = BODYSIZE;
            return;
        }
        // pass animation 
        if (this.behind !== undefined && this.eatAnimationTime > BODYPART_SPAWN_TIME_MS / 7) {
            this.behind.startEatAnimation();
        }

        // update size
        this.currentSize = BODYSIZE + Math.sin(PI * this.eatAnimationTime / BODYPART_SPAWN_TIME_MS) * 15;
    }

    // ----------------- spawn animation
    startSpawnAnimation() {
        this.inSpawnAnimation = true;
        this.spawnAnimationTime = 0;
        this.currentSize = 0;
    }

    updateSpawnAnimation() {
        this.spawnAnimationTime += deltaTime;
        // end animation?
        if (this.spawnAnimationTime >= BODYPART_SPAWN_TIME_MS) {
            this.currentSize = BODYSIZE;
            this.inSpawnAnimation = false;
            return;
        }
        // update size
        this.currentSize = lerp(0, BODYSIZE, this.spawnAnimationTime / BODYPART_SPAWN_TIME_MS);
    }

    // ----------------- remove animation
    startRemoveAnimation() {
        this.inRemoveAnimation = true;
        this.removeAnimationTime = 0;
    }

    // ----------------- move animation
    updateRemoveAnimation() {
        // update alpha value of color
        this.removeAnimationTime += deltaTime;
        let newAlpha = constrain(255 * (1 - this.removeAnimationTime / REMOVE_ANIMATION_TIME_MS), 0, 255);
        this.partColor.setAlpha(newAlpha);
    }

    updateMoveAnimation() {
        // update position
        this.smoothPosition = p5.Vector.lerp(this.currentPosition, this.targetPosition, snake.moveLerpAmount);
        this.smoothPosition.mult(BODYSIZE).add(BODYSIZE / 2, BODYSIZE / 2);
    }

    show() {
        stroke(0);
        fill(this.partColor);
        ellipseMode(CENTER);

        if (this.didLooparound) {
            // left border loop
            this.drawPart(-width, 0);

            // right border loop
            this.drawPart(width, 0);

            // top border loop
            this.drawPart(0, -height);

            // top border looping
            this.drawPart(0, height);
        }
        this.drawPart(0, 0);
    }

    drawPart(offsetX, offsetY) {
        circle(this.smoothPosition.x + offsetX, this.smoothPosition.y + offsetY, this.currentSize);
    }
}

// ------------------------------------------------------------------- java script

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

// ------------------------------------------------------------------- food
const FOOD_SPAWN_TIME_MS = 300;
const MIN_FOOD_ALIVE_TIME = 30000
const MAX_FOOD_ALIVE_TIME = 100000;
const STANDARD_FOOD_COLOR = "#ff0000";
const MYSTERY_FOOD_COLOR = "#f0e800";
const MYSTERY_PROBABILITY = 0.085;

class Food {
    constructor() {
        this.currentPosition = createVector(0, 0);
        this.currentDrawPosition = createVector(0, 0);
        this.inSpawnAnimation = true;
        this.spawnAnimationTime = 0;
        this.currentSize = 0;
        this.currentColor = STANDARD_FOOD_COLOR;
        this.decaying = false;
        this.timeAlive = 0;
        this.currentMaxAliveTime = getRandomArbitrary(MIN_FOOD_ALIVE_TIME, MAX_FOOD_ALIVE_TIME);

        this.isMystery = false;
    }

    init() {
        do {
            this.currentPosition.set(getRandomInt(NUM_COLS), getRandomInt(NUM_ROWS));
            const samePosition = (element) => element.currentPosition.equals(this.currentPosition) && element != this;

            if (foods.some(samePosition)) {
                continue;
            }
            if (snake.body.some(samePosition)) {
                continue;
            }

            this.currentDrawPosition.set(this.currentPosition).mult(BODYSIZE).add(BODYSIZE / 2, BODYSIZE / 2);
            this.inSpawnAnimation = true;
            this.spawnAnimationTime = 0;
            this.currentSize = 0;
            this.timeAlive = 0;
            this.currentMaxAliveTime = getRandomArbitrary(MIN_FOOD_ALIVE_TIME, MAX_FOOD_ALIVE_TIME);

            this.isMystery = (Math.random() <= MYSTERY_PROBABILITY);
            if (this.isMystery) {
                this.currentColor = MYSTERY_FOOD_COLOR;
                // this.decaying = true;
            } else {
                this.currentColor = STANDARD_FOOD_COLOR;
                this.decaying = false;
            }
            break;
        } while (true);
    }

    onEat() {
        if (this.isMystery) {
            let rand = Math.random()
            if (0.0 <= rand && rand < 0.4) {
                snake.startBlind();
            } else if (0.4 <= rand && rand < 0.6) {
                for (let i = 0; i < getRandomArbitrary(3, 10); i++) {
                    snake.removePart();
                }
            } else if (0.6 <= rand && rand <= 1.0) {
                for (let i = 0; i < getRandomArbitrary(3, 10); i++) {
                    snake.addPart();
                }
            }
        } else {
            snake.addPart();
        }
        this.init();
    }

    onWindowResized() {
        this.currentDrawPosition.set(this.currentPosition).mult(BODYSIZE).add(BODYSIZE / 2, BODYSIZE / 2);
        if (this.inSpawnAnimation) {
            this.currentSize = lerp(0, BODYSIZE, this.spawnAnimationTime / FOOD_SPAWN_TIME_MS);
        } else {
            this.currentSize = BODYSIZE;
        }
    }

    update() {
        if (this.inSpawnAnimation == true) {
            this.updateSpawnAnimation();
        }
        else if (this.decaying) {
            this.updateDecayAnimation();
        }
    }

    updateDecayAnimation() {
        this.timeAlive += deltaTime;
        if (this.timeAlive > this.currentMaxAliveTime) {
            this.init();
            NUM_FOOD_MISSED++;
            return;
        }
        this.currentSize = lerp(BODYSIZE, 0, this.timeAlive / this.currentMaxAliveTime);
    }

    updateSpawnAnimation() {
        this.spawnAnimationTime += deltaTime;
        if (this.spawnAnimationTime >= FOOD_SPAWN_TIME_MS) {
            this.currentSize = BODYSIZE;
            this.inSpawnAnimation = false;
            return;
        }
        this.currentSize = lerp(0, BODYSIZE, this.spawnAnimationTime / FOOD_SPAWN_TIME_MS);
    }

    show() {
        rectMode(CENTER);
        stroke(0);
        fill(this.currentColor);
        square(this.currentDrawPosition.x, this.currentDrawPosition.y, this.currentSize);
    }
}