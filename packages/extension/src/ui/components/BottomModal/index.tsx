import React, { useEffect, useState } from 'react';

export const BottomModal = ({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    if (!onClose) return;

    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div
      className="popover-container"
      style={{
        backgroundColor: 'rgba(var(--color-background-rgb), 0.5)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        transition: 'background-color 0.3s ease',
        opacity: isVisible ? 1 : 0
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          handleClose();
        }
      }}>
      <div
        style={{
          backgroundColor: 'var(--color-background)',
          width: '100%',
          padding: 20,
          borderRadius: '15px 15px 0 0',
          position: 'fixed',
          bottom: 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s ease-out'
        }}>
        {children}
      </div>
    </div>
  );
};
