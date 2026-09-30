import { Typography, type TypographyProps } from "@mui/material";
import { formatCurrency } from "./formatters";

export function PriceDisplay({ amount, currency, ...props }: { amount: number; currency: string } & TypographyProps) {
  return <Typography {...props}>{formatCurrency(amount, currency)}</Typography>;
}
