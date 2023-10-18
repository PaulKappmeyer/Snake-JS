const NUM_COLS = 33;
const NUM_ROWS = 17;

let BODYSIZE;

const NUM_FOOD = 8;
let snake;
let foods = [];

const container = "snake-container";

let running = true;

function setup() {
    calcBODYSIZE();
    let canvas = createCanvas(NUM_COLS * BODYSIZE + 3, NUM_ROWS * BODYSIZE + 3);
    canvas.parent(container);

    snake = new Snake();

    for (let i = 0; i < NUM_FOOD; i++) {
        foods[i] = new Food();
        foods[i].randomLocation();
    }
}

function windowResized() {
    let OLD_BODYSIZE = BODYSIZE;
    // calc new size
    calcBODYSIZE()
    resizeCanvas(NUM_COLS * BODYSIZE + 3, NUM_ROWS * BODYSIZE + 3);

    // pass old size
    foods.forEach((food) => food.onWindowResized());
    snake.onWindowResized(OLD_BODYSIZE);
}

function calcBODYSIZE() {
    BODYSIZE = int(min((windowWidth - 100) / NUM_COLS, (windowHeight - 100) / NUM_ROWS));
}

function draw() {
    if (!focused) {
        running = false;
    }

    if (running) {
        // update: snake movement and animations
        snake.update();

        // update: food animation
        foods.forEach((food) => food.updateSpawnAnimation());
    }

    // draw: background
    background(220);
    translate(1, 1);

    // draw: food
    foods.forEach((food) => food.show());

    // draw: snake
    snake.show();

    // draw: text
    stroke(220);
    fill(0);
    textSize(12);
    textAlign(LEFT, CENTER);
    text("Länge: " + snake.body.length, 5, 10);
    text("Highscore: " + snake.highscore, 5, 20);

    if (!running) {
        stroke(0);
        fill(0, 0, 0, 100);
        rect(0, 0, width, height);

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
const MOVETIME_MS = 150;
const MOVE_ANIMATION_TIME_MS = MOVETIME_MS;
const REMOVE_ANIMATION_TIME_MS = 250;

class Snake {
    constructor() {
        this.head = new Bodypart(0, 0, color(25, 255, 80));
        this.direction = "WEST";
        this.desiredDirection = "WEST";
        this.head.targetPosition.add(1, 0);
        this.body = [this.head];
        let initalLength = 5;
        for (let i = 0; i < initalLength - 1; i++) {
            this.body.push(new Bodypart(this.body.at(-1)));
        }
        this.timeSinceLastMove = 0;
        this.removed = [];
        this.highscore = initalLength;
    }

    update() {
        // update: remove animation
        this.removed.forEach((part) => part.updateRemoveAnimation());
        this.removed = this.removed.filter((part) => alpha(part.partColor) > 0);

        // update: spawn animation:
        this.body.forEach((part) => part.updateSpawnAnimation());

        // update: move animation
        let lerpAmount = this.timeSinceLastMove / MOVE_ANIMATION_TIME_MS;
        //lerpAmount = constrain(lerpAmount, 0, 1);
        this.body.forEach((part) => part.updateMoveAnimation(lerpAmount));



        // update: move timer
        this.timeSinceLastMove += deltaTime;
        if (this.timeSinceLastMove < MOVETIME_MS) {
            return;
        }
        this.timeSinceLastMove -= MOVETIME_MS;

        // update tail: grid positions
        for (let i = this.body.length - 1; i >= 1; i--) {
            this.body[i].currentPosition.set(this.body[i - 1].currentPosition);
            this.body[i].targetPosition.set(this.body[i - 1].targetPosition);
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
            this.body.splice(collisionIndex).forEach((part) => this.removed.push(part));
        }

        // check collision with food
        for (let i = 0; i < foods.length; i++) {
            let food = foods[i];
            if (this.head.currentPosition.equals(food.currentPosition)) {
                this.body.push(new Bodypart(this.body.at(-1)));
                if (this.body.length > this.highscore) {
                    this.highscore = this.body.length;
                }
                food.randomLocation();
            }
        }

        // move
        this.direction = this.desiredDirection;
        switch (this.direction) {
            case "NORTH":
                this.head.targetPosition.add(0, -1);

                if (this.head.targetPosition.y < 0) {
                    this.head.currentPosition.add(0, NUM_ROWS);
                    this.head.targetPosition.add(0, NUM_ROWS);
                }
                break;

            case "SOUTH":
                this.head.targetPosition.add(0, 1);

                if (this.head.targetPosition.y >= NUM_ROWS) {
                    this.head.currentPosition.sub(0, NUM_ROWS);
                    this.head.targetPosition.sub(0, NUM_ROWS);
                }
                break;

            case "WEST":
                this.head.targetPosition.add(1, 0);

                if (this.head.targetPosition.x >= NUM_COLS) {
                    this.head.currentPosition.sub(NUM_COLS, 0);
                    this.head.targetPosition.sub(NUM_COLS, 0);
                }
                break;

            case "EAST":
                this.head.targetPosition.add(-1, 0);

                if (this.head.targetPosition.x < 0) {
                    this.head.currentPosition.add(NUM_COLS, 0);
                    this.head.targetPosition.add(NUM_COLS, 0);
                }
                break;
        }
    }

    onWindowResized(OLD_BODYSIZE) {
        this.removed.forEach((part) => part.onWindowResized(OLD_BODYSIZE));
        this.body.forEach((part) => part.onWindowResized(OLD_BODYSIZE));
    }

    show() {
        // left border loop
        translate(-width, 0);
        this.drawSnake();
        translate(width, 0);

        // right border loop
        translate(width, 0);
        this.drawSnake();
        translate(-width, 0);

        // top border loop
        translate(0, -height);
        this.drawSnake();
        translate(0, height);

        // top border looping
        translate(0, height);
        this.drawSnake();
        translate(0, -height);

        // normal drawing in view
        this.drawSnake();
    }

    drawSnake() {
        // draw parts that are going to be removed
        this.removed.toReversed().forEach((part) => part.show());

        // draw body
        this.body.toReversed().forEach((part) => part.show());

        // draw head: eyes
        fill(255, 255, 255, 200);
        let headX = this.head.smoothPosition.x;
        let headY = this.head.smoothPosition.y;
        circle(headX + 5 / 24 * BODYSIZE, headY + BODYSIZE / 4, BODYSIZE / 4);
        circle(headX + 13 / 24 * BODYSIZE, headY + BODYSIZE / 4, BODYSIZE / 4);
    }

    setMoveDirection(desiredDirection) {
        if (isOppositeDirection(this.direction, desiredDirection)) {
            return;
        }
        this.desiredDirection = desiredDirection;
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
    constructor(x, y, partColor) {
        if (y === undefined) {
            let other = x;
            this.currentPosition = other.currentPosition.copy();
            this.targetPosition = other.currentPosition.copy();
            this.smoothPosition = other.currentPosition.copy().mult(BODYSIZE);
            this.partColor = this.modifyColor(other.partColor);

            this.inSpawnAnimation = true;
            this.spawnAnimationTime = 0;
            this.currentSize = 0;
        } else {
            this.currentPosition = createVector(x, y);
            this.targetPosition = createVector(x, y);
            this.smoothPosition = createVector(x, y).mult(BODYSIZE);
            this.partColor = partColor;

            this.inSpawnAnimation = false;
            this.spawnAnimationTime = 0;
            this.currentSize = BODYSIZE;
        }
        this.removeAnimationTime = 0;
    }

    modifyColor(partColor) {
        let r = red(partColor);
        let g = green(partColor);
        let b = blue(partColor);
        let rChangeBound = random(15, MAX_R_CHANGE);
        let gChangeBound = random(15, MAX_G_CHANGE);
        let bChangeBound = random(15, MAX_B_CHANGE);
        let newR = constrain(r + random(-rChangeBound, rChangeBound), 0, 255);
        let newG = constrain(g + random(-gChangeBound, gChangeBound), 0, 255);
        let newB = constrain(b + random(-bChangeBound, bChangeBound), 0, 255)
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

    updateSpawnAnimation() {
        if (this.inSpawnAnimation == false) {
            return;
        }
        this.spawnAnimationTime += deltaTime;
        if (this.spawnAnimationTime >= BODYPART_SPAWN_TIME_MS) {
            this.smoothPosition.set(this.currentPosition.x * BODYSIZE, this.currentPosition.y * BODYSIZE);
            this.currentSize = BODYSIZE;
            this.inSpawnAnimation = false;
            return;
        }
        this.currentSize = lerp(0, BODYSIZE, this.spawnAnimationTime / BODYPART_SPAWN_TIME_MS);
    }

    updateRemoveAnimation() {
        this.removeAnimationTime += deltaTime;
        let newAlpha = constrain(255 * (1 - this.removeAnimationTime / REMOVE_ANIMATION_TIME_MS), 0, 255);
        this.partColor.setAlpha(newAlpha);
    }

    updateMoveAnimation(lerpAmount) {
        this.smoothPosition = p5.Vector.lerp(this.currentPosition, this.targetPosition, lerpAmount);
        this.smoothPosition.mult(BODYSIZE);

        if (this.inSpawnAnimation) {
            let offset = (BODYSIZE - this.currentSize) / 2;
            this.smoothPosition.add(offset, offset);
        }
    }

    show() {
        stroke(0);
        fill(this.partColor);
        ellipseMode(CORNER);
        circle(this.smoothPosition.x, this.smoothPosition.y, this.currentSize);
    }
}

// ------------------------------------------------------------------- food
const FOOD_SPAWN_TIME_MS = 300;

class Food {
    constructor() {
        this.currentPosition = createVector(0, 0);
        this.currentDrawPosition = createVector(0, 0);
        this.inSpawnAnimation = true;
        this.spawnAnimationTime = 0;
        this.currentSize = 0;
    }

    randomLocation() {
        do {
            this.currentPosition.set(int(random(0, NUM_COLS)), int(random(0, NUM_ROWS)));
            const samePosition = (element) => element.currentPosition.equals(this.currentPosition) && element != this;

            if (foods.some(samePosition)) {
                continue;
            }
            if (snake.body.some(samePosition)) {
                continue;
            }

            this.inSpawnAnimation = true;
            this.spawnAnimationTime = 0;
            this.currentSize = 0;
            break;
        } while (true);
    }

    onWindowResized() {
        if (this.inSpawnAnimation) {
            this.currentSize = lerp(0, BODYSIZE, this.spawnAnimationTime / FOOD_SPAWN_TIME_MS);
            let offset = (BODYSIZE - this.currentSize) / 2;
            this.currentDrawPosition.set(this.currentPosition.x * BODYSIZE + offset, this.currentPosition.y * BODYSIZE + offset);
        } else {
            this.currentDrawPosition.set(this.currentPosition.x * BODYSIZE, this.currentPosition.y * BODYSIZE);
            this.currentSize = BODYSIZE;
        }
    }

    updateSpawnAnimation() {
        if (this.inSpawnAnimation == false) {
            return;
        }
        this.spawnAnimationTime += deltaTime;
        if (this.spawnAnimationTime >= FOOD_SPAWN_TIME_MS) {
            this.currentDrawPosition.set(this.currentPosition.x * BODYSIZE, this.currentPosition.y * BODYSIZE);
            this.currentSize = BODYSIZE;
            this.inSpawnAnimation = false;
            return;
        }
        this.currentSize = lerp(0, BODYSIZE, this.spawnAnimationTime / FOOD_SPAWN_TIME_MS);
        let offset = (BODYSIZE - this.currentSize) / 2;
        this.currentDrawPosition.set(this.currentPosition.x * BODYSIZE + offset, this.currentPosition.y * BODYSIZE + offset);
    }

    show() {
        rectMode(CORNER)
        stroke(0);
        fill(255, 0, 0);
        square(this.currentDrawPosition.x, this.currentDrawPosition.y, this.currentSize);
    }
}