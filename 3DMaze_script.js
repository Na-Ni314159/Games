






"use strict";
let ctx, maze = [], cubes = [], W = 17, H = 17;
let xpos = 1, zpos = 1, dir =1;
let xposNext = 1, zposNext = 1, dirNext = 1;
let cameraY = 50, cameraRotY = 0,
  jumpVelocity = 0, counter = 0;
let light = new Vec3(0.5, -0.8, -0.2).normalize();

function random(val) { return Math.floor(Math.random() * val); }

function Vec3(x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
  this.normalize = function() {
    let x = this.x, y = this.y, z = this.z;
    let scale = 1 / Math.sqrt(x * x + y * y + z * z);
    this.x *= scale;
    this.y *= scale;
    this.z *= scale;
    return this;
  }
}

function Surface(vertices, i, type) {
  this.pos = vertices;
  this.type = type;
  let p1 = vertices[0];
  let p2 = vertices[1];
  let p3 = vertices[2];
  let p4 = vertices[3];
  let p = new Vec3 (p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
  let q = new Vec3 (p1.x - p3.x, p1.y - p3.y, p1.z - p3.z);
  let n = new Vec3 (    //normal vector
    p.y * q.z -p.z * q.y,
    p.z * q.x -p.x * q.z,
    p.x * q.y -p.y * q.x,);
  this.norm = n.normalize();    //unit normal vector
  this.cZ = (p1.z + p2.z + p3.z + p4.z) / 4;
  if (i == 0) {   //pull top surfaces a bit
    this.cZ -= 1;
  }
}

function Cube(x, y, z, w, h, d, type) {
  this.x = x;
  this.z = z;
  this.pos = [];
  this.type = type;
  this.vertices = [
    {x: x - w, y: y - h, z: z + d},
    {x: x - w, y: y + h, z: z + d},
    {x: x + w, y: y + h, z: z + d},
    {x: x + w, y: y - h, z: z + d},
    {x: x - w, y: y - h, z: z - d},
    {x: x - w, y: y + h, z: z - d},
    {x: x + w, y: y + h, z: z - d},
    {x: x + w, y: y - h, z: z - d},
  ];

  this.polygons = [
    [2, 1, 5, 6],
    [0, 1, 2, 3],
    [4, 5, 1, 0],
    [2, 6, 7, 3],
    [7, 6, 5, 4],
    [0, 3, 7, 4]
  ];

  this.getSurfaces = function () {
    let r = [];   //NOTE: floor surface is not returned
    for (let i = 0; i < this.polygons.length - 1; i++) {
      let indices = this.polygons[i];
      let p = [];
      for (let j = 0; j < indices.length; j++) {
        p.push (this.pos[indices[j]]);       
      }

      r.push (new Surface (p, i, this.type));
    }
    return r;
  };

  this.setCamera = function (cameraX, cameraZ, cameraY,
                                mRotX, mRotY) {
    for (let i = 0; i < this.vertices.length; i++) {
      let c = this.vertices[i];
      //move the camera
      let x = c.x - cameraX;
      let y = c.y - cameraY;
      let z = c.z - cameraZ;

      //rotate around Y axis
      let p = mRotY[0] * x + mRotY[1] * y 
             + mRotY[2] * z;
      let q = mRotY[3] * x + mRotY[4] * y 
             + mRotY[5] * z;
      let r = mRotY[6] * x + mRotY[7] * y 
             + mRotY[8] * z;

      //rotete around X axis
      x = mRotX[0] * p + mRotX[1] * q + mRotX[2] * r;
      y = mRotX[3] * p + mRotX[4] * q + mRotX[5] * r;
      z = mRotX[6] * p + mRotX[7] * q + mRotX[8] * r;
      this.pos[i] = {x: x, y: y, z: z};
    }
  }
}

function createMaze (w, h) {
  for (let z = 0; z < h; z++) {
    maze[z] = [];
    for (let x = 0; x < w; x++) {
      maze[z][x] = (x == 0 || x == w - 1 || 
                      z == 0 || z == h - 1) ? 1 : 0;
    }
  }

  for (let z = 2; z < h - 2; z += 2) {
    for (let x = 2; x < w - 2; x += 2) {
      maze[z][x] = 1;

      //top row - Up, Down, Left, Right
      //others - Down, Left, Right
      let dir = random ((z == 2) ? 4 : 3);
      let px = x, pz = z;
      switch (dir) {
        case 0: pz++; break;
        case 1: px--; break;
        case 2: px++; break;
        case 3: pz--; break;
      }
      maze [pz][px] = 1;
    }
  }
}

function init() {
  ctx = document.getElementById("field").getContext("2d");

  createMaze (W, H);

  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      if (maze[z][x]) {
        cubes.push(new Cube(x*100-25, 0, 
                  z*100-25, 25, 25, 25, "wall"));
        cubes.push(new Cube(x*100+25, 0, 
                  z*100-25, 25, 25, 25, "wall"));
        cubes.push(new Cube(x*100-25, 0, 
                  z*100+25, 25, 25, 25, "wall"));
        cubes.push(new Cube(x*100+25, 0, 
                  z*100+25, 25, 25, 25, "wall"));
      } 
      else {
        cubes.push(new Cube(x * 100, 0, 
             z * 100, 10, 10,10, "dot"));
      }
    }
  }

  onkeydown = mykeydown;
  setInterval(tick, 20)
}

