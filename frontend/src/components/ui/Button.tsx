import React from 'react';
import { cn } from '../../lib/utils'; // Import from utils

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'; // Added ghost
    size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
        const variants = {
            primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20',
            secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
            danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-600/20',
            outline: 'border border-slate-300 bg-transparent hover:bg-slate-50 text-slate-700',
            ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-xs font-medium',
            md: 'px-4 py-2 text-sm font-medium',
            lg: 'px-6 py-3 text-base font-medium',
        };

        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';
