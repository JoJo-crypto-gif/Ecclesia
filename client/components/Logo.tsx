import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  overrideSrc?: string;
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', overrideSrc }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const src = overrideSrc && overrideSrc.trim() ? overrideSrc : '/logo.png';

  return (
    <img 
      src={src} 
      alt="Logo" 
      className={`object-contain ${sizeClasses[size]} ${className}`}
    />
  );
};

export default Logo;
