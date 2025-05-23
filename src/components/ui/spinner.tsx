
import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

interface SpinnerProps extends SVGProps<SVGSVGElement> {
  size?: 'small' | 'medium' | 'large';
}

export function Spinner({ className, size = 'medium', ...props }: SpinnerProps) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={cn('animate-spin text-primary', sizeClasses[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}
