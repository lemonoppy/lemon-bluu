import * as React from 'react';

import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';

import { cn } from '@/lib/utils';

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn('flex flex-wrap gap-3', className)}
      {...props}
      ref={ref}
    />
  );
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, children, value, ...props }, ref) => {
  // Create a state to track if this button is checked
  const [isChecked, setIsChecked] = React.useState(false);

  // Access the parent RadioGroup to determine if this item is selected
  const radioGroupRef = React.useRef<HTMLDivElement>(null);

  // Update checked state when RadioGroup value changes
  React.useEffect(() => {
    // Find the closest RadioGroup parent
    const radioGroup = radioGroupRef.current?.closest('div[role="radiogroup"]');
    if (!radioGroup) return;

    // Create a mutation observer to watch for attribute changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-state') {
          const isSelected =
            (mutation.target as HTMLElement).getAttribute('data-state') ===
            'checked';
          if (
            isSelected &&
            (mutation.target as HTMLElement).getAttribute('value') === value
          ) {
            setIsChecked(true);
          } else if (
            (mutation.target as HTMLElement).getAttribute('value') === value
          ) {
            setIsChecked(false);
          }
        }
      });
    });

    // Observe all radio buttons in the group
    const radioButtons = radioGroup.querySelectorAll('[role="radio"]');
    radioButtons.forEach((button) => {
      observer.observe(button, { attributes: true });

      // Set initial checked state
      if (
        button.getAttribute('data-state') === 'checked' &&
        button.getAttribute('value') === value
      ) {
        setIsChecked(true);
      }
    });

    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={radioGroupRef}>
      <RadioGroupPrimitive.Item
        ref={ref}
        value={value}
        className={cn(
          'px-4 py-2 rounded-md border text-sm font-medium cursor-pointer transition-all duration-200 flex items-center justify-center',
          isChecked
            ? 'border-chart-4 bg-chart-4/20 text-foreground shadow-sm'
            : 'border-border hover:border-chart-4/30 hover:bg-chart-4/5 text-muted-foreground',
          className,
        )}
        {...props}
      >
        {children}
      </RadioGroupPrimitive.Item>
    </div>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
