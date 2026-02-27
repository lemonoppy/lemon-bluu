import { createCanvas, loadImage } from 'canvas';
import sharp from 'sharp';
import { logger } from 'src/lib/logger';

export interface CardPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculate card positions for a 3x5 grid layout
 * @param imageWidth Total image width
 * @param imageHeight Total image height
 * @returns Array of card positions
 */
export const calculateCardPositions = (imageWidth: number, imageHeight: number): CardPosition[] => {
  const positions: CardPosition[] = [];
  const cols = 5;
  const rows = 3;

  // Calculate individual card dimensions
  const cardWidth = imageWidth / cols;
  const cardHeight = imageHeight / rows;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      positions.push({
        x: col * cardWidth,
        y: row * cardHeight,
        width: cardWidth,
        height: cardHeight
      });
    }
  }

  return positions;
};

/**
 * Process an image by downloading it and greying out a random card
 * @param imageUrl The URL of the original image
 * @returns Buffer containing the processed image data
 */
export const processPackImage = async (imageUrl: string): Promise<Buffer> => {
  try {
    logger.info(`Processing pack image from: ${imageUrl}`);

    // Import axios dynamically
    const axios = await import('axios');

    // Download the image with proper error handling
    const response = await axios.default.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DiscordBot/1.0)',
        'Accept': 'image/png,image/jpeg,image/jpg,image/gif,image/webp,*/*'
      },
      timeout: 15000,
      maxRedirects: 5
    });

    logger.info(`Downloaded image: ${response.status} ${response.statusText}, Content-Type: ${response.headers['content-type']}, Size: ${response.data.byteLength} bytes`);

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}: Failed to download image`);
    }

    if (response.data.byteLength === 0) {
      throw new Error('Downloaded image is empty');
    }

    // Check if it's actually an image by examining the first few bytes
    const buffer = Buffer.from(response.data);
    const header = buffer.toString('hex', 0, 12); // Extended to 12 bytes for WebP
    logger.info(`Image header (hex): ${header}`);

    // PNG signature: 89504E47
    // JPEG signature: FFD8FF
    // GIF signature: 474946
    // WebP signature: 52494646...57454250 (RIFF....WEBP)
    const isValidImage = header.startsWith('89504e47') || // PNG
                        header.startsWith('ffd8ff') ||   // JPEG
                        header.startsWith('474946') ||   // GIF
                        (header.startsWith('52494646') && buffer.toString('ascii', 8, 12) === 'WEBP'); // WebP

    if (!isValidImage) {
      // It might be HTML error page, log first 200 chars
      const textContent = buffer.toString('utf8', 0, Math.min(200, buffer.length));
      logger.error(`Not an image! Content starts with: ${textContent}`);
      throw new Error('URL did not return a valid image');
    }

    logger.info('Valid image format detected');

    // Convert WebP to PNG if needed, since Canvas doesn't support WebP
    let imageBuffer = buffer;
    if (header.startsWith('52494646') && buffer.toString('ascii', 8, 12) === 'WEBP') {
      logger.info('Converting WebP to PNG for Canvas compatibility');
      imageBuffer = await sharp(buffer).png().toBuffer();
    }

    // Load the image from buffer
    const originalImage = await loadImage(imageBuffer);
    const { width, height } = originalImage;

    // Create canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Draw the original image
    ctx.drawImage(originalImage, 0, 0);

    // Calculate card positions for 3x5 grid
    const cardPositions = calculateCardPositions(width, height);

    // Select a random card to grey out (avoid the middle card for better visual impact)
    const availablePositions = cardPositions.filter((_, index) => index !== 7); // Avoid center card (index 7 in 3x5 grid)
    const randomCardIndex = Math.floor(Math.random() * availablePositions.length);
    const selectedCard = availablePositions[randomCardIndex];

    // Create a smaller, centered darkened area on the selected card
    ctx.save();

    // Calculate smaller, centered area (90% of card size)
    const shrinkFactor = 0.97;
    const smallerWidth = selectedCard.width * shrinkFactor;
    const smallerHeight = selectedCard.height * shrinkFactor;
    const offsetX = (selectedCard.width - smallerWidth) / 2;
    const offsetY = (selectedCard.height - smallerHeight) / 2;

    const darkenedArea = {
      x: selectedCard.x + offsetX,
      y: selectedCard.y + offsetY,
      width: smallerWidth,
      height: smallerHeight
    };

    // Clip to the smaller darkened area
    ctx.rect(darkenedArea.x, darkenedArea.y, darkenedArea.width, darkenedArea.height);
    ctx.clip();

    // Apply fully opaque black square
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0, 0, 0, 1.0)'; // Fully opaque black
    ctx.fillRect(darkenedArea.x, darkenedArea.y, darkenedArea.width, darkenedArea.height);

    ctx.restore();

    logger.info(`Successfully greyed out card at position (${selectedCard.x}, ${selectedCard.y})`);

    // Return the processed image as PNG buffer
    return canvas.toBuffer('image/png');

  } catch (error) {
    logger.error('Error processing pack image:', error);
    throw error;
  }
};