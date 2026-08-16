'use client';

import { useActionState, useState } from 'react';
import Grid from '@mui/material/Grid2';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import ProductThumb from '@/components/ProductThumb';
import { uploadProductImageAction, type AdminState } from '@/app/actions/admin';

export type ProductFormValues = {
  id?: string;
  name: string;
  nameBn: string;
  categoryId: string;
  brandName: string;
  unit: string;
  description: string;
  price: string;
  discountPrice: string;
  minQty: number;
  maxQty: number;
  stockQty: number;
  trackStock: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
  isActive: boolean;
  imageUrl: string;
};

type Props = {
  action: (state: AdminState, formData: FormData) => Promise<AdminState>;
  categories: { id: string; name: string }[];
  values: ProductFormValues;
  submitLabel: string;
};

/** Common Bangladeshi grocery sale units, offered as suggestions. */
const UNITS = ['kg', 'gram', 'litre', 'ml', 'pcs', 'dozen', 'packet', 'bottle', 'bag'];

export default function ProductForm({ action, categories, values, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(action, {});
  const [imageUrl, setImageUrl] = useState(values.imageUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setUploadError(null);

    const data = new FormData();
    data.set('file', file);
    const result = await uploadProductImageAction(data);

    setUploading(false);
    if (result.ok) setImageUrl(result.url);
    else setUploadError(result.error);
  }

  return (
    <Box component="form" action={formAction}>
      {state.error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
      ) : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h3" component="h2" gutterBottom>
                Product details
              </Typography>

              <Stack spacing={2}>
                <TextField
                  name="name"
                  label="Product name (English)"
                  defaultValue={values.name}
                  required
                  fullWidth
                  placeholder="Miniket Rice"
                />
                <TextField
                  name="nameBn"
                  label="Bengali name"
                  defaultValue={values.nameBn}
                  fullWidth
                  placeholder="মিনিকেট চাল"
                  helperText="Shown under the English name so customers recognise it instantly."
                />
                <TextField
                  select
                  name="categoryId"
                  label="Category"
                  defaultValue={values.categoryId}
                  required
                  fullWidth
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </TextField>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField name="brandName" label="Brand (optional)" defaultValue={values.brandName} fullWidth />
                  <TextField
                    select
                    name="unit"
                    label="Sold by"
                    defaultValue={values.unit || 'kg'}
                    required
                    fullWidth
                  >
                    {UNITS.map((unit) => (
                      <MenuItem key={unit} value={unit}>
                        {unit}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>

                <TextField
                  name="description"
                  label="Description (optional)"
                  defaultValue={values.description}
                  multiline
                  minRows={3}
                  fullWidth
                />
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h3" component="h2" gutterBottom>
                Price and quantity
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                <TextField
                  name="price"
                  label="Price"
                  defaultValue={values.price}
                  required
                  fullWidth
                  InputProps={{ startAdornment: <InputAdornment position="start">৳</InputAdornment> }}
                  helperText="Per unit, e.g. 75 for ৳75/kg"
                />
                <TextField
                  name="discountPrice"
                  label="Offer price (optional)"
                  defaultValue={values.discountPrice}
                  fullWidth
                  InputProps={{ startAdornment: <InputAdornment position="start">৳</InputAdornment> }}
                  helperText="Leave empty for no discount"
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  name="minQty"
                  label="Minimum quantity"
                  type="number"
                  defaultValue={values.minQty}
                  fullWidth
                  inputProps={{ min: 1 }}
                />
                <TextField
                  name="maxQty"
                  label="Maximum per order"
                  type="number"
                  defaultValue={values.maxQty}
                  fullWidth
                  inputProps={{ min: 1 }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h3" component="h2" gutterBottom>
                Photo
              </Typography>

              <Box sx={{ maxWidth: 180, mb: 1.5 }}>
                <ProductThumb url={imageUrl || null} alt={values.name || 'Product'} fallbackText={values.nameBn} />
              </Box>

              <input type="hidden" name="imageUrl" value={imageUrl} />

              <Button component="label" variant="outlined" size="small" disabled={uploading} fullWidth>
                {uploading ? 'Uploading…' : imageUrl ? 'Replace photo' : 'Upload photo'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void upload(file);
                  }}
                />
              </Button>

              {imageUrl ? (
                <Button size="small" color="inherit" onClick={() => setImageUrl('')} sx={{ mt: 1 }} fullWidth>
                  Remove photo
                </Button>
              ) : null}

              {uploadError ? (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {uploadError}
                </Alert>
              ) : null}

              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                A photo is optional — products without one show their name on a tile.
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h3" component="h2" gutterBottom>
                Availability
              </Typography>

              <Stack>
                <FormControlLabel
                  control={<Switch name="isAvailable" defaultChecked={values.isAvailable} />}
                  label="In stock"
                />
                <FormControlLabel
                  control={<Switch name="isActive" defaultChecked={values.isActive} />}
                  label="Visible in the shop"
                />
                <FormControlLabel
                  control={<Switch name="isFeatured" defaultChecked={values.isFeatured} />}
                  label="Feature on the homepage"
                />
                <FormControlLabel
                  control={<Switch name="trackStock" defaultChecked={values.trackStock} />}
                  label="Count stock"
                />
              </Stack>

              <TextField
                name="stockQty"
                label="Stock quantity"
                type="number"
                defaultValue={values.stockQty}
                fullWidth
                sx={{ mt: 1 }}
                inputProps={{ min: 0 }}
                helperText="Only used when stock counting is on."
              />
            </CardContent>
          </Card>

          <Button type="submit" variant="contained" size="large" fullWidth disabled={pending}>
            {pending ? 'Saving…' : submitLabel}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
