import { Demo } from "@/components/Demo";
import { Center, ChakraProvider, extendTheme, Flex, Spinner } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "react-query";
import "./App.css";
import { WsEvent } from "./functions/ws";
import { initialPresence, usePresenceInit, usePresenceIsSynced } from "./hooks/usePresence";
import { useSocketConnection, useSocketEmit, useSocketEvent } from "./hooks/useSocketConnection";

const queryClient = new QueryClient();

const theme = extendTheme({ config: { initialColorMode: "light" } });

function App() {
    usePresenceInit();

    // Connect to websocket / try to reconnect on focus while not connected / debug in dev
    useSocketConnection(initialPresence);

    return (
        <QueryClientProvider client={queryClient}>
            <ChakraProvider theme={theme}>
                <Flex direction="column" boxSize="100%">
                    <SyncWrapper />
                </Flex>
            </ChakraProvider>
        </QueryClientProvider>
    );
}

const SyncWrapper = () => {
    const emit = useSocketEmit();
    useSocketEvent(WsEvent.Open, () => {
        emit("sub#presence");
        emit("sub#rooms");
    });

    const isSynced = usePresenceIsSynced();
    if (!isSynced) {
        return (
            <Center h="100%">
                <Spinner size="xl" />
            </Center>
        );
    }

    return <Demo />;
};

export default App;
