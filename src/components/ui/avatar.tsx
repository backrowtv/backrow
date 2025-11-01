"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: "tiny" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
  /** Custom icon for default avatar (letter, emoji, or React element) */
  defaultAvatarIcon?: string | React.ReactNode;
  /** Custom background color for default avatar (CSS color value) */
  defaultAvatarColor?: string;
  /** Custom border color for default avatar (CSS color value) */
  defaultAvatarBorderColor?: string;
  /** Use branded primary border for uploaded photos (founder accounts) */
  useBrandedBorder?: boolean;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      className,
      src,
      alt,
      fallback,
      size = "md",
      defaultAvatarIcon,
      defaultAvatarColor,
      defaultAvatarBorderColor,
      useBrandedBorder,
      ...props
    },
    ref
  ) => {
    // Track image load errors to gracefully fallback to emoji/letter avatar
    const [imageError, setImageError] = React.useState(false);

    // Reset error state when src changes (e.g., user uploads new avatar)
    React.useEffect(() => {
      setImageError(false);
    }, [src]);

    // Size classes
    const sizeClasses = {
      tiny: "h-5 w-5 text-[8px]", // 20px
      xs: "h-7 w-7 text-[10px]", // 28px
      sm: "h-9 w-9 text-xs", // 36px
      md: "h-11 w-11 text-sm", // 44px
      lg: "h-14 w-14 text-base", // 56px
      xl: "h-[72px] w-[72px] text-lg", // 72px
      xxl: "h-28 w-28 text-xl", // 112px
    };

    // Legacy emoji size classes — kept for any remaining string icons
    const emojiSizeClasses = {
      tiny: "text-xs",
      xs: "text-sm",
      sm: "text-base",
      md: "text-lg",
      lg: "text-2xl",
      xl: "text-3xl",
      xxl: "text-4xl",
    };

    // Border width scales with size
    const borderWidths = {
      tiny: "1.5px",
      xs: "2px",
      sm: "2.5px",
      md: "3px",
      lg: "3.5px",
      xl: "4px",
      xxl: "5px",
    };

    const getInitials = (name?: string) => {
      if (!name) return "?";
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    };

    // Check if icon is a React element (SVG, etc.)
    const isReactElement = React.isValidElement(defaultAvatarIcon);

    // Check if icon is an emoji (multi-char unicode string)
    const isEmoji = typeof defaultAvatarIcon === "string" && defaultAvatarIcon.length > 1;

    // Determine display content
    const displayContent = defaultAvatarIcon || fallback || getInitials(alt);

    // Use custom color if provided, otherwise default styling
    const hasCustomAvatar = defaultAvatarIcon && defaultAvatarColor;
    // Check if this is an uploaded photo (has src but no custom avatar settings)
    // Also check imageError - if the image failed to load, treat as no photo
    const hasUploadedPhoto = Boolean(src) && !imageError;

    // Determine the style to apply
    const getAvatarStyle = () => {
      // Uploaded photos: custom border if provided, branded for founder, gray default
      if (hasUploadedPhoto) {
        const borderColor = defaultAvatarBorderColor
          ? defaultAvatarBorderColor
          : useBrandedBorder
            ? "var(--primary)"
            : "hsl(0, 0%, 50%)";
        return {
          backgroundColor: "var(--surface-2)",
          border: `${borderWidths[size]} solid ${borderColor}`,
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
        };
      }

      // Custom generated avatars (icon + color)
      if (hasCustomAvatar) {
        return {
          backgroundColor: defaultAvatarColor,
          color: "white",
          border: defaultAvatarBorderColor
            ? `${borderWidths[size]} solid ${defaultAvatarBorderColor}`
            : `${borderWidths[size]} solid transparent`,
          backgroundImage: defaultAvatarBorderColor
            ? undefined
            : `
              linear-gradient(${defaultAvatarColor}, ${defaultAvatarColor}),
              linear-gradient(
                145deg,
                rgba(255, 255, 255, 0.6) 0%,
                rgba(180, 175, 170, 0.4) 50%,
                rgba(100, 95, 90, 0.5) 100%
              )
            `,
          backgroundOrigin: defaultAvatarBorderColor ? undefined : "border-box",
          backgroundClip: defaultAvatarBorderColor ? undefined : "padding-box, border-box",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
        };
      }

      // Default fallback avatar (no image, no custom settings)
      return {
        backgroundColor: "var(--surface-2)",
        color: "var(--text-primary)",
        // 3D border: gradient from light (top-left) to dark (bottom-right)
        border: `${borderWidths[size]} solid transparent`,
        backgroundImage: `
            linear-gradient(var(--surface-2), var(--surface-2)),
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.6) 0%,
              rgba(180, 175, 170, 0.4) 50%,
              rgba(100, 95, 90, 0.5) 100%
            )
          `,
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
        // Subtle shadow for depth
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
      };
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative inline-flex flex-shrink-0 items-center justify-center rounded-full font-medium overflow-hidden",
          "transition-all duration-200 ease-in-out",
          "hover:scale-105",
          sizeClasses[size],
          className
        )}
        style={getAvatarStyle()}
        {...props}
      >
        {/* Image - only render if src exists and hasn't errored */}
        {src && !imageError && (
          // eslint-disable-next-line @next/next/no-img-element -- Using img for onError handler support
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        )}

        {/* Fallback content (initials, letter, emoji, or React element) - show when no src or image failed */}
        {(!src || imageError) &&
          (isReactElement ? (
            <span className="relative z-10 flex items-center justify-center">{displayContent}</span>
          ) : (
            <span
              className={cn(
                "relative z-10 max-w-full overflow-hidden",
                isEmoji && emojiSizeClasses[size]
              )}
            >
              {displayContent}
            </span>
          ))}

        {/* Glossy glass overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              linear-gradient(
                135deg, 
                rgba(255, 255, 255, 0.3) 0%, 
                rgba(255, 255, 255, 0.08) 35%,
                rgba(255, 255, 255, 0) 60%
              )
            `,
          }}
          aria-hidden="true"
        />
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar };
