import type { ReactNode } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

type Props<T extends string> = {
  section: T;
  expandedSection: T | false;
  onExpand: (section: T | false) => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function EditorAccordion<T extends string>({
  section,
  expandedSection,
  onExpand,
  title,
  subtitle,
  children,
}: Props<T>) {
  return (
    <Accordion
      expanded={expandedSection === section}
      onChange={(_, expanded) => onExpand(expanded ? section : false)}
      disableGutters
      sx={{
        "&:before": { display: "none" },
        boxShadow: "none",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        mb: 1,
        "&.Mui-expanded": { mb: 1 },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2">{title}</Typography>
          {subtitle && expandedSection !== section ? (
            <Typography variant="caption" color="text.secondary" noWrap>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>{children}</AccordionDetails>
    </Accordion>
  );
}
