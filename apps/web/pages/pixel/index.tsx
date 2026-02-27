import React, { useRef, useState } from 'react';

import { PageLayout } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  getAverageColor,
  getClosestPaletteColor,
  getDominantColor,
} from '@/lib/color-utils';
import {
  drawHexagonTessellation,
  drawSquareTessellation,
  drawTriangleInTriangleTessellation,
  drawTriangleTessellation,
} from '@/lib/tessellation';

// Define shape type
export type ShapeType =
  | 'triangle'
  | 'square'
  | 'hexagon'
  | 'triangleInTriangle';

const SHAPES: Array<{ label: string; value: ShapeType }> = [
  { label: 'Triangle', value: 'triangle' },
  { label: 'Square', value: 'square' },
  { label: 'Hexagon', value: 'hexagon' },
  { label: 'Triangle in Triangle', value: 'triangleInTriangle' },
];

const PixelTrianglePage = () => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [shape, setShape] = useState<ShapeType>('triangle');
  const [triangleSize, setTriangleSize] = useState<number>(40);
  const [isDragging, setIsDragging] = useState(false);
  const [originalFilename, setOriginalFilename] = useState<string>('image');
  const [palette, setPalette] = useState<string[]>(['#000000', '#ffffff']); // Default 2 colors
  const [useDominantColor, setUseDominantColor] = useState<boolean>(false);
  const [usePalette, setUsePalette] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setImgSrc(ev.target?.result as string);
      setOriginalFilename(file.name.split('.').slice(0, -1).join('.'));
    };
    reader.readAsDataURL(file);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processImageFile(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a temporary link element
    const link = document.createElement('a');

    try {
      // Get the canvas data as a data URL
      // Set the link's href to the canvas data
      link.href = canvas.toDataURL('image/png');

      // Set the filename for the download
      link.download = `${originalFilename}-${shape}-${triangleSize}.png`;

      // Append to the body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading image:', err);
    }
  };

  const handlePaletteChange = (index: number, color: string) => {
    setPalette((prev) => {
      const updated = [...prev];
      updated[index] = color;
      return updated;
    });
  };

  const handleAddColor = () => {
    if (palette.length < 8) {
      setPalette((prev) => [...prev, '#000000']);
    }
  };

  const handleRemoveColor = (index: number) => {
    if (palette.length > 1) {
      setPalette((prev) => prev.filter((_, i) => i !== index));
    }
  };

  React.useEffect(() => {
    if (!imgSrc) return;
    const img = new window.Image();
    img.src = imgSrc;
    img.onload = () => {
      const hiddenCanvas = hiddenCanvasRef.current;
      const canvas = canvasRef.current;
      if (!hiddenCanvas || !canvas) return;
      hiddenCanvas.width = img.width;
      hiddenCanvas.height = img.height;
      canvas.width = img.width;
      canvas.height = img.height;
      const hctx = hiddenCanvas.getContext('2d');
      const ctx = canvas.getContext('2d');
      if (!hctx || !ctx) return;
      hctx.drawImage(img, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Color function that respects both palette toggle and dominant color toggle
      const getRegionColor = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
      ) => {
        // Get the base color using either average or dominant method
        const baseColor = useDominantColor
          ? getDominantColor(ctx, x, y, w, h)
          : getAverageColor(ctx, x, y, w, h);

        // Apply palette quantization if palette mode is enabled
        return usePalette
          ? getClosestPaletteColor(baseColor, palette)
          : baseColor;
      };

      if (shape === 'triangle') {
        drawTriangleTessellation(
          ctx,
          hctx,
          img.width,
          img.height,
          triangleSize,
          getRegionColor,
        );
      } else if (shape === 'square') {
        drawSquareTessellation(
          ctx,
          hctx,
          img.width,
          img.height,
          triangleSize,
          getRegionColor,
        );
      } else if (shape === 'hexagon') {
        drawHexagonTessellation(
          ctx,
          hctx,
          img.width,
          img.height,
          triangleSize,
          getRegionColor,
        );
      } else if (shape === 'triangleInTriangle') {
        drawTriangleInTriangleTessellation(
          ctx,
          hctx,
          img.width,
          img.height,
          triangleSize,
          getRegionColor,
        );
      }
    };
  }, [imgSrc, shape, triangleSize, palette, useDominantColor, usePalette]);

  return (
    <PageLayout
      title="Image Pixelation"
      description="Transform your images using various geometric patterns"
      maxWidth="7xl"
    >
      <div className="pb-4">
        {/* Shape selection radio group */}
        <div className="mb-6">
          <p className="text-sm font-medium text-foreground mb-3">
            Choose a pattern:
          </p>
          <RadioGroup
            value={shape}
            onValueChange={(value) => setShape(value as ShapeType)}
          >
            <div className="flex flex-wrap gap-3">
              {SHAPES.map((s) => (
                <RadioGroupItem key={s.value} value={s.value}>
                  {s.label}
                </RadioGroupItem>
              ))}
            </div>
          </RadioGroup>
        </div>

        <div className="mb-4 w-full md:w-1/2">
          <label className="block text-sm font-medium text-foreground mb-2">
            Pixelation Level: {triangleSize}
          </label>
          <input
            type="range"
            min="10"
            max="100"
            value={triangleSize}
            onChange={(e) => setTriangleSize(Number(e.target.value))}
            className="w-full appearance-none cursor-pointer bg-transparent
              [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[oklch(0.62_0.14_222_/_30%)]
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-[var(--accent-color)] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:-mt-[7px]
              [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-[oklch(0.62_0.14_222_/_30%)] [&::-moz-range-track]:border-0
              [&::-moz-range-thumb]:bg-[var(--accent-color)] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full"
          />
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer mb-6"
          ref={fileInputRef}
          style={{ display: 'none' }}
        />

        {/* Palette color selection */}
        <div className="my-4">
          <h3 className="font-semibold mb-2">Palette (up to 8 colors)</h3>
          <div className="flex flex-wrap gap-2 items-center">
            {palette.map((color, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <ColorPicker
                  color={color}
                  onChange={(newColor) => handlePaletteChange(idx, newColor)}
                  ariaLabel={`Palette color ${idx + 1}`}
                />
                {palette.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveColor(idx)}
                    className="ml-1 px-2 py-1 rounded-full border-2 border-border hover:border-chart-4 hover:text-chart-4 transition-colors text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-chart-4"
                    aria-label="Remove color"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {palette.length < 8 && (
            <Button
              onClick={handleAddColor}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              + Add Color
            </Button>
          )}
        </div>

        {/* Toggle for dominant/average color */}
        <div className="mb-4">
          <div className="flex items-center">
            <input
              id="dominant-color-toggle"
              type="checkbox"
              className="h-4 w-4 rounded border-border text-chart-4 focus:ring-chart-4"
              checked={useDominantColor}
              onChange={(e) => setUseDominantColor(e.target.checked)}
            />
            <label
              htmlFor="dominant-color-toggle"
              className="ml-2 block text-sm font-medium text-foreground"
            >
              Use dominant color (instead of average)
            </label>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Dominant color detects the most common color in each region, which
            can produce more vibrant results.
          </p>
        </div>

        {/* Toggle for palette mode */}
        <div className="mb-4">
          <div className="flex items-center">
            <input
              id="palette-mode-toggle"
              type="checkbox"
              className="h-4 w-4 rounded border-border text-chart-4 focus:ring-chart-4"
              checked={usePalette}
              onChange={(e) => setUsePalette(e.target.checked)}
            />
            <label
              htmlFor="palette-mode-toggle"
              className="ml-2 block text-sm font-medium text-foreground"
            >
              Enable palette mode
            </label>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            When enabled, the image will be processed using the selected color
            palette.
          </p>
        </div>

        {/* Image display section */}
        <div style={{ marginTop: 16 }}>
          <div className="flex flex-col md:flex-row md:items-center">
            {/* Original image display */}
            <div
              className="w-full md:w-1/2 flex flex-col items-center mb-4 md:mb-0"
              style={{ paddingRight: 0 }}
            >
              <div
                className={`flex justify-center items-center w-full h-[300px] md:h-[400px] border ${
                  isDragging
                    ? 'border-chart-4 bg-chart-4/10'
                    : 'border-border'
                } transition-colors duration-200 cursor-pointer`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
              >
                {imgSrc ? (
                  // Image component is for preview, never loads from any server
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgSrc}
                    alt="Original"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '300px',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <div className="text-muted-foreground flex flex-col items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                      ></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <p className="mt-2">
                      {isDragging
                        ? 'Drop image here'
                        : 'Upload an image (drag and drop or click here)'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Transformed image display */}
            <div
              className="w-full md:w-1/2 flex flex-col items-center"
              style={{ paddingLeft: 0 }}
            >
              <div className="flex justify-center items-center w-full h-[300px] md:h-[400px] border border-border">
                <canvas
                  ref={canvasRef}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '300px',
                    objectFit: 'contain',
                  }}
                />
              </div>
            </div>
          </div>
          {/* Hidden canvas for processing */}
          <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />
        </div>

        {/* Download button */}
        <div className="flex justify-center md:justify-end mt-4">
          <Button onClick={handleDownloadImage}>Download Image</Button>
        </div>
      </div>
    </PageLayout>
  );
};

export default PixelTrianglePage;
