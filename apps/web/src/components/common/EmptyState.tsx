import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import { Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

export function EmptyState({ title, description, action, icon = <InboxOutlinedIcon fontSize="large" /> }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return <Stack spacing={1.5} sx={{ alignItems: "center", textAlign: "center", py: 8, px: 2, color: "text.secondary" }} role="status">
    {icon}
    <Typography variant="h5" color="text.primary">{title}</Typography>
    {description && <Typography>{description}</Typography>}
    {action && <Stack sx={{ mt: 1 }}>{action}</Stack>}
  </Stack>;
}
