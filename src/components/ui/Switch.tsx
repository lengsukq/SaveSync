import { InputHTMLAttributes, forwardRef } from 'react';

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className = '', label, description, id, checked, ...props }, ref) => {
    const switchId = id || `switch-${Math.random().toString(36).substr(2, 9)}`;
    
    return (
      <div className="flex items-start gap-3">
        <div className="relative inline-flex items-center">
          <input
            ref={ref}
            type="checkbox"
            id={switchId}
            checked={checked}
            className="sr-only peer"
            {...props}
          />
          <label
            htmlFor={switchId}
            className={`
              relative w-11 h-6 rounded-full cursor-pointer transition-colors duration-200
              ${checked ? 'bg-[#007AFF]' : 'bg-[#d2d2d7]'}
              peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#007AFF] peer-focus:ring-offset-2
            `}
          >
            <span
              className={`
                absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm
                transition-transform duration-200 ease-in-out
                ${checked ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </label>
        </div>
        {(label || description) && (
          <div className="flex-1">
            {label && (
              <label htmlFor={switchId} className="block text-sm font-medium text-[#1d1d1f] cursor-pointer">
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-[#86868b] font-medium mt-0.5">{description}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Switch.displayName = 'Switch';
