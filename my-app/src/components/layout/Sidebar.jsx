'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Box, Drawer, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Typography, Divider,
  Avatar, IconButton, Tooltip,
} from '@mui/material';
import Dashboard          from '@mui/icons-material/Dashboard';
import Laptop             from '@mui/icons-material/Laptop';
import AddCircleOutlined  from '@mui/icons-material/AddCircleOutlined';
import Assignment         from '@mui/icons-material/Assignment';
import History            from '@mui/icons-material/History';
import MapIcon            from '@mui/icons-material/Map';
import LightModeIcon      from '@mui/icons-material/LightMode';
import DarkModeIcon       from '@mui/icons-material/DarkMode';
import LogoutIcon         from '@mui/icons-material/Logout';
import GroupIcon          from '@mui/icons-material/Group';
import BusinessIcon       from '@mui/icons-material/Business';
import SensorsIcon        from '@mui/icons-material/Sensors';
import { useAuth }        from '@/contexts/AuthContext';
import { useThemeMode }   from '@/theme/ThemeRegistry';
import MesaLogo from '@/components/brand/MesaLogo';

export const SIDEBAR_WIDTH = 240;

const NAV_ITEMS = [
  { label: 'Dashboard',         href: '/dashboard',         icon: Dashboard },
  { label: 'Inventory',         href: '/inventario',        icon: Laptop },
  { label: 'Network map',       href: '/mapa',              icon: MapIcon },
  { label: 'New loan',          href: '/prestamos/nuevo',   icon: AddCircleOutlined, adminOnly: true },
  { label: 'Active loans',      href: '/prestamos/activos', icon: Assignment },
  { label: 'History',           href: '/historial',         icon: History },
];

const ADMIN_ITEMS = [
  { label: 'Agents',            href: '/agentes',           icon: SensorsIcon },
  { label: 'Users',             href: '/usuarios',          icon: GroupIcon },
  { label: 'Offices',           href: '/oficinas',          icon: BusinessIcon },
];

function NavList({ items, pathname, dark, onClose }) {
  return (
    <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {items.map(({ label, href, icon: Icon }) => {
        const active = pathname === href;
        return (
          <ListItem key={href} disablePadding>
            <ListItemButton
              component={Link}
              href={href}
              onClick={onClose}
              sx={{
                borderRadius: 2, py: 1, px: 1.5, gap: 0,
                color: active ? (dark ? '#fff' : '#0B5FCC') : 'text.secondary',
                backgroundColor: active ? (dark ? 'rgba(17,118,239,0.15)' : 'rgba(17,118,239,0.1)') : 'transparent',
                border: active ? '1px solid rgba(17,118,239,0.25)' : '1px solid transparent',
                '&:hover': {
                  backgroundColor: active ? (dark ? 'rgba(17,118,239,0.2)' : 'rgba(17,118,239,0.15)') : 'rgba(203,213,225,0.07)',
                  color: active ? (dark ? '#fff' : '#0B5FCC') : 'text.primary',
                },
                transition: 'all 0.15s ease',
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: active ? '#4C9BF5' : 'text.disabled', '& svg': { fontSize: 18 } }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={label}
                slotProps={{
                  primary: {
                    style: {
                      fontSize: '0.85rem',
                      fontWeight: active ? 600 : 400,
                      color: active ? (dark ? '#F1F5F9' : '#0B5FCC') : 'inherit',
                    },
                  },
                }}
              />
              {active && (
                <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#4C9BF5', flexShrink: 0, ml: 0.5 }} />
              )}
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
}

function SidebarContent({ onClose }) {
  const pathname = usePathname();
  const { user, logout }     = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const dark = mode === 'dark';

  const initials = user?.nombre
    ? user.nombre.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'IT';

  const safePhotoUrl =
    user?.foto_url?.startsWith('https://') || user?.foto_url?.startsWith('http://')
      ? user.foto_url
      : undefined;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Brand */}
      <Box sx={{ px: 2.5, pt: 3, pb: 2.5 }}>
        <MesaLogo height={44} />
      </Box>

      <Divider />

      {/* Nav */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1.5, px: 1 }}>
        <Typography
          variant="caption"
          sx={{
            px: 1.5, mb: 1, display: 'block',
            color: 'text.disabled', fontWeight: 700,
            fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase',
          }}
        >
          Main menu
        </Typography>
        <NavList items={NAV_ITEMS.filter((item) => !item.adminOnly || user?.rol === 'admin')} pathname={pathname} dark={dark} onClose={onClose} />

        {user?.rol === 'admin' && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography
              variant="caption"
              sx={{
                px: 1.5, mb: 1, display: 'block',
                color: 'text.disabled', fontWeight: 700,
                fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase',
              }}
            >
              Administration
            </Typography>
            <NavList items={ADMIN_ITEMS} pathname={pathname} dark={dark} onClose={onClose} />
          </>
        )}
      </Box>

      <Divider />

      {/* User + controls */}
      <Box sx={{ px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Info del usuario */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={safePhotoUrl}
            sx={{
              width: 34, height: 34,
              fontSize: '0.78rem', fontWeight: 700,
              background: 'linear-gradient(135deg, #1176EF, #4C9BF5)',
              border: '2px solid rgba(76,155,245,0.25)',
              flexShrink: 0,
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ color: 'text.primary', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {user?.nombre ?? 'User'}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}
            >
              {user?.correo}
            </Typography>
          </Box>
        </Box>

        {/* Acciones */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'} arrow placement="top">
            <IconButton onClick={toggleMode} size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
              {mode === 'dark'
                ? <LightModeIcon sx={{ fontSize: 18 }} />
                : <DarkModeIcon  sx={{ fontSize: 18 }} />
              }
            </IconButton>
          </Tooltip>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Sign out" arrow placement="top">
            <IconButton
              onClick={logout}
              size="small"
              sx={{ color: 'error.main', opacity: 0.7, '&:hover': { opacity: 1 } }}
            >
              <LogoutIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>

        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
          v1.0.0 — MVP
        </Typography>
      </Box>
    </Box>
  );
}

export default function Sidebar({ mobileOpen, onClose }) {
  const drawerSx = {
    '& .MuiDrawer-paper': {
      width: SIDEBAR_WIDTH,
      boxSizing: 'border-box',
      borderRight: '1px solid rgba(148, 163, 184, 0.06)',
    },
  };

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, ...drawerSx }}
      >
        <SidebarContent onClose={onClose} />
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{ display: { xs: 'none', md: 'block' }, ...drawerSx }}
        open
      >
        <SidebarContent onClose={() => {}} />
      </Drawer>
    </>
  );
}
