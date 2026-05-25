import React, { useEffect, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Pagination from '@mui/material/Pagination';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/RestoreFromTrash';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
} from '../../api/adminService';

const EMPTY_PRODUCT = {
  slug: '', name: '', brand: '', description: '', category: '', subcategory: '',
  basePrice: '', material: '', fit: '', tags: '', gender: 'unisex',
  primaryImageUrl: '', active: true,
  images: [{ url: '', altText: '', primary: true }],
  variants: [{ sku: '', colorName: '', sizeLabel: '', sizeSystem: 'US', stockQty: 0, priceOverride: '', active: true }],
};

const GENDERS = ['men', 'women', 'unisex', 'boys', 'girls'];

function ProductFormDialog({ open, onClose, product, onSaved }) {
  const isEdit = Boolean(product?.id);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (isEdit) {
        setForm({
          name: product.name || '',
          brand: product.brand || '',
          description: product.description || '',
          category: product.category || '',
          subcategory: product.subcategory || '',
          basePrice: product.basePrice || '',
          material: product.material || '',
          fit: product.fit || '',
          tags: (product.tags || []).join(', '),
          gender: product.gender || 'unisex',
          primaryImageUrl: product.primaryImageUrl || '',
          active: product.active ?? true,
        });
      } else {
        setForm(EMPTY_PRODUCT);
      }
      setError('');
    }
  }, [open, product, isEdit]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleVariantChange = (idx, field, value) => {
    setForm(f => {
      const variants = [...f.variants];
      variants[idx] = { ...variants[idx], [field]: value };
      return { ...f, variants };
    });
  };

  const addVariant = () => {
    setForm(f => ({
      ...f,
      variants: [
        ...f.variants,
        { sku: '', colorName: '', sizeLabel: '', sizeSystem: 'US', stockQty: 0, priceOverride: '', active: true },
      ],
    }));
  };

  const removeVariant = idx => {
    setForm(f => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }));
  };

  const handleImageChange = (idx, field, value) => {
    setForm(f => {
      const images = [...f.images];
      images[idx] = { ...images[idx], [field]: value };
      return { ...f, images };
    });
  };

  const addImage = () => {
    setForm(f => ({
      ...f,
      images: [...f.images, { url: '', altText: '', primary: false }],
    }));
  };

  const removeImage = idx => {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const tags = form.tags
        ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      if (isEdit) {
        const payload = {
          name: form.name || undefined,
          brand: form.brand || undefined,
          description: form.description || undefined,
          category: form.category || undefined,
          subcategory: form.subcategory || undefined,
          basePrice: form.basePrice ? Number(form.basePrice) : undefined,
          material: form.material || undefined,
          fit: form.fit || undefined,
          tags: tags.length > 0 ? tags : undefined,
          gender: form.gender || undefined,
          primaryImageUrl: form.primaryImageUrl || undefined,
          active: form.active,
        };
        const updated = await updateAdminProduct(product.id, payload);
        onSaved(updated, true);
      } else {
        const primaryUrl = form.primaryImageUrl || form.images[0]?.url;
        const images = form.images.map((img, i) => ({
          url: img.url,
          altText: img.altText || null,
          primary: i === 0 || img.primary || img.url === primaryUrl,
        }));
        const variants = form.variants.map(v => ({
          sku: v.sku,
          colorName: v.colorName,
          sizeLabel: v.sizeLabel,
          sizeSystem: v.sizeSystem || 'US',
          stockQty: Number(v.stockQty) || 0,
          priceOverride: v.priceOverride ? Number(v.priceOverride) : null,
          active: v.active,
        }));
        const payload = {
          slug: form.slug,
          name: form.name,
          brand: form.brand,
          description: form.description,
          category: form.category,
          subcategory: form.subcategory,
          basePrice: Number(form.basePrice),
          material: form.material || null,
          fit: form.fit || null,
          tags,
          gender: form.gender,
          primaryImageUrl: primaryUrl,
          images,
          variants,
          active: form.active,
        };
        const created = await createAdminProduct(payload);
        onSaved(created, false);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Product' : 'Add Product'}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={2}>
          {!isEdit && (
            <Grid item xs={12} sm={6}>
              <TextField label="Slug *" value={form.slug} onChange={e => set('slug', e.target.value)} fullWidth size="small" />
            </Grid>
          )}
          <Grid item xs={12} sm={isEdit ? 12 : 6}>
            <TextField label="Name *" value={form.name} onChange={e => set('name', e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Brand *" value={form.brand} onChange={e => set('brand', e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Base Price *" type="number" value={form.basePrice} onChange={e => set('basePrice', e.target.value)} fullWidth size="small" inputProps={{ min: 0.01, step: 0.01 }} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Description *" value={form.description} onChange={e => set('description', e.target.value)} fullWidth multiline rows={3} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Category *" value={form.category} onChange={e => set('category', e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Subcategory *" value={form.subcategory} onChange={e => set('subcategory', e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Gender</InputLabel>
              <Select label="Gender" value={form.gender} onChange={e => set('gender', e.target.value)}>
                {GENDERS.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Material" value={form.material} onChange={e => set('material', e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Fit" value={form.fit} onChange={e => set('fit', e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Tags (comma-separated)" value={form.tags} onChange={e => set('tags', e.target.value)} fullWidth size="small" placeholder="casual, summer, breathable" />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Primary Image URL *" value={form.primaryImageUrl} onChange={e => set('primaryImageUrl', e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={form.active} onChange={e => set('active', e.target.checked)} color="primary" />}
              label="Active"
            />
          </Grid>
        </Grid>

        {!isEdit && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Images *</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addImage}>Add Image</Button>
            </Box>
            {form.images.map((img, idx) => (
              <Grid container spacing={1} key={idx} sx={{ mb: 1 }} alignItems="center">
                <Grid item xs={6}>
                  <TextField label="Image URL" value={img.url} onChange={e => handleImageChange(idx, 'url', e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={4}>
                  <TextField label="Alt Text" value={img.altText} onChange={e => handleImageChange(idx, 'altText', e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={1}>
                  <FormControlLabel control={<Switch size="small" checked={img.primary} onChange={e => handleImageChange(idx, 'primary', e.target.checked)} />} label="P" sx={{ mx: 0 }} />
                </Grid>
                <Grid item xs={1}>
                  <IconButton size="small" onClick={() => removeImage(idx)} disabled={form.images.length === 1}><DeleteIcon fontSize="small" /></IconButton>
                </Grid>
              </Grid>
            ))}

            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Variants *</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addVariant}>Add Variant</Button>
            </Box>
            {form.variants.map((v, idx) => (
              <Grid container spacing={1} key={idx} sx={{ mb: 1 }} alignItems="center">
                <Grid item xs={2}>
                  <TextField label="SKU" value={v.sku} onChange={e => handleVariantChange(idx, 'sku', e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={2}>
                  <TextField label="Color" value={v.colorName} onChange={e => handleVariantChange(idx, 'colorName', e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={2}>
                  <TextField label="Size" value={v.sizeLabel} onChange={e => handleVariantChange(idx, 'sizeLabel', e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={1.5}>
                  <TextField label="System" value={v.sizeSystem} onChange={e => handleVariantChange(idx, 'sizeSystem', e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={1.5}>
                  <TextField label="Stock" type="number" value={v.stockQty} onChange={e => handleVariantChange(idx, 'stockQty', e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={1.5}>
                  <TextField label="Price $" type="number" value={v.priceOverride} onChange={e => handleVariantChange(idx, 'priceOverride', e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={1}>
                  <IconButton size="small" onClick={() => removeVariant(idx)} disabled={form.variants.length === 1}><DeleteIcon fontSize="small" /></IconButton>
                </Grid>
              </Grid>
            ))}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ConfirmDialog({ open, onClose, onConfirm, product }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Deactivate Product</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to deactivate <strong>{product?.name}</strong>? It will be hidden from the store.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="error" onClick={onConfirm}>Deactivate</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AdminProductsPage() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [confirmProduct, setConfirmProduct] = useState(null);

  const PAGE_SIZE = 20;

  const loadProducts = useCallback(p => {
    setLoading(true);
    getAdminProducts(p - 1, PAGE_SIZE)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadProducts(page);
  }, [page, loadProducts]);

  const openCreate = () => { setEditProduct(null); setFormOpen(true); };
  const openEdit = product => { setEditProduct(product); setFormOpen(true); };

  const handleSaved = (saved, isEdit) => {
    if (isEdit) {
      setData(d => ({ ...d, products: d.products.map(p => (p.id === saved.id ? saved : p)) }));
    } else {
      loadProducts(1);
      setPage(1);
    }
  };

  const handleDeactivate = async () => {
    try {
      await deleteAdminProduct(confirmProduct.id);
      setData(d => ({
        ...d,
        products: d.products.map(p => p.id === confirmProduct.id ? { ...p, active: false } : p),
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setConfirmProduct(null);
    }
  };

  return (
    <AdminLayout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Products</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Add Product
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Brand</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.products?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.products?.map(product => (
                    <TableRow key={product.id} hover>
                      <TableCell>{product.id}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {product.primaryImageUrl && (
                            <Box
                              component="img"
                              src={product.primaryImageUrl}
                              alt={product.name}
                              sx={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 1 }}
                              onError={e => { e.target.style.display = 'none'; }}
                            />
                          )}
                          <Box>
                            <Typography variant="body2" fontWeight={500}>{product.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{product.slug}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{product.brand}</TableCell>
                      <TableCell>
                        <Typography variant="caption">{product.category} / {product.subcategory}</Typography>
                      </TableCell>
                      <TableCell>${Number(product.basePrice).toFixed(2)}</TableCell>
                      <TableCell>
                        <Chip
                          label={product.active ? 'Active' : 'Inactive'}
                          color={product.active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(product)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {product.active ? (
                          <Tooltip title="Deactivate">
                            <IconButton size="small" onClick={() => setConfirmProduct(product)} color="error">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Reactivate">
                            <IconButton size="small" onClick={async () => {
                              try {
                                const updated = await updateAdminProduct(product.id, { active: true });
                                setData(d => ({ ...d, products: d.products.map(p => p.id === updated.id ? updated : p) }));
                              } catch (e) { setError(e.message); }
                            }} color="success">
                              <RestoreIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {data?.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={data.totalPages}
                page={page}
                onChange={(_, v) => setPage(v)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      <ProductFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        product={editProduct}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(confirmProduct)}
        onClose={() => setConfirmProduct(null)}
        onConfirm={handleDeactivate}
        product={confirmProduct}
      />
    </AdminLayout>
  );
}
