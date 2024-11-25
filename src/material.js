import * as THREE from "three";
import {
  texture,
  color,
  pow,
  Fn,
  uniform,
  attribute,
  vec4,
  mix,
  div,
  mul,
  add,
  step,
  uv,
  vec2,
  floor
} from "three/tsl";

// Function to generate a dynamic palette
function generatePalette(baseColor, numColors) {
  let palette = [];
  for (let i = 0; i < numColors; i++) {
    let hue = (baseColor + i * (360 / numColors)) % 360;
    palette.push(`hsl(${hue}, 100%, 50%)`);
  }
  return palette;
}

export default function geezMaterial(
  asciiTexture,
  portraitTexture,
  length,
  baseColor = 0,
  numColors = 5,
  gammaCorrection = 0.9
) {
  // Create a NodeMaterial
  let material = new THREE.NodeMaterial({ wireframe: true });

  // Generate a dynamic palette
  let palette = generatePalette(baseColor, numColors);

  // Create uniforms that can be updated
  const baseColorUniform = uniform(baseColor);
  const numColorsUniform = uniform(numColors);
  const gammaCorrectionUniform = uniform(gammaCorrection);

  // Store uniforms on material for external access
  material.userData = {
    baseColorUniform,
    numColorsUniform,
    gammaCorrectionUniform,
    updateUniforms: (newBaseColor, newNumColors, newGammaCorrection) => {
      baseColorUniform.value = newBaseColor;
      numColorsUniform.value = newNumColors;
      gammaCorrectionUniform.value = newGammaCorrection;
      // Regenerate palette with new values
      palette = generatePalette(newBaseColor, newNumColors);
      // Update color uniforms
      uColors.forEach((colorUniform, i) => {
        if (palette[i]) {
          colorUniform.value = new THREE.Color(palette[i]);
        }
      });
    }
  };

  // Create uniforms for the palette colors
  const uColors = palette.map((colorStr) => uniform(new THREE.Color(colorStr)));

  // Define a function to sample the texture using UV coordinates
  const asciiCode = Fn(() => {
    const textureColor = texture(portraitTexture, attribute("pixelUv"));
    const brightness = pow(textureColor.r, gammaCorrectionUniform);

    const asciiUv = vec2(
      uv()
        .x.div(length)
        .add(floor(brightness.mul(length)).div(length)),
      uv().y
    );
    const asciiCode = texture(asciiTexture, asciiUv);

    let finalColor = uColors[0];
    for (let i = 1; i < uColors.length; i++) {
      finalColor = mix(finalColor, uColors[i], step(0.2 * i, brightness));
    }

    return asciiCode.mul(finalColor);
  });

  // Assign the sampled texture to the material's color node
  material.colorNode = asciiCode();

  return material;
}
