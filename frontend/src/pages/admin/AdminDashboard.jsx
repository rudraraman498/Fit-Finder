import React, { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import InventoryIcon from '@mui/icons-material/Inventory';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AdminLayout from '../../components/admin/AdminLayout';
import { getAdminStats } from '../../api/adminService';

function StatCard({ icon, label, value, color }) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {label}
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {value ?? <Skeleton width={80} />}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: `${color}22`,
              color,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch(err => setError(err.message));
  }, []);

  const fmt = n => (n !== undefined && n !== null ? n.toLocaleString() : null);
  const fmtMoney = n =>
    n !== undefined && n !== null
      ? '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : null;

  return (
    <AdminLayout>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Dashboard
      </Typography>

      {error && (
        <Typography color="error" mb={2}>
          {error}
        </Typography>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<InventoryIcon fontSize="large" />}
            label="Total Products"
            value={fmt(stats?.totalProducts)}
            color="#FF5722"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<ShoppingBagIcon fontSize="large" />}
            label="Total Orders"
            value={fmt(stats?.totalOrders)}
            color="#00BFA5"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PeopleIcon fontSize="large" />}
            label="Total Users"
            value={fmt(stats?.totalUsers)}
            color="#7C4DFF"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<AttachMoneyIcon fontSize="large" />}
            label="Total Revenue"
            value={fmtMoney(stats?.totalRevenue)}
            color="#FFC107"
          />
        </Grid>
      </Grid>
    </AdminLayout>
  );
}