function mykeydown(e) {
  if (counter) {return;}    //do nothing while moving

  let dx = 0, dz = 0;
  switch (e.keyCode) {
    case 37:    //left
      dirNext = dir + 1;
      break;
    case 39:    //right
      dirNext = dir - 1;
      break;
    case 38:    //up -> forward
      dx = Math.round(Math.cos(dir * Math.PI / 2));
      dz = Math.round(Math.sin(dir * Math.PI / 2));
      break;
      case 40:    //down -> backward
      dx = -Math.round(Math.cos(dir * Math.PI / 2));
      dz = -Math.round(Math.sin(dir * Math.PI / 2));
      break;
    case 32:    //space -> jump
      if (jumpVelocity == 0) {jumpVelocity = 150;}
      break;
    }

    if (maze[zpos + dz][xpos + dx] == 0) {
      //remove "dot" cubes
      cubes = cubes.filter(function (d) {
        return !(d.x / 100 == xpos + dx && 
                    d.z / 100 == zpos + dz);
      })
      cubes = cubes.filter(function (d) {
        return !(d.x / 100 == xpos + dx * 2 && 
                    d.z / 100 == zpos + dz * 2);
      })
      xposNext = xpos + dx * 2;
      zposNext = zpos + dz * 2;
    }

    if (dirNext != dir || 
          xposNext != xpos || zposNext != zpos) {
          counter = 1;    //start moving     
    }
}

function tick() {
  //set camera position and direction
  cameraRotY = dir * Math.PI / 2 - Math.PI / 2;
  let cameraX = xpos * 100, cameraZ = zpos * 100;

  if (counter) {    //while moving or rotating
    cameraRotY += ((dirNext - dir) * counter / 10)
            * (Math.PI / 2);
    cameraX += ((xposNext - xpos) * counter / 10) * 100;
    cameraZ += ((zposNext - zpos) * counter / 10) * 100;
    if (counter++ >= 10) {
      dir = dirNext = (dirNext + 4) % 4;
      xpos = xposNext;     
      zpos = zposNext;
      counter = 0;     
    }
  }

  jumpVelocity -= 4;
  cameraY += jumpVelocity;
  if (cameraY < 50) {
    jumpVelocity = 0;
    cameraY = 50;
  }

  //rotate Y & X
  let c = Math.cos(cameraRotY);
  let s = Math.sin(cameraRotY);
  let MatrixRotY = [c, 0, s, 0, 1, 0, -s, 0, c];
  let MatrixRotX = [1, 0, 0, 0, 1 ,0, 0, 0, 1];
  if (cameraY != 50) {
    let cameraRotX = Math.min(90, 
             (cameraY - 50) / 20) * Math.PI / 180;
    let c = Math.cos(-cameraRotX);
    let s = Math.sin(-cameraRotX);
    MatrixRotX = [1, 0, 0, 0, c, -s, 0, s, c];
  }
  cubes.forEach(function (b) {
    b.setCamera(cameraX,cameraZ, cameraY, 
      MatrixRotX, MatrixRotY);
  });

  paint();
}

function paint() {
  //clear background
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, 600, 600);

  //get all surfaces and sort them
  let surfaces = [];
  cubes.forEach(function(b) {
    surfaces = surfaces.concat(b.getSurfaces())
  });
  surfaces.sort(function(a, b) {
    return b.cZ - a.cZ;
  });

  //draw all surfaces
  surfaces.forEach(function (s) {
    let p = (s.norm.x * light.x + s.norm.y * light.y 
            + s.norm.z * light.z);
    let ratio=(p+1)/2;//p:-1 to 1,ratio:0 to 1
    let R=255,G=255,B=255;
    if(s.type=="dot"){
      R=0,G=255,B=128;
    }
    ctx.fillStyle="rgba("
     +Math.floor(R*ratio)+","
     +Math.floor(G*ratio)+"," 
     +Math.floor(B*ratio)+",255)";

    ctx.beginPath();
    for(let i=0;i<4;i++){
      let v=s.pos[i];
      if(v.z<=0) continue;
      let x=v.x/v.z*1000+300;
      let y=-v.y/v.z*1000+300;
      if(i==0){
        ctx.moveTo(x,y);
      }else{
        ctx.lineTo(x,y);
      }
    }
    ctx.closePath();
    ctx.fill();
  })

  //draw azimuth compass
  ctx.save();
  ctx.strokeStyle="white";
  ctx.translate(550,50);
  ctx.rotate(cameraRotY);
  ctx.beginPath();
  ctx.moveTo(0,20);
  ctx.lineTo(0,-20);
  ctx.lineTo(-5,-10);
  ctx.lineTo(5,-10);
  ctx.stroke();
  ctx.restore();
}