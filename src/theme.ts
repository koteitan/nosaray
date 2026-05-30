import { type ThemeConfig, extendTheme } from "@chakra-ui/react";
import { toDarkHex } from "./utils/darkmode";

const config: ThemeConfig = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

export const theme = extendTheme({
  config,
  styles: {
    global: {
      "html, body": {
        bg: { _light: "white", _dark: toDarkHex("#ffffff") },
        color: { _light: "gray.800", _dark: toDarkHex("#1a202c") },
      },
    },
  },
});
