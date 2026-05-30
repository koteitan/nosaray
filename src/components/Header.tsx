import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import {
  Avatar,
  Box,
  Flex,
  HStack,
  Heading,
  IconButton,
  Menu,
  MenuButton,
  MenuGroup,
  MenuItem,
  MenuList,
  Spacer,
  Text,
  useColorMode,
} from "@chakra-ui/react";
import { useAtomValue } from "jotai";
import { useResetAtom } from "jotai/utils";
import { Suspense } from "react";
import { clearAllStates } from "../states";
import { myDataAtom, myPubkeyAtom } from "../states/Profiles";
import { useDarkAware } from "../utils/darkmode";
import { HiddenMenu } from "./HiddenMenu";

export const Header: React.FC = () => {
  const isLoggedIn = useAtomValue(myPubkeyAtom) !== "";
  const subtitleColor = useDarkAware("gray.600");

  return (
    <Flex w={800} align="baseline">
      <Heading>Nosaray</Heading>
      <Text fontSize="sm">魔改造 ver.</Text>
      <Text ms={2} fontSize="sm" color={subtitleColor}>
        Wayback Machine for Nostr.
      </Text>
      <Spacer />
      <HStack alignSelf="center" gap={2}>
        <Suspense>
          {isLoggedIn && (
            <Box cursor="pointer">
              <AccountMenu />
            </Box>
          )}
        </Suspense>
        <ColorModeToggle />
      </HStack>
      <Box position="fixed" left="0" top="0">
        <HiddenMenu />
      </Box>
    </Flex>
  );
};

const ColorModeToggle: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <IconButton
      aria-label="toggle dark mode"
      icon={colorMode === "dark" ? <SunIcon /> : <MoonIcon />}
      onClick={toggleColorMode}
      size="sm"
      variant="ghost"
    />
  );
};

const AccountMenu: React.FC = () => {
  const { profile } = useAtomValue(myDataAtom);
  const tipText = profile?.displayName ?? profile?.name ?? "ログイン中";

  const resetMyPubkey = useResetAtom(myPubkeyAtom);
  const handleClickLogout = () => {
    resetMyPubkey();
    clearAllStates();
  };

  return (
    <Menu>
      <MenuButton as={Avatar} size="sm" src={profile?.picture ?? ""} />
      <MenuList>
        <MenuGroup title={tipText}>
          <MenuItem onClick={handleClickLogout}>ログアウト</MenuItem>
        </MenuGroup>
      </MenuList>
    </Menu>
  );
};
