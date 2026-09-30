import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import PendingIcon from "@mui/icons-material/Pending";
import InfoIcon from "@mui/icons-material/Info";
import { Chip, type ChipProps } from "@mui/material";

const statusMap: Record<string, { label: string; color: ChipProps["color"]; icon: React.ReactElement }> = {
  active: { label: "Active", color: "success", icon: <CheckCircleIcon /> },
  accepted: { label: "Accepted", color: "success", icon: <CheckCircleIcon /> },
  paid: { label: "Paid", color: "success", icon: <CheckCircleIcon /> },
  completed: { label: "Completed", color: "success", icon: <CheckCircleIcon /> },
  pending: { label: "Pending", color: "warning", icon: <PendingIcon /> },
  pending_payment: { label: "Payment pending", color: "warning", icon: <PendingIcon /> },
  countered: { label: "Countered", color: "warning", icon: <InfoIcon /> },
  draft: { label: "Draft", color: "default", icon: <InfoIcon /> },
  rejected: { label: "Declined", color: "default", icon: <ErrorIcon /> },
  withdrawn: { label: "Withdrawn", color: "default", icon: <InfoIcon /> },
  cancelled: { label: "Cancelled", color: "error", icon: <ErrorIcon /> },
  disputed: { label: "Disputed", color: "error", icon: <ErrorIcon /> },
  sold: { label: "Sold", color: "info", icon: <CheckCircleIcon /> },
};

export function StatusChip({ status }: { status: string }) {
  const presentation = statusMap[status] ?? {
    label: status.replaceAll("_", " "),
    color: "default" as const,
    icon: <InfoIcon />,
  };
  return <Chip size="small" label={presentation.label} color={presentation.color} icon={presentation.icon} />;
}
