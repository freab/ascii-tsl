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
  100
);
camera.position.set(0, 0, 10);
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
const rows = 50;
const columns = 50;
const instances = rows * columns;
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

  // Fill background
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw characters
  ctx.fillStyle = "#fff";
  ctx.font = "bold 40px Menlo";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < length; i++) {
    if (i > 50) {
      for (let j = 0; j < 5; j++) {
        ctx.filter = `blur(${j * 1}px)`;
        ctx.fillText(dict[i], i * charSize + charSize / 2, charSize / 2);
      }
    }
    ctx.filter = "none";
    ctx.fillText(dict[i], i * charSize + charSize / 2, charSize / 2);
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
const instanceMesh = new THREE.InstancedMesh(geometry, material, instances);

// Set up attributes
const positions = new Float32Array(instances * 3);
const uvs = new Float32Array(instances * 2);
const randoms = new Float32Array(instances);

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
fileInput.accept = "image/*";

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
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
      };
    };
    reader.readAsDataURL(file);
  }
});

textureFolder.add(fileInput, "click").name("Upload Image");
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
  .step(1)
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
  .add(params, "gammaCorrection", 0.1, 5.0)
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
