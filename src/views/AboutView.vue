<script setup lang="ts">
// import { onMounted } from "vue";

// let W = window.innerWidth;
// let H = window.innerHeight;
// const maxConfettis = 150;
// const particles = [];

// const possibleColors = [
//   "DodgerBlue",
//   "OliveDrab",
//   "Gold",
//   "Pink",
//   "SlateBlue",
//   "LightBlue",
//   "Gold",
//   "Violet",
//   "PaleGreen",
//   "SteelBlue",
//   "SandyBrown",
//   "Chocolate",
//   "Crimson",
// ];

// function randomFromTo(from: number, to: number) {
//   return Math.floor(Math.random() * (to - from + 1) + from);
// }

// function confettiParticle() {
//   this.x = Math.random() * W; // x
//   this.y = Math.random() * H - H; // y
//   this.r = randomFromTo(11, 33); // radius
//   this.d = Math.random() * maxConfettis + 11;
//   this.color =
//     possibleColors[Math.floor(Math.random() * possibleColors.length)];
//   this.tilt = Math.floor(Math.random() * 33) - 11;
//   this.tiltAngleIncremental = Math.random() * 0.07 + 0.05;
//   this.tiltAngle = 0;

//   this.draw = function (context: CanvasRenderingContext2D) {
//     context.beginPath();
//     context.lineWidth = this.r / 2;
//     context.strokeStyle = this.color;
//     context.moveTo(this.x + this.tilt + this.r / 3, this.y);
//     context.lineTo(this.x + this.tilt, this.y + this.tilt + this.r / 5);
//     context.stroke();
//   };
// }

// function Draw(context: CanvasRenderingContext2D) {
//   const results = [];

//   requestAnimationFrame(() => Draw(context));

//   context.clearRect(0, 0, W, window.innerHeight);

//   for (let i = 0; i < maxConfettis; i++) {
//     results.push(particles[i].draw(context));
//   }

//   let particle = {};
//   let remainingFlakes = 0;
//   for (let i = 0; i < maxConfettis; i++) {
//     particle = particles[i];

//     particle.tiltAngle += particle.tiltAngleIncremental;
//     particle.y += (Math.cos(particle.d) + 3 + particle.r / 2) / 2;
//     particle.tilt = Math.sin(particle.tiltAngle - i / 3) * 15;

//     if (particle.y <= H) remainingFlakes++;

//     if (particle.x > W + 30 || particle.x < -30 || particle.y > H) {
//       particle.x = Math.random() * W;
//       particle.y = -30;
//       particle.tilt = Math.floor(Math.random() * 10) - 20;
//     }
//   }

//   return results;
// }

// onMounted(() => {
//   const canvas = document.getElementById("canvas") as HTMLCanvasElement;
//   if (canvas) {
//     const context = canvas.getContext("2d");
//     if (context) {
//       canvas.width = W;
//       canvas.height = H;

//       window.addEventListener("resize", () => {
//         W = window.innerWidth;
//         H = window.innerHeight;
//         canvas.width = W;
//         canvas.height = H;
//       });

//       for (let i = 0; i < maxConfettis; i++) {
//         particles.push(new confettiParticle());
//       }

//       Draw(context);
//     }
//   }
// });
</script>

<template>
  <h1>Test!</h1>
  <!-- <canvas id="canvas"></canvas> -->
</template>

<style style>
h1 {
  position: absolute;
  margin-top: 30vh;
  width: 100%;
  text-align: center;
  font-size: 333%;
  font-family: sans-serif;
  color: white;
}

canvas {
  overflow-y: hidden;
  overflow-x: hidden;
  width: 100%;
  margin: 0;
}
</style>
