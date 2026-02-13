import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const ButtonWithFeedback = React.forwardRef(({ 
  className, 
  variant, 
  size, 
  children,
  withRipple = true,
  withScale = true,
  disabled,
  onClick,
  ...props 
}, ref) => {
  const [ripples, setRipples] = React.useState([]);

  const handleClick = (e) => {
    if (disabled) return;

    if (withRipple) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newRipple = {
        x,
        y,
        id: Date.now()
      };

      setRipples(prev => [...prev, newRipple]);

      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 600);
    }

    if (navigator.vibrate) {
      navigator.vibrate(10);
    }

    if (onClick) onClick(e);
  };

  const Component = withScale ? motion.button : "button";
  const motionProps = withScale ? {
    whileTap: { scale: 0.95 },
    whileHover: { scale: 1.02 }
  } : {};

  return (
    <Component
      className={cn(buttonVariants({ variant, size, className }), "relative overflow-hidden")}
      ref={ref}
      disabled={disabled}
      onClick={handleClick}
      {...motionProps}
      {...props}
    >
      {children}
      
      {withRipple && ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 pointer-events-none animate-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0
          }}
        />
      ))}
    </Component>
  );
});

ButtonWithFeedback.displayName = "ButtonWithFeedback";

export { ButtonWithFeedback };