import {
  AppBar,
  Box,
  Button,
  Container,
  Link,
  Toolbar,
  Typography,
} from "@mui/material";
import { Link as RouterLink, Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Link component={RouterLink} to="/" color="inherit" underline="none">
            <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
              Atlas Marketplace
            </Typography>
          </Link>
          <Button
            component={RouterLink}
            to="/listings/new"
            color="inherit"
            sx={{ ml: "auto" }}
          >
            Create listing
          </Button>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="md" sx={{ flex: 1, py: 6 }}>
        <Outlet />
      </Container>
      <Box component="footer" sx={{ py: 3, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          Atlas Marketplace
        </Typography>
      </Box>
    </Box>
  );
}
