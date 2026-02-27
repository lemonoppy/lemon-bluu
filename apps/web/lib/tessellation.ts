/**
 * Generates a hexagon tessellation pattern on a canvas
 *
 * @param ctx - The canvas 2D context to draw on
 * @param sourceCtx - The context containing the source image to sample colors from
 * @param width - The width of the canvas/image
 * @param height - The height of the canvas/image
 * @param hexSize - The size parameter for the hexagons (similar to pixel size)
 * @param getColor - Function to determine the color for each hexagon
 */
export function drawHexagonTessellation(
  ctx: CanvasRenderingContext2D,
  sourceCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  hexSize: number,
  getColor: (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => string,
): void {
  // Size calculations - slightly enlarge hexagons to ensure no gaps
  const size = hexSize * 1.05; // Add 5% to ensure overlap

  // For a regular hexagon
  const width_constant = Math.sqrt(3);
  const height_constant = 2;

  // Width is the distance between opposite vertices
  const hex_width = size;
  // Height is the distance between opposite sides
  const hex_height = hex_width * (width_constant / height_constant);

  // Distance between adjacent hexagon centers - slightly reduced for tighter packing
  const vert_dist = hex_height * 0.75; // 3/4 of height for proper overlap
  const horiz_dist = hex_width * 0.87; // Slightly closer than full width to ensure overlap

  // Start with an offset that ensures coverage of the top-left corner
  // Move starting positions to negative coordinates to ensure full coverage
  const startX = -hex_width / 2;
  const startY = -hex_height / 2;

  // Draw rows of hexagons
  for (
    let row = 0, y = startY;
    y < height + hex_height;
    row++, y += vert_dist
  ) {
    // Offset every other row
    const offset = row % 2 === 0 ? 0 : horiz_dist / 2;

    for (let x = startX + offset; x < width + hex_width; x += horiz_dist) {
      // Draw the hexagon
      ctx.beginPath();

      // Draw the six points of the hexagon
      for (let i = 0; i < 6; i++) {
        // 60° per segment, starting at 30°
        const angle = (Math.PI / 3) * i + Math.PI / 6;
        const hx = x + (hex_width / 2) * Math.cos(angle);
        const hy = y + (hex_width / 2) * Math.sin(angle);

        if (i === 0) {
          ctx.moveTo(hx, hy);
        } else {
          ctx.lineTo(hx, hy);
        }
      }

      ctx.closePath();

      // Calculate area for color sampling
      const sampleX = Math.max(0, Math.round(x - hex_width / 2));
      const sampleY = Math.max(0, Math.round(y - hex_height / 2));
      const sampleW = Math.min(width - sampleX, Math.round(hex_width));
      const sampleH = Math.min(height - sampleY, Math.round(hex_height));

      if (sampleW > 0 && sampleH > 0) {
        ctx.fillStyle = getColor(sourceCtx, sampleX, sampleY, sampleW, sampleH);
        ctx.fill();

        // Optional: add a very subtle stroke to eliminate any remaining micro-gaps
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }
}

/**
 * Generates a square tessellation pattern on a canvas
 *
 * @param ctx - The canvas 2D context to draw on
 * @param sourceCtx - The context containing the source image to sample colors from
 * @param width - The width of the canvas/image
 * @param height - The height of the canvas/image
 * @param squareSize - The size of each square
 * @param getColor - Function to determine the color for each square
 */
export function drawSquareTessellation(
  ctx: CanvasRenderingContext2D,
  sourceCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  squareSize: number,
  getColor: (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => string,
): void {
  for (let y = 0; y < height; y += squareSize) {
    for (let x = 0; x < width; x += squareSize) {
      const x1 = x;
      const y1 = y;
      const x2 = Math.min(x + squareSize, width);
      const y2 = Math.min(y + squareSize, height);

      ctx.beginPath();
      ctx.rect(x1, y1, x2 - x1, y2 - y1);
      ctx.closePath();
      ctx.fillStyle = getColor(sourceCtx, x1, y1, x2 - x1, y2 - y1);
      ctx.fill();
    }
  }
}

/**
 * Generates a triangular tessellation pattern on a canvas
 *
 * @param ctx - The canvas 2D context to draw on
 * @param sourceCtx - The context containing the source image to sample colors from
 * @param width - The width of the canvas/image
 * @param height - The height of the canvas/image
 * @param triangleSize - The size parameter for the triangles
 * @param getColor - Function to determine the color for each triangle
 */
export function drawTriangleTessellation(
  ctx: CanvasRenderingContext2D,
  sourceCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  triangleSize: number,
  getColor: (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => string,
): void {
  for (let y = 0; y < height; y += triangleSize) {
    for (let x = 0; x < width; x += triangleSize) {
      const x1 = x;
      const y1 = y;
      const x2 = Math.min(x + triangleSize, width);
      const y2 = Math.min(y + triangleSize, height);

      // Upper-left triangle
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y1);
      ctx.lineTo(x1, y2);
      ctx.closePath();
      ctx.fillStyle = getColor(
        sourceCtx,
        x1,
        y1,
        Math.ceil((x2 - x1) / 2),
        Math.ceil((y2 - y1) / 2),
      );
      ctx.fill();

      // Lower-right triangle
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2, y1);
      ctx.lineTo(x1, y2);
      ctx.closePath();
      ctx.fillStyle = getColor(
        sourceCtx,
        x1 + Math.floor((x2 - x1) / 2),
        y1 + Math.floor((y2 - y1) / 2),
        Math.ceil((x2 - x1) / 2),
        Math.ceil((y2 - y1) / 2),
      );
      ctx.fill();
    }
  }
}

/**
 * Generates a triangle-in-triangle tessellation pattern on a canvas
 *
 * @param ctx - The canvas 2D context to draw on
 * @param sourceCtx - The context containing the source image to sample colors from
 * @param width - The width of the canvas/image
 * @param height - The height of the canvas/image
 * @param triangleSize - The size parameter for the triangles
 * @param getColor - Function to determine the color for each triangle
 */
export function drawTriangleInTriangleTessellation(
  ctx: CanvasRenderingContext2D,
  sourceCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  triangleSize: number,
  getColor: (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => string,
): void {
  for (let y = 0; y < height; y += triangleSize) {
    for (let x = 0; x < width; x += triangleSize) {
      const x1 = x;
      const y1 = y;
      const x2 = Math.min(x + triangleSize, width);
      const y2 = Math.min(y + triangleSize, height);

      // Set inner triangle scale (fraction of outer triangle)
      const innerScale = 0.5; // 50% size

      // Draw upper-left outer triangle
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y1);
      ctx.lineTo(x1, y2);
      ctx.closePath();
      ctx.fillStyle = getColor(
        sourceCtx,
        x1,
        y1,
        Math.ceil((x2 - x1) / 2),
        Math.ceil((y2 - y1) / 2),
      );
      ctx.fill();

      // Draw upper-left inner triangle - same orientation, smaller
      const innerX1 = x1 + ((x2 - x1) * (1 - innerScale)) / 2;
      const innerY1 = y1 + ((y2 - y1) * (1 - innerScale)) / 2;
      ctx.beginPath();
      ctx.moveTo(innerX1, innerY1);
      ctx.lineTo(innerX1 + (x2 - x1) * innerScale, innerY1);
      ctx.lineTo(innerX1, innerY1 + (y2 - y1) * innerScale);
      ctx.closePath();
      ctx.fillStyle = getColor(
        sourceCtx,
        Math.floor(x1 + (x2 - x1) * 0.25),
        Math.floor(y1 + (y2 - y1) * 0.25),
        Math.ceil((x2 - x1) * 0.25),
        Math.ceil((y2 - y1) * 0.25),
      );
      ctx.fill();

      // Draw lower-right outer triangle
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2, y1);
      ctx.lineTo(x1, y2);
      ctx.closePath();
      ctx.fillStyle = getColor(
        sourceCtx,
        x1 + Math.floor((x2 - x1) / 2),
        y1 + Math.floor((y2 - y1) / 2),
        Math.ceil((x2 - x1) / 2),
        Math.ceil((y2 - y1) / 2),
      );
      ctx.fill();

      // Draw lower-right inner triangle - same orientation, smaller
      const innerX2 = x2 - ((x2 - x1) * (1 - innerScale)) / 2;
      const innerY2 = y2 - ((y2 - y1) * (1 - innerScale)) / 2;
      ctx.beginPath();
      ctx.moveTo(innerX2, innerY2);
      ctx.lineTo(innerX2, innerY2 - (y2 - y1) * innerScale);
      ctx.lineTo(innerX2 - (x2 - x1) * innerScale, innerY2);
      ctx.closePath();
      ctx.fillStyle = getColor(
        sourceCtx,
        Math.floor(x1 + (x2 - x1) * 0.75),
        Math.floor(y1 + (y2 - y1) * 0.75),
        Math.ceil((x2 - x1) * 0.25),
        Math.ceil((y2 - y1) * 0.25),
      );
      ctx.fill();
    }
  }
}
