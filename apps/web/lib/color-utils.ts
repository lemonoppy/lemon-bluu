/**
 * Color conversion and processing utilities
 * Includes functions for RGB to CIELAB conversion, color matching, and dominant color detection
 */

/**
 * Calculate the average color of a region in the canvas
 *
 * @param ctx - Canvas context containing the image data
 * @param x - X coordinate of the top left corner of the region
 * @param y - Y coordinate of the top left corner of the region
 * @param w - Width of the region
 * @param h - Height of the region
 * @returns The average color as an RGBA string
 */
export function getAverageColor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): string {
  // Get pixel data from the specified region
  const imageData = ctx.getImageData(x, y, w, h);
  let r = 0,
    g = 0,
    b = 0,
    a = 0,
    count = 0;

  // Sum up all RGBA values from each pixel in the region
  for (let i = 0; i < imageData.data.length; i += 4) {
    r += imageData.data[i]; // Red
    g += imageData.data[i + 1]; // Green
    b += imageData.data[i + 2]; // Blue
    a += imageData.data[i + 3]; // Alpha
    count++;
  }

  // Return the average color as an RGBA string
  return `rgba(${Math.round(r / count)},${Math.round(g / count)},${Math.round(
    b / count,
  )},${(a / count / 255).toFixed(3)})`;
}

/**
 * Parse a color string (hex or RGB) into RGB component values
 *
 * @param color - Color string in hex (#RRGGBB) or rgb(r,g,b) format
 * @returns An array containing [red, green, blue] values (0-255)
 */
export function parseColorToRGB(color: string): [number, number, number] {
  if (color.startsWith('#')) {
    // Handle hex color format
    let hex = color.replace('#', '');
    // Convert shorthand hex (#RGB) to full format (#RRGGBB) if needed
    if (hex.length === 3)
      hex = hex
        .split('')
        .map((x) => x + x)
        .join('');
    const num = parseInt(hex, 16);
    // Extract R, G, B components from the hex number
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  } else if (color.startsWith('rgba') || color.startsWith('rgb')) {
    // Handle rgb/rgba color format
    const vals = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
    return [vals[0], vals[1], vals[2]];
  }
  // Default return for unrecognized formats
  return [0, 0, 0];
}

/**
 * Find the closest color from a palette to a given color
 * Uses perceptual CIELAB color space for accurate matching
 *
 * @param color - The color to match against the palette
 * @param palette - Array of colors to choose from
 * @returns The closest matching color from the palette
 */
export function getClosestPaletteColor(
  color: string,
  palette: string[],
): string {
  // Parse the input color to RGB components
  const [r1, g1, b1] = parseColorToRGB(color);

  // Convert RGB to LAB for perceptual color matching
  const lab1 = rgbToLab(r1, g1, b1);

  let minDist = Infinity;
  let closest = palette[0];

  // Find the palette color with minimum perceptual distance
  for (const p of palette) {
    const [r2, g2, b2] = parseColorToRGB(p);
    const lab2 = rgbToLab(r2, g2, b2);

    // Calculate Delta E (perceptual color difference)
    const dist = deltaE(lab1, lab2);

    if (dist < minDist) {
      minDist = dist;
      closest = p;
    }
  }
  return closest;
}

/**
 * Get the quantized color for a region of the canvas
 * Combines color calculation with palette matching
 *
 * @param ctx - Canvas context containing the image data
 * @param x - X coordinate of the top left corner of the region
 * @param y - Y coordinate of the top left corner of the region
 * @param w - Width of the region
 * @param h - Height of the region
 * @param palette - Array of colors to use for quantization
 * @param useDominant - Whether to use dominant color detection (true) or average color (false)
 * @returns The closest color from the palette to the color of the region
 */
export function getQuantizedColor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  palette: string[],
  useDominant: boolean = false,
): string {
  // Get the color of the region using either the dominant or average method
  const color = useDominant
    ? getDominantColor(ctx, x, y, w, h)
    : getAverageColor(ctx, x, y, w, h);

  // Find the closest matching color in the palette
  return getClosestPaletteColor(color, palette);
}

/**
 * Calculate the dominant color of a region in the canvas
 * Uses CIELAB color space for perceptually accurate clustering
 *
 * @param ctx - Canvas context containing the image data
 * @param x - X coordinate of the top left corner of the region
 * @param y - Y coordinate of the top left corner of the region
 * @param w - Width of the region
 * @param h - Height of the region
 * @returns The dominant color as an RGBA string
 */
