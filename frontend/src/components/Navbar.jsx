import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { getCart } from '../api/commerceService';
import { useAuth } from '../context/AuthContext';

function NavButton({ to, label, active }) {
  return (
    <Button
      component={Link}
      to={to}
      sx={{
        color: active ? 'primary.main' : 'text.secondary',
        fontWeight: active ? 700 : 400,
        fontSize: '0.875rem',
        px: 1.5,
        position: 'relative',
        '&:hover': { color: 'text.primary', backgroundColor: 'transparent' },
        '&::after': active
          ? {
              content: '""',
              position: 'absolute',
              bottom: 5,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 4,
              height: 4,
              borderRadius: '50%',
              bgcolor: 'primary.main',
            }
          : {},
      }}
    >
      {label}
    </Button>
  );
}

export default function Navbar() {
  const [cartCount, setCartCount] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { auth, logout } = useAuth();

  const refreshCart = () => {
    getCart()
      .then(cart => setCartCount(cart.itemCount))
      .catch(() => setCartCount(0));
  };

  useEffect(() => {
    refreshCart();
  }, [location, auth]);

  useEffect(() => {
    window.addEventListener('cartUpdated', refreshCart);
    return () => window.removeEventListener('cartUpdated', refreshCart);
  }, []);

  const handleLogout = () => {
    setMenuAnchor(null);
    logout();
    navigate('/');
  };

  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar
        sx={{
          maxWidth: 1100,
          width: '100%',
          mx: 'auto',
          px: { xs: 2, sm: 3 },
          minHeight: { xs: 56, sm: 64 },
        }}
      >
        <Typography
          component={Link}
          to="/"
          sx={{
            flexGrow: 1,
            textDecoration: 'none',
            fontWeight: 800,
            fontSize: '1.2rem',
            letterSpacing: '-0.03em',
            color: 'text.primary',
            fontFamily: '"Inter", system-ui, sans-serif',
          }}
        >
          Fit<Box component="span" sx={{ color: 'primary.main' }}>Finder</Box>
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <NavButton to="/" label="Search" active={location.pathname === '/'} />
          <NavButton
            to="/products"
            label="Products"
            active={location.pathname.startsWith('/products')}
          />

          <Button
            component={Link}
            to="/cart"
            sx={{
              color: location.pathname === '/cart' ? 'primary.main' : 'text.secondary',
              minWidth: 40,
              px: 1.5,
              '&:hover': { color: 'text.primary', backgroundColor: 'transparent' },
            }}
          >
            <Badge
              badgeContent={cartCount}
              color="primary"
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.65rem',
                  minWidth: 16,
                  height: 16,
                  ...(cartCount > 0 && {
                    animation: 'navPulse 0.3s ease',
                    '@keyframes navPulse': {
                      '0%': { transform: 'scale(1)' },
                      '50%': { transform: 'scale(1.4)' },
                      '100%': { transform: 'scale(1)' },
                    },
                  }),
                },
              }}
            >
              <ShoppingCartIcon sx={{ fontSize: '1.25rem' }} />
            </Badge>
          </Button>

          {auth ? (
            <>
              <Avatar
                onClick={e => setMenuAnchor(e.currentTarget)}
                sx={{
                  width: 32,
                  height: 32,
                  ml: 0.5,
                  bgcolor: 'primary.main',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                {auth.user.name.charAt(0).toUpperCase()}
              </Avatar>
              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem disabled sx={{ opacity: 1 }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{auth.user.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{auth.user.email}</Typography>
                  </Box>
                </MenuItem>
                <MenuItem onClick={handleLogout}>Sign out</MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <NavButton
                to="/login"
                label="Sign in"
                active={location.pathname === '/login'}
              />
              <Button
                component={Link}
                to="/register"
                variant="contained"
                color="primary"
                size="small"
                sx={{ ml: 0.5, px: 2 }}
              >
                Register
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
