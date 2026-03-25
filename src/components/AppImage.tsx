import type { CSSProperties, ImgHTMLAttributes } from 'react';

type AppImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean;
  unoptimized?: boolean;
  priority?: boolean;
};

export default function AppImage({
  alt,
  fill = false,
  unoptimized,
  priority,
  className,
  style,
  ...props
}: AppImageProps) {
  void unoptimized;
  void priority;

  const fillStyle: CSSProperties = fill
    ? {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        ...style
      }
    : { ...style };

  const fillClassName = fill
    ? ['absolute', 'inset-0', 'w-full', 'h-full', className].filter(Boolean).join(' ')
    : className;

  return <img alt={alt} className={fillClassName} style={fillStyle} {...props} />;
}