export function getDominantColor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): string {
  // Get pixel data from the specified region
  const imageData = ctx.getImageData(x, y, w, h);
  const colorMap: Record<
    string,
    { count: number; r: number; g: number; b: number }
  > = {};
  const labMap: Record<string, [number, number, number]> = {}; // Store LAB values for each key

  // LAB perceptual tolerance - smaller values will result in more precise colors
  const tolerance = 5; // Perceptual tolerance in LAB space

  // Process each pixel
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    const a = imageData.data[i + 3];

    // Skip transparent pixels
    if (a < 128) continue;

    // Convert to LAB color space
    const lab = rgbToLab(r, g, b);

    // Quantize LAB colors by rounding to nearest tolerance value
    const quantizedL = Math.round(lab[0] / tolerance) * tolerance;
    const quantizedA = Math.round(lab[1] / tolerance) * tolerance;
    const quantizedB = Math.round(lab[2] / tolerance) * tolerance;

    // Create a key for this color
    const key = `${quantizedL},${quantizedA},${quantizedB}`;

    // Store LAB values for this key if we haven't seen it before
    if (!labMap[key]) {
      labMap[key] = [quantizedL, quantizedA, quantizedB];
    }

    // Count this color
    if (!colorMap[key]) {
      colorMap[key] = { count: 0, r, g, b };
    }

    colorMap[key].count++;

    // We accumulate RGB values for this quantized LAB group to calculate average later
    // This combines the perceptual accuracy of LAB for grouping with accurate RGB representation
    const entry = colorMap[key];
    entry.r = (entry.r * (entry.count - 1) + r) / entry.count;
    entry.g = (entry.g * (entry.count - 1) + g) / entry.count;
    entry.b = (entry.b * (entry.count - 1) + b) / entry.count;
  }

  // Find the most common color
  let maxCount = 0;
  let dominantColor = { r: 0, g: 0, b: 0 };

  for (const [, color] of Object.entries(colorMap)) {
    if (color.count > maxCount) {
      maxCount = color.count;
      dominantColor = color;
    }
  }

  return `rgba(${Math.round(dominantColor.r)},${Math.round(dominantColor.g)},${Math.round(dominantColor.b)},1)`;
}

/**
 * Convert RGB to CIEXYZ color space
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns XYZ color values
 */
export function rgbToXyz(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  // Normalize RGB values to 0-1
  let r1 = r / 255;
  let g1 = g / 255;
  let b1 = b / 255;

  // Apply the standard RGB to linear RGB transformation
  r1 = r1 > 0.04045 ? Math.pow((r1 + 0.055) / 1.055, 2.4) : r1 / 12.92;
  g1 = g1 > 0.04045 ? Math.pow((g1 + 0.055) / 1.055, 2.4) : g1 / 12.92;
  b1 = b1 > 0.04045 ? Math.pow((b1 + 0.055) / 1.055, 2.4) : b1 / 12.92;

  // Convert to XYZ using the standard D65 matrix
  const x = r1 * 0.4124564 + g1 * 0.3575761 + b1 * 0.1804375;
  const y = r1 * 0.2126729 + g1 * 0.7151522 + b1 * 0.072175;
  const z = r1 * 0.0193339 + g1 * 0.119192 + b1 * 0.9503041;

  return [x, y, z];
}

/**
 * Convert CIEXYZ to CIELAB color space
 * @param x - X component
 * @param y - Y component
 * @param z - Z component
 * @returns LAB color values
 */
export function xyzToLab(
  x: number,
  y: number,
  z: number,
): [number, number, number] {
  // D65 reference white
  const xn = 0.95047;
  const yn = 1.0;
  const zn = 1.08883;

  // Normalize XYZ values
  let x1 = x / xn;
  let y1 = y / yn;
  let z1 = z / zn;

  // Apply the LAB transformation
  x1 = x1 > 0.008856 ? Math.pow(x1, 1 / 3) : 7.787 * x1 + 16 / 116;
  y1 = y1 > 0.008856 ? Math.pow(y1, 1 / 3) : 7.787 * y1 + 16 / 116;
  z1 = z1 > 0.008856 ? Math.pow(z1, 1 / 3) : 7.787 * z1 + 16 / 116;

  const l = 116 * y1 - 16;
  const a = 500 * (x1 - y1);
  const b = 200 * (y1 - z1);

  return [l, a, b];
}

/**
 * Convert RGB directly to CIELAB
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns LAB color values
 */
export function rgbToLab(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

/**
 * Calculate the delta E (CIE76) between two LAB colors
 * @param lab1 - First LAB color
 * @param lab2 - Second LAB color
 * @returns Delta E value representing perceptual distance
 */
export function deltaE(
  [l1, a1, b1]: [number, number, number],
  [l2, a2, b2]: [number, number, number],
): number {
  // CIE76 color difference formula
  return Math.sqrt(
    Math.pow(l2 - l1, 2) + Math.pow(a2 - a1, 2) + Math.pow(b2 - b1, 2),
  );
}
