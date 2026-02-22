import React from 'react';

export const CRTOverlay: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="crt-overlay" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div className="screen-grid" />
      {children}
    </div>
  );
};
