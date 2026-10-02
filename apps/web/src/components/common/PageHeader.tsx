import { Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <Stack
      spacing={1.5}
      direction={{ xs: "column", sm: "row" }}
      sx={{ justifyContent: "space-between", alignItems: { sm: "flex-end" }, mb: 4 }}
    >
      <Stack spacing={0.75}>
        {eyebrow && (
          <Typography variant="overline" color="secondary.dark">
            {eyebrow}
          </Typography>
        )}
        <Typography variant="h1" component="h1">
          {title}
        </Typography>
        {description && (
          <Typography color="text.secondary" sx={{ maxWidth: 640 }}>
            {description}
          </Typography>
        )}
      </Stack>
      {actions}
    </Stack>
  );
}
