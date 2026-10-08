// =============================================================================
// PORTALMAKER — Ícono Oficial de WhatsApp (SVG Vectorial)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import React from 'react'

interface WhatsAppIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string
  colorMode?: 'brand' | 'current'
}

export default function WhatsAppIcon({
  className = 'w-5 h-5',
  colorMode = 'brand',
  ...props
}: WhatsAppIconProps) {
  if (colorMode === 'current') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Burbuja verde oficial de WhatsApp (#25D366) */}
      <path
        fill="#25D366"
        d="M12.012 2C6.486 2 2 6.48 2 12.008c0 1.765.46 3.486 1.332 5.002L2 22l5.12-1.341a9.96 9.96 0 0 0 4.892 1.275h.004c5.525 0 10.012-4.482 10.012-10.01C22.028 9.27 20.985 6.784 19.08 4.88 17.177 2.977 14.688 2 12.012 2z"
      />
      {/* Auricular blanco de WhatsApp */}
      <path
        fill="#FFFFFF"
        d="M17.51 14.33c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.34.22-.64.07-.3-.15-1.27-.47-2.42-1.5-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.63-.92-2.23-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.03 1.01-1.03 2.47s1.05 2.87 1.2 3.07c.15.2 2.08 3.18 5.04 4.46.7.3 1.25.48 1.68.62.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-.42-.08-.12-.24-.12-.54-.27z"
      />
    </svg>
  )
}
export { WhatsAppIcon }
