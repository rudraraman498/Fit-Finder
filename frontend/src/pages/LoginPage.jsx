import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin, mergeCart } from '../api/authService';
import { getCart } from '../api/commerceService';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Capture anonymous session cart before login clears it
      const anonymousCart = await getCart().catch(() => ({ items: [] }));

      const { token, user } = await apiLogin(email, password);

      // Merge anonymous cart items into user's DB cart
      if (anonymousCart.items && anonymousCart.items.length > 0) {
        const items = anonymousCart.items.map(i => ({
          productId: i.productId,
          size: i.size || null,
          quantity: i.quantity,
        }));
        await mergeCart(token, items).catch(() => {});
      }

      login(token, user);
      window.dispatchEvent(new Event('cartUpdated'));
      navigate(searchParams.get('redirect') || '/');
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        maxWidth: 400,
        mx: 'auto',
        mt: 10,
        px: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Typography variant="h4" fontWeight={800} letterSpacing="-0.03em">
        Sign in
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Don&apos;t have an account?{' '}
        <Box component={Link} to="/register" sx={{ color: 'primary.main' }}>
          Register
        </Box>
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          fullWidth
          autoComplete="email"
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          fullWidth
          autoComplete="current-password"
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={loading}
          sx={{ py: 1.5 }}
        >
          {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign in'}
        </Button>
      </Box>
    </Box>
  );
}
