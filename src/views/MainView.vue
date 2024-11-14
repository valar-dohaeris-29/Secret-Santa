<script setup lang="ts">
import { ref, watch } from "vue";

let W = window.innerWidth;
let H = window.innerHeight;
const maxConfettis = 75;
const particles: ConfettiParticle[] = [];
let animationFrameId: number | null = null;

const possibleColors = [
  "DodgerBlue",
  "OliveDrab",
  "Gold",
  "Pink",
  "SlateBlue",
  "LightBlue",
  "Gold",
  "Violet",
  "PaleGreen",
  "SteelBlue",
  "SandyBrown",
  "Chocolate",
  "Crimson",
];

function randomFromTo(from: number, to: number) {
  return Math.floor(Math.random() * (to - from + 1) + from);
}

// Define ConfettiParticle class
class ConfettiParticle {
  x: number;
  y: number;
  r: number;
  d: number;
  color: string;
  tilt: number;
  tiltAngleIncremental: number;
  tiltAngle: number;

  constructor() {
    this.x = Math.random() * W; // x
    this.y = Math.random() * H - H; // y
    this.r = randomFromTo(11, 33); // radius
    this.d = Math.random() * maxConfettis + 11;
    this.color =
      possibleColors[Math.floor(Math.random() * possibleColors.length)];
    this.tilt = Math.floor(Math.random() * 33) - 11;
    this.tiltAngleIncremental = Math.random() * 0.07 + 0.05;
    this.tiltAngle = 0;
  }

  draw(context: CanvasRenderingContext2D) {
    context.beginPath();
    context.lineWidth = this.r / 2;
    context.strokeStyle = this.color;
    context.moveTo(this.x + this.tilt + this.r / 3, this.y);
    context.lineTo(this.x + this.tilt, this.y + this.tilt + this.r / 5);
    context.stroke();
  }
}

function Draw(context: CanvasRenderingContext2D) {
  context.clearRect(0, 0, W, window.innerHeight);

  for (let i = 0; i < maxConfettis; i++) {
    particles[i].draw(context);
  }

  for (let i = 0; i < maxConfettis; i++) {
    const particle = particles[i];
    particle.tiltAngle += particle.tiltAngleIncremental;
    particle.y += (Math.cos(particle.d) + 3 + particle.r / 2) / 2;
    particle.tilt = Math.sin(particle.tiltAngle - i / 3) * 15;

    if (particle.y > H || particle.x > W + 30 || particle.x < -30) {
      particle.x = Math.random() * W;
      particle.y = -30;
      particle.tilt = Math.floor(Math.random() * 10) - 20;
    }
  }

  // Recursive loop
  animationFrameId = requestAnimationFrame(() => Draw(context));
}

const startConfetti = () => {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  if (canvas) {
    const context = canvas.getContext("2d");
    if (context) {
      canvas.width = W;
      canvas.height = H;

      window.addEventListener("resize", onResize);

      for (let i = 0; i < maxConfettis; i++) {
        particles.push(new ConfettiParticle());
      }

      Draw(context);
    }
  }
};

const endConfetti = () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  // Clear particles array to stop rendering them
  particles.length = 0;

  window.removeEventListener("resize", onResize);
};

function onResize() {
  W = window.innerWidth;
  H = window.innerHeight;
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  if (canvas) {
    canvas.width = W;
    canvas.height = H;
  }
}
const props = defineProps({
  nameMap: {
    required: true,
    type: Object as () => Record<string, string>,
  },
  title: {
    required: true,
    type: String,
  },
});

const person = ref("");
const password = ref("");

watch(password, (newText) => {
  newText = newText.toLocaleLowerCase();
  if (props.nameMap[newText]) {
    person.value = props.nameMap[newText];
    startConfetti();
  } else {
    endConfetti();
    person.value = "";
  }
});
</script>

<template>
  <div class="background">
    <div class="content">
      <div class="top-spacing"></div>
      <v-row class="pl-6 pr-6">
        <v-col cols="12">
          <h2>🎁{{ props.title }}🤫</h2>
          <h3>🎄I'm Santa🎅</h3>
          <h3>And I need YOUR help!</h3>
        </v-col>
      </v-row>
      <v-row class="pl-6 pr-6">
        <v-col cols="12">
          <p>
            I have someone special that needs a gift from YOU! Please enter your
            Christmas code below
          </p>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="12">
          <v-text-field
            class="password pl-4"
            v-model="password"
            variant="solo"
            label="Christmas code"
          ></v-text-field>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="12" class="gifted-person">
          <div>
            <h1>{{ person }}</h1>
            <canvas id="canvas"></canvas>
          </div>
        </v-col>
      </v-row>
    </div>
  </div>
</template>

<style scoped>
.top-spacing {
  height: 200px;
}

h1 {
  position: absolute;
  margin-top: 5vh;
  width: 100%;
  text-align: center;
  font-size: 333%;
  font-family: sans-serif;
  color: white;
}

h2 {
  color: white;
  font-size: 23pt;
  font-weight: bold;
}

h3 {
  color: white;
  font-size: 18pt;
  font-weight: bold;
}

p {
  color: white;
  font-size: 14pt;
}

.background {
  width: 100vw;
  height: 100vh;
  background-image: url("../assets/img/christmas-background.jpg");
  background-position: center;
  background-repeat: repeat-y;
  background-size: cover;
}

.password {
  width: 200px;
}

canvas {
  overflow-y: hidden;
  overflow-x: hidden;
  width: 100%;
  margin: 0;
}
</style>
