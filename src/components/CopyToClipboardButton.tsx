import { CheckIcon, CopyIcon } from "@chakra-ui/icons";
import { Box, type PlacementWithLogical, Tooltip, useClipboard } from "@chakra-ui/react";
import { useDarkAware } from "../utils/darkmode";

type TooltipProps = {
  label: string;
  placement?: PlacementWithLogical;
};

type CopyToClipboardButtonProps = {
  valueToCopy: string;
  tooltip?: TooltipProps;
  children?: React.ReactNode;
};

export const CopyToClipboardButton: React.FC<CopyToClipboardButtonProps> = ({ valueToCopy, tooltip, children }) => {
  const { onCopy, hasCopied } = useClipboard(valueToCopy, 500);
  const checkColor = useDarkAware("green.300");
  const copyColor = useDarkAware("gray.500");
  const body = (
    <Box role="button" aria-label="copy share URL" onClick={onCopy}>
      {hasCopied ? <CheckIcon color={checkColor} /> : (children ?? <CopyIcon color={copyColor} />)}
    </Box>
  );

  return tooltip ? (
    <Tooltip label={hasCopied ? "" : tooltip.label} placement={tooltip.placement}>
      {body}
    </Tooltip>
  ) : (
    body
  );
};
