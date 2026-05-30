import { ExternalLinkIcon } from "@chakra-ui/icons";
import { Avatar, Box, Card, Grid, GridItem, HStack, Image, Link, Text, Tooltip } from "@chakra-ui/react";
import { format, fromUnixTime } from "date-fns";
import { atom, useAtom, useAtomValue } from "jotai";
import { neventEncode, noteEncode, npubEncode } from "nostr-tools/nip19";
import { postDisplayModeAtom } from "../states/Config";
import { postSelectionAtomFamily, usePost } from "../states/Posts";
import { profileAtomFamily } from "../states/Profiles";
import type { NostrProfileWithMeta } from "../types/NostrProfile";
import { useDarkAware } from "../utils/darkmode";
import { CopyToClipboardButton } from "./CopyToClipboardButton";

const toTruncatedNpub = (hexPubkey: string) => {
  const npub = npubEncode(hexPubkey);
  return `${npub.slice(0, 8)}:${npub.slice(-8)}`;
};

const URL_REGEX = /(https?:\/\/\S+)/g;
const IMAGE_EXT_REGEX = /\.(jpe?g|png|gif|webp|bmp|svg|avif)(\?\S*)?$/i;

const PostContent: React.FC<{ content: string }> = ({ content }) => {
  const linkColor = useDarkAware("blue.500");
  const parts = content.split(URL_REGEX);
  return (
    <>
      {parts.map((part, idx) => {
        const key = `${idx}-${part.slice(0, 16)}`;
        if (/^https?:\/\//.test(part)) {
          if (IMAGE_EXT_REGEX.test(part)) {
            return (
              <Link key={key} href={part} isExternal display="block" my={1} onClick={(e) => e.stopPropagation()}>
                <Image src={part} alt="" maxW="100%" maxH="400px" borderRadius="md" />
              </Link>
            );
          }
          return (
            <Link key={key} href={part} color={linkColor} isExternal onClick={(e) => e.stopPropagation()}>
              {part}
            </Link>
          );
        }
        return <span key={key}>{part}</span>;
      })}
    </>
  );
};

const undefAtom = atom(undefined);

type PostProps = {
  id: string;
};

export const Post: React.FC<PostProps> = ({ id }) => {
  const post = usePost(id);
  const [isSelected, toggleSelection] = useAtom(postSelectionAtomFamily(id));
  const profile = useAtomValue(post ? profileAtomFamily(post.pubkey) : undefAtom);
  const noteId = post?.id ? noteEncode(post.id) : undefined;
  const nevent = post?.id ? neventEncode({ id: post.id }) : undefined;

  const bgColor = useDarkAware("white");
  const bgSelected = useDarkAware("purple.100");
  const bgHover = useDarkAware("gray.50");
  const bgSelectedHover = useDarkAware("purple.200");
  const dateColor = useDarkAware("gray.600");

  if (post === undefined) {
    return null;
  }
  return (
    <Card
      id={`post-${post.id}`}
      p={3}
      w="100%"
      whiteSpace="pre-wrap"
      backgroundColor={isSelected ? bgSelected : bgColor}
      _hover={{ backgroundColor: isSelected ? bgSelectedHover : bgHover }}
      transition="background-color 0.1s"
      key={post.id}
    >
      <Grid
        templateAreas={`"icon author date"
                        "icon text   text"`}
        templateRows={"1.4em 1fr"}
        templateColumns={"48px minmax(0, 1fr) 120px"}
        columnGap={2}
        rowGap={2}
        onClick={toggleSelection} // TODO
      >
        <GridItem area="icon">
          <PostAuthorIcon profile={profile} pubkey={post.pubkey} />
        </GridItem>
        <GridItem area="author">
          <PostAuthorName profile={profile} pubkey={post.pubkey} />
        </GridItem>
        <GridItem area="text">
          <Box whiteSpace="pre-wrap" wordBreak="break-word">
            <PostContent content={post.content} />
          </Box>
        </GridItem>
        <GridItem area="date" justifySelf="end">
          <Text color={dateColor}>{format(fromUnixTime(post.created_at), "M/d HH:mm:ss")}</Text>
        </GridItem>
      </Grid>
      <HStack position="absolute" top="11px" left="800px" px={2}>
        {nevent && (
          <CopyToClipboardButton
            valueToCopy={nevent}
            tooltip={{
              label: "投稿ID(nevent)をコピー",
            }}
          />
        )}
        {noteId && <OpenViaNosTxButton noteId={noteId} />}
      </HStack>
    </Card>
  );
};

type PostAuthorIconProps = {
  profile: NostrProfileWithMeta | undefined;
  pubkey: string;
};
const PostAuthorIcon: React.FC<PostAuthorIconProps> = ({ profile, pubkey }) => {
  const mode = useAtomValue(postDisplayModeAtom);

  switch (mode) {
    case "normal":
      return <Avatar size="48px" src={profile?.picture ?? ""} />;
    case "pubkey-hex-color":
      return (
        <svg viewBox="0 0 48 48">
          <title>icon</title>
          <circle cx="24" cy="24" r="24" fill={`#${pubkey.slice(0, 8)}`} />
        </svg>
      );
  }
};

type PostAuthorNameProps = {
  profile: NostrProfileWithMeta | undefined;
  pubkey: string;
};
const PostAuthorName: React.FC<PostAuthorNameProps> = ({ profile, pubkey }) => {
  const mode = useAtomValue(postDisplayModeAtom);
  const showScreenName = mode === "normal";
  const screenNameColor = useDarkAware("gray.500");

  const dispName = (() => {
    switch (mode) {
      case "normal":
        return profile?.displayName || profile?.name || toTruncatedNpub(pubkey);
      case "pubkey-hex-color":
        return `#${pubkey.slice(0, 8)}`;
    }
  })();

  const screenNameText =
    showScreenName && profile?.displayName && profile?.name ? (
      <Text fontSize="0.8em" color={screenNameColor}>{`@${profile.name}`}</Text>
    ) : null;

  return (
    <HStack alignItems="baseline" gap={0}>
      <Text fontSize="1.05em" fontWeight="bold">
        {dispName}
      </Text>
      {screenNameText}
    </HStack>
  );
};

const NosTx_BASE_URL = "https://nostx.shino3.net";

type OpenViaNosTxButtonProps = {
  noteId: string; // note1...
};

const OpenViaNosTxButton: React.FC<OpenViaNosTxButtonProps> = ({ noteId }) => {
  const iconColor = useDarkAware("gray.500");
  const handleClick = () => {
    window.open(`${NosTx_BASE_URL}/${noteId}`);
  };

  return (
    <Tooltip label="NosTx経由で開く">
      <Box role="button" aria-label="open the note via NosTx" onClick={handleClick}>
        <ExternalLinkIcon color={iconColor} />
      </Box>
    </Tooltip>
  );
};
