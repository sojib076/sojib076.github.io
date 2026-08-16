import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/**
 * Category tiles use emoji rather than downloaded icons or photos: they render
 * instantly, cost nothing on a slow connection, and are recognisable to a
 * shopper who is scanning rather than reading.
 */
const ICONS: Record<string, string> = {
  rice: '🌾',
  dal: '🫘',
  oil: '🫗',
  spices: '🌶️',
  salt: '🧂',
  snacks: '🍪',
  beverages: '🥤',
  dairy: '🥛',
  eggs: '🥚',
  noodles: '🍜',
  breakfast: '🥣',
  frozen: '🧊',
  household: '🧽',
  personal: '🧴',
  baby: '🍼',
  meat: '🍗',
  vegetables: '🥬',
  fruit: '🍎',
  fish: '🐟',
  default: '🛒',
};

export type CategoryTileData = {
  id: string;
  slug: string;
  name: string;
  nameBn: string | null;
  iconKey: string | null;
  _count?: { products: number };
};

export default function CategoryGrid({
  categories,
  columns = { xs: 3, sm: 4, md: 6 },
}: {
  categories: CategoryTileData[];
  columns?: { xs: number; sm: number; md: number };
}) {
  if (categories.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: `repeat(${columns.xs}, 1fr)`,
          sm: `repeat(${columns.sm}, 1fr)`,
          md: `repeat(${columns.md}, 1fr)`,
        },
        gap: 1.25,
      }}
    >
      {categories.map((category) => (
        <Box
          key={category.id}
          component={Link}
          href={`/category/${category.slug}`}
          sx={{
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: 0.5,
            p: 1,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            minHeight: 96,
            transition: 'border-color 120ms ease',
            '&:hover': { borderColor: 'primary.main' },
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              bgcolor: 'primary.light',
              display: 'grid',
              placeItems: 'center',
              fontSize: 22,
              lineHeight: 1,
            }}
          >
            <span aria-hidden>{ICONS[category.iconKey ?? 'default'] ?? ICONS.default}</span>
          </Box>

          <Typography variant="caption" align="center" fontWeight={600} sx={{ lineHeight: 1.2 }}>
            {category.name}
          </Typography>
          {category.nameBn ? (
            <Typography variant="caption" align="center" color="text.secondary" sx={{ lineHeight: 1.1 }}>
              {category.nameBn}
            </Typography>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}
