import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';

type QRCodeProps = {
  value: string;
  size?: number;
  className?: string;
  bgColor?: string;
  fgColor?: string;
  level?: 'L' | 'M' | 'Q' | 'H';
  title?: string;
};

/**
 * QR Code component that generates QR codes for various use cases
 * such as member check-ins, sharing links, etc.
 */
export function QRCode({
  value,
  size = 128,
  className,
  bgColor = '#ffffff',
  fgColor = '#000000',
  level = 'M',
  title,
}: QRCodeProps) {
  if (!value) return null;

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <QRCodeSVG
        value={value}
        size={size}
        bgColor={bgColor}
        fgColor={fgColor}
        level={level}
        title={title}
        className="rounded-md"
      />
      {title && <p className="mt-2 text-sm text-center text-muted-foreground">{title}</p>}
    </div>
  );
} 