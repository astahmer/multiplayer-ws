import { getSaturedColor } from "@/functions/utils";
import { initialPresence, usePresenceList } from "@/hooks/usePresence";
import { EditIcon } from "@chakra-ui/icons";
import { Box, Center, chakra, Stack } from "@chakra-ui/react";
import { PresenceName } from "./PresenceName";

export const PlayerList = () => {
    const players = usePresenceList();

    return (
        <Box pos="fixed" top="100px" right="0">
            <Stack alignItems="flex-end">
                {players.map((presence) => (
                    <Box key={presence.id} py="2" px="4" w="150px" bgColor={presence.color} pos="relative">
                        <Center
                            pos="absolute"
                            top="0"
                            right="100%"
                            h="100%"
                            w={initialPresence.id === presence.id ? "30px" : "20px"}
                            bgColor={getSaturedColor(presence.color)}
                        >
                            {initialPresence.id === presence.id && <EditIcon />}
                        </Center>
                        {initialPresence.id === presence.id ? (
                            <PresenceName />
                        ) : (
                            <chakra.span color="black">{presence.username}</chakra.span>
                        )}
                    </Box>
                ))}
            </Stack>
        </Box>
    );
};
