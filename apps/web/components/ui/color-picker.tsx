/**
 * ColorPicker Component
 *
 * A reusable color picker component that displays a colored circle and triggers
 * the browser's native color picker when clicked. This component hides the default
 * browser color input (which can have inconsistent styling) and replaces it with
 * a clean, customizable circle UI.
 */
import React from 'react';

/**
 * Props for the ColorPicker component
 * @interface ColorPickerProps
 * @property {string} color - The current color value (hex, rgb, etc.)
 * @property {function} onChange - Callback function that receives the new color when changed
 * @property {string} [className] - Optional additional CSS classes for the container
 * @property {number} [size] - Size of the color circle in pixels (default: 32)
 * @property {boolean} [disabled] - Whether the color picker is disabled (default: false)
 * @property {string} [ariaLabel] - Accessibility label for screen readers (default: 'Color picker')
 */
interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  className?: string;
  size?: number;
  disabled?: boolean;
  ariaLabel?: string;
}

/**
 * ColorPicker Component
 * Renders a circular color swatch that opens the native color picker when clicked
 */
export const ColorPicker = ({
  color,
  onChange,
  className = '',
  size = 32,
  disabled = false,
  ariaLabel = 'Color picker',
}: ColorPickerProps) => {
  return (
    <div className={`relative ${className}`}>
      {/* Visible color circle that users interact with */}
      <div
        className={`rounded-full cursor-pointer border-2 border-gray-300 hover:border-chart-4 transition-colors duration-150 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        style={{
          backgroundColor: color,
          width: `${size}px`,
          height: `${size}px`,
        }}
        onClick={(e) => {
          if (disabled) return;
          // Trigger the hidden input when the div is clicked
          const input = e.currentTarget.nextSibling as HTMLElement;
          input.click();
        }}
      />
      {/* Hidden native color input that does the actual color selection */}
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={ariaLabel}
        className="absolute top-0 left-0 opacity-0 w-0 h-0"
      />
    </div>
  );
};
