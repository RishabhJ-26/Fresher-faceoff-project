'use client';

import type { FC } from 'react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

const CustomCursor: FC = () => {
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorOutlineRef = useRef<HTMLDivElement>(null);
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);
  const [isVisible, setIsVisible] = useState(false); 
  const requestRef = useRef<number>();
  const lastMouseEventRef = useRef<MouseEvent | null>(null);
  const [lastPosition, setLastPosition] = useState<{ x: number, y: number }>({ x: -100, y: -100 });


  useEffect(() => {
    const animateOutline = () => {
      let targetX = lastPosition.x;
      let targetY = lastPosition.y;

      if (lastMouseEventRef.current) {
        targetX = lastMouseEventRef.current.clientX;
        targetY = lastMouseEventRef.current.clientY;
      }

      if (cursorOutlineRef.current) {
        const currentX = parseFloat(cursorOutlineRef.current.style.getPropertyValue('--x') || targetX.toString());
        const currentY = parseFloat(cursorOutlineRef.current.style.getPropertyValue('--y') || targetY.toString());

        const lerpFactor = 0.35; 
        const newX = currentX + (targetX - currentX) * lerpFactor;
        const newY = currentY + (targetY - currentY) * lerpFactor;

        cursorOutlineRef.current.style.setProperty('--x', newX.toString());
        cursorOutlineRef.current.style.setProperty('--y', newY.toString());
        cursorOutlineRef.current.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
      }
      requestRef.current = requestAnimationFrame(animateOutline);
    };

    requestRef.current = requestAnimationFrame(animateOutline);

    const onMouseMove = (event: MouseEvent) => {
      setIsVisible(true); 
      lastMouseEventRef.current = event;
      const { clientX, clientY } = event;
      setLastPosition({ x: clientX, y: clientY });


      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate3d(${clientX}px, ${clientY}px, 0)`;
      }

      // Initialize outline position if not already set
      if (cursorOutlineRef.current && !cursorOutlineRef.current.style.getPropertyValue('--x')) {
        cursorOutlineRef.current.style.setProperty('--x', clientX.toString());
        cursorOutlineRef.current.style.setProperty('--y', clientY.toString());
        cursorOutlineRef.current.style.transform = `translate3d(${clientX}px, ${clientY}px, 0)`;
      }

      const target = event.target as HTMLElement;
      if (target.closest('button, a, [role="button"], input, textarea, select, [data-interactive="true"]')) {
        setIsHoveringInteractive(true);
      } else {
        setIsHoveringInteractive(false);
      }
    };

    const onMouseEnterDocument = () => {
      setIsVisible(true);
    };

    const onMouseLeaveDocument = (event: MouseEvent) => {
      // Hide cursor if mouse leaves the viewport boundaries
      if (event.clientY <= 0 || event.clientX <= 0 || (event.clientX >= window.innerWidth || event.clientY >= window.innerHeight)) {
        setIsVisible(false);
      }
    };
    
    const handleFullscreenChange = () => {
      // Always ensure cursor is visible on fullscreen change, let mousemove/mouseleave handle actual visibility
      setIsVisible(true); 
      // Re-apply last known position if available to prevent cursor jump
      if (lastPosition.x !== -100 && lastPosition.y !== -100) { // Check if lastPosition is valid
          if (cursorDotRef.current) {
              cursorDotRef.current.style.transform = `translate3d(${lastPosition.x}px, ${lastPosition.y}px, 0)`;
          }
          if (cursorOutlineRef.current) {
              cursorOutlineRef.current.style.setProperty('--x', lastPosition.x.toString());
              cursorOutlineRef.current.style.setProperty('--y', lastPosition.y.toString());
              cursorOutlineRef.current.style.transform = `translate3d(${lastPosition.x}px, ${lastPosition.y}px, 0)`;
          }
      }
    };

    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseenter', onMouseEnterDocument);
    document.addEventListener('mouseleave', onMouseLeaveDocument);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    // Initial position setting for outline if lastPosition is already known (e.g. on fast refresh)
    if (cursorOutlineRef.current && lastPosition.x !== -100 && lastPosition.y !== -100) {
        if (!cursorOutlineRef.current.style.getPropertyValue('--x')) {
             cursorOutlineRef.current.style.setProperty('--x', lastPosition.x.toString());
             cursorOutlineRef.current.style.setProperty('--y', lastPosition.y.toString());
             cursorOutlineRef.current.style.transform = `translate3d(${lastPosition.x}px, ${lastPosition.y}px, 0)`;
        }
    }


    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseenter', onMouseEnterDocument);
      document.removeEventListener('mouseleave', onMouseLeaveDocument);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [lastPosition]); // isVisible removed, handle visibility through mouse events directly. Added lastPosition.

  const outlineInitialX = lastPosition.x; 
  const outlineInitialY = lastPosition.y;

  return (
    <>
      <div
        ref={cursorOutlineRef}
        className={cn(
          'fixed top-0 left-0 rounded-full pointer-events-none z-[9999]',
          'w-8 h-8 border-2',
          isHoveringInteractive ? 'scale-150 border-accent/80 opacity-80' : 'scale-100 border-primary/60 opacity-60',
          isVisible ? 'opacity-60' : 'opacity-0 scale-0', 
          'transition-transform duration-75 ease-out',
          // Ensure opacity is also controlled by isVisible for the outline
          isVisible && isHoveringInteractive ? 'opacity-80' : isVisible ? 'opacity-60' : 'opacity-0'
        )}
        style={{
             transform: `translate3d(${outlineInitialX}px, ${outlineInitialY}px, 0) scale(${isHoveringInteractive ? 1.5 : 1})`,
             // Opacity is now also handled by the className logic above
        }}
      />
      <div
        ref={cursorDotRef}
        className={cn(
          'fixed top-0 left-0 rounded-full pointer-events-none z-[9999]',
          'w-2 h-2',
          isHoveringInteractive ? 'bg-accent scale-150' : 'bg-primary scale-100',
          isVisible ? 'opacity-100' : 'opacity-0 scale-0', 
          'transition-all duration-100 ease-out' 
        )}
        style={{
            transform: `translate3d(${lastPosition.x}px, ${lastPosition.y}px, 0) scale(${isHoveringInteractive ? 1.5 : 1})`, // Use lastPosition for initial dot as well
            opacity: isVisible ? 1 : 0,
        }}
      />
    </>
  );
};

export default CustomCursor;
