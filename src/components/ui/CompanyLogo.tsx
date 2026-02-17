'use client';

import React, { useState, useEffect } from 'react';

interface CompanyLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallbackSrc?: string;
}

export default function CompanyLogo({
    fallbackSrc = '/logo.png',
    className,
    alt = 'Company Logo',
    ...props
}: CompanyLogoProps) {
    const [imgSrc, setImgSrc] = useState<string>('');
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        // Priority 1: Direct URL from Env
        const envLogoUrl = process.env.NEXT_PUBLIC_LOGO_URL;

        // Priority 2: Client Subfolder (Recommended for full branding)
        // Checks /clients/{slug}/logo.png
        const clientSlug = process.env.NEXT_PUBLIC_CLIENT_SLUG;
        const subfolderLogoUrl = clientSlug ? `/clients/${clientSlug}/logo.png` : null;

        // Priority 3: Old format (flat logos folder) - Backward compatibility
        const flatLogoUrl = clientSlug ? `/logos/${clientSlug}.png` : null;

        if (envLogoUrl) {
            setImgSrc(envLogoUrl);
        } else if (subfolderLogoUrl) {
            // We try subfolder first, logic handles fallback if 404
            setImgSrc(subfolderLogoUrl);
        } else if (flatLogoUrl) {
            setImgSrc(flatLogoUrl);
        } else {
            setImgSrc(fallbackSrc);
        }
    }, [fallbackSrc]);

    const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        if (!hasError) {
            setHasError(true);
            setImgSrc(fallbackSrc);
        } else {
            // If fallback also fails, hide or show broken image
            e.currentTarget.style.display = 'none';
        }
    };

    if (!imgSrc) return null;

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={imgSrc}
            alt={alt}
            className={className}
            onError={handleError}
            {...props}
        />
    );
}
