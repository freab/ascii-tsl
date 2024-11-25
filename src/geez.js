function createASCIITexture() {
  const dict =
    " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
  const length = dict.length;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = 64;
  canvas.height = 64;

  const asciiTexture = new THREE.Texture(canvas);
  asciiTexture.needsUpdate = true;

  ctx.font = "64px monospace";
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";

  for (let i = 0; i < length; i++) {
    ctx.fillText(dict[i], 0, ((i + 1) * 64) / length);
  }

  return asciiTexture;
}
