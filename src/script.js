import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import geezMaterial from "./material";
import GUI from "lil-gui";

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
};

window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Camera
const camera = new THREE.PerspectiveCamera(
  25,
  sizes.width / sizes.height,
  0.1,
  1000
);
camera.position.set(0, 0, 150);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

// Renderer
const renderer = new THREE.WebGPURenderer({
  canvas: canvas,
  forceWebGL: false
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000);

// Instanced Mesh Setup
let resolution = 512;
let rows = resolution;
let columns = resolution;
let instances = rows * columns;
const size = 0.09;

// Create ASCII Texture with one character per cell
function createASCIITexture() {
  const dict =
    " .'`^\",:;Il!i><~+_-?][}{1)(|\\/ሐመሠረሰሸቀበተቸ፳፴፵፶፷፸፹፺፻የ*#&8፳፴፵፶፷፸፹፺፻%@$";
  const length = dict.length;

  const charSize = 64; // Size of each character cell
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Set canvas size to accommodate all characters in a single row
  canvas.width = length * charSize;
  canvas.height = charSize;

  // Create a gradient background
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#000");
  gradient.addColorStop(1, "#333");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw characters with random colors, rotations, and sizes
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < length; i++) {
    const char = dict[i];
    const x = i * charSize + charSize / 2;
    const y = charSize / 2;

    // Random color
    const color = `hsl(${Math.random() * 360}, 100%, 50%)`;
    ctx.fillStyle = color;

    // Random rotation
    const angle = Math.random() * Math.PI * 2; // Random angle in radians
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.translate(-x, -y);

    // Random font size
    const fontSize = 30 + Math.random() * 20; // Random size between 30 and 50
    ctx.font = `bold ${fontSize}px Menlo`;

    // Draw character
    ctx.fillText(char, x, y);

    // Add shadow effect
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.restore();
  }

  // Add noise effect
  for (let i = 0; i < canvas.width * canvas.height * 0.01; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const alpha = Math.random() * 0.2;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(x, y, 1, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  return { texture, charCount: length };
}

const { texture: asciiTexture, charCount } = createASCIITexture();

// Geometry
const geometry = new THREE.PlaneGeometry(size, size);

// Initial texture
const initialTexture = new THREE.TextureLoader().load("../public/4.jpg");
let material = geezMaterial(asciiTexture, initialTexture, charCount);

// Instance Mesh
let instanceMesh = new THREE.InstancedMesh(geometry, material, instances);

// Set up attributes
let positions = new Float32Array(instances * 3);
let uvs = new Float32Array(instances * 2);
let randoms = new Float32Array(instances);

// Position and UV mapping
let index = 0;
for (let i = 0; i < rows; i++) {
  for (let j = 0; j < columns; j++) {
    const instanceIndex = i * columns + j;

    // Set UV coordinates to sample different parts of the ASCII texture
    const charIndex = Math.floor(Math.random() * length); // Random character index
    uvs[instanceIndex * 2] = i / (rows - 1);
    randoms[index] = Math.pow(Math.random(), 4);
    uvs[instanceIndex * 2 + 1] = j / (columns - 1);

    // Set positions
    positions[instanceIndex * 3] = i * size - (size * (rows - 1)) / 2;
    positions[instanceIndex * 3 + 1] = j * size - (size * (columns - 1)) / 2;
    positions[instanceIndex * 3 + 2] = 0;

    // Set matrix
    let m = new THREE.Matrix4();
    m.setPosition(
      positions[instanceIndex * 3],
      positions[instanceIndex * 3 + 1],
      positions[instanceIndex * 3 + 2]
    );
    instanceMesh.setMatrixAt(instanceIndex, m);
    index++;
  }
}

// Update instance attributes
instanceMesh.instanceMatrix.needsUpdate = true;
geometry.setAttribute("pixelUv", new THREE.InstancedBufferAttribute(uvs, 2));
geometry.setAttribute("random", new THREE.InstancedBufferAttribute(randoms, 1));

scene.add(instanceMesh);

// Animation loop
const tick = () => {
  controls.update();
  renderer.render(scene, camera);
};
renderer.setAnimationLoop(tick);

// GUI Setup
const gui = new GUI();
const textureFolder = gui.addFolder("Texture");
const params = {
  baseColor: 0,
  numColors: 5,
  gammaCorrection: 0.9
};

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = "image/*,video/*";

let currentVideo = null;

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (file.type.startsWith("image/")) {
        const img = new Image();
        img.src = e.target.result;

        img.onload = () => {
          const texture = new THREE.CanvasTexture(img);
          texture.minFilter = THREE.NearestFilter;
          texture.magFilter = THREE.NearestFilter;

          // Update the material with the new texture
          material = geezMaterial(
            asciiTexture,
            texture,
            charCount,
            params.baseColor,
            params.numColors,
            params.gammaCorrection
          );
          instanceMesh.material = material;

          // Hide loading indicator
          loadingIndicator.style.display = "none";
        };
      } else if (file.type.startsWith("video/")) {
        if (currentVideo) {
          currentVideo.pause();
          currentVideo.remove();
        }

        const video = document.createElement("video");
        video.src = e.target.result;
        video.loop = true;
        video.play();
        currentVideo = video;

        const texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;

        // Update the material with the new texture
        material = geezMaterial(
          asciiTexture,
          texture,
          charCount,
          params.baseColor,
          params.numColors,
          params.gammaCorrection
        );
        instanceMesh.material = material;

        // Update the texture with the current frame of the video
        const updateTexture = () => {
          if (video.readyState >= video.HAVE_CURRENT_DATA) {
            texture.needsUpdate = true;
          }
          requestAnimationFrame(updateTexture);
        };
        updateTexture();

        // Hide loading indicator
        loadingIndicator.style.display = "none";
      }
    };
    reader.readAsDataURL(file);

    // Show loading indicator
    loadingIndicator.style.display = "block";
  }
});

