import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Image from 'next/image';

type Props = {
  url: string | null | undefined;
  alt: string;
  /** Text used to build the fallback tile — usually the Bengali name. */
  fallbackText?: string | null;
  size?: number;
  rounded?: number;
  priority?: boolean;
};

/**
 * Product photo with a real fallback.
 *
 * A shop digitising its shelves will not have photographed everything on day
 * one, and a broken-image icon looks like a broken shop. Missing photos render
 * as a tinted tile with the product's own name instead.
 */
export default function ProductThumb({
  url,
  alt,
  fallbackText,
  size = 96,
  rounded = 2,
  priority = false,
}: Props) {
  if (url) {
    return (
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1 / 1',
          borderRadius: rounded,
          overflow: 'hidden',
          bgcolor: 'grey.100',
        }}
      >
        <Image
          src={url}
          alt={alt}
          fill
          sizes={`(max-width: 600px) 40vw, ${size}px`}
          style={{ objectFit: 'cover' }}
          priority={priority}
        />
      </Box>
    );
  }

  const label = (fallbackText || alt || '?').trim();

  return (
    <Box
      aria-hidden
      sx={{
        width: '100%',
        aspectRatio: '1 / 1',
        borderRadius: rounded,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 1,
        background: 'linear-gradient(140deg, #E3F3EA 0%, #F5EFE0 100%)',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography
        variant="caption"
        align="center"
        sx={{ color: 'primary.dark', fontWeight: 700, lineHeight: 1.3 }}
      >
        {label.length > 22 ? `${label.slice(0, 21)}…` : label}
      </Typography>
    </Box>
  );
}
