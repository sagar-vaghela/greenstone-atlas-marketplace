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
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { logout, selectCurrentUser } from "../../features/auth/authSlice";

export function AppLayout() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
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
          {user ? (
            <>
              <Typography
                variant="body2"
                sx={{ ml: 2, display: { xs: "none", sm: "block" } }}
              >
                {user.displayName}
              </Typography>
              <Button component={RouterLink} to="/profile" color="inherit">
                Profile
              </Button>
              <Button color="inherit" onClick={() => void dispatch(logout())}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button component={RouterLink} to="/login" color="inherit">
                Sign in
              </Button>
              <Button component={RouterLink} to="/register" color="inherit">
                Create account
              </Button>
            </>
          )}
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