textureFolder.add(fileInput, "click").name("Upload Image/Video");
textureFolder
  .add(params, "baseColor", 0, 360)
  .name("Base Color")
  .onChange((value) => {
    params.baseColor = value;
    if (instanceMesh.material.userData.updateUniforms) {
      instanceMesh.material.userData.updateUniforms(
        value,
        params.numColors,
        params.gammaCorrection
      );
    }
  });

textureFolder
  .add(params, "numColors", 1, 10)
  .step(0.1)
  .name("Colors")
  .onChange((value) => {
    params.numColors = value;
    if (instanceMesh.material.userData.updateUniforms) {
      instanceMesh.material.userData.updateUniforms(
        params.baseColor,
        value,
        params.gammaCorrection
      );
    }
  });

textureFolder
  .add(params, "gammaCorrection", 0.1, 20.0)
  .name("Gamma Correction")
  .onChange((value) => {
    params.gammaCorrection = value;
    if (instanceMesh.material.userData.updateUniforms) {
      instanceMesh.material.userData.updateUniforms(
        params.baseColor,
        params.numColors,
        value
      );
    }
  });

// Add loading indicator
const loadingIndicator = document.createElement("div");
loadingIndicator.style.position = "absolute";
loadingIndicator.style.top = "50%";
loadingIndicator.style.left = "50%";
loadingIndicator.style.transform = "translate(-50%, -50%)";
loadingIndicator.style.background = "rgba(0, 0, 0, 0.8)";
loadingIndicator.style.color = "#fff";
loadingIndicator.style.padding = "20px";
loadingIndicator.style.borderRadius = "10px";
loadingIndicator.style.zIndex = 1000;
loadingIndicator.style.display = "none";
loadingIndicator.innerText = "Loading...";
document.body.appendChild(loadingIndicator);

// Add error handling
fileInput.addEventListener("error", (event) => {
  alert("Error loading file. Please try again.");
  loadingIndicator.style.display = "none";
});

// Add progress bar
const progressBar = document.createElement("progress");
progressBar.style.position = "absolute";
progressBar.style.top = "60%";
progressBar.style.left = "50%";
progressBar.style.transform = "translate(-50%, -50%)";
progressBar.style.width = "80%";
progressBar.style.height = "20px";
progressBar.style.display = "none";
document.body.appendChild(progressBar);

// Show progress bar when a file is being loaded
fileInput.addEventListener("change", (event) => {
  progressBar.style.display = "block";
});

// Update progress bar
fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentLoaded = (event.loaded / event.total) * 100;
        progressBar.value = percentLoaded;
      }
    };
    reader.onload = (e) => {
      progressBar.style.display = "none";
    };
    reader.readAsDataURL(file);
  }
});
