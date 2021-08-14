import { useMyPresence } from "@/hooks/usePresence";
import { useRoomState } from "@/hooks/useRoomState";
import { useSocketEmit } from "@/hooks/useSocketConnection";
import { AvailableRoom } from "@/types";
import { Button, Stack } from "@chakra-ui/react";
import { findBy } from "@pastable/core";

interface DemoRoomState {
    status: string;
    mark: boolean;
    clients: any[];
}

// TODO colyseus-monitor like
export const LobbyRoom = ({ availableRoom }: { availableRoom: AvailableRoom }) => {
    const presence = useMyPresence();
    const roomName = availableRoom.name;

    const room = useRoomState<DemoRoomState>(roomName);
    const joinRoom = () => room.join();
    const leaveRoom = () => room.leave();
    const deleteRoom = () => room.delete();

    // TOOD room.isIn() ?
    const toggleDone = () => room.update({ mark: !room.state.mark });
    console.log(room.state.mark, room.state, room);

    return (
        <Stack border="1px solid teal">
            <Stack direction="row">
                <span>id: {room.name}</span>
                <span>ctx mark: {room.state.mark ? "done" : "empty"}</span>
            </Stack>
            <span>clients: {availableRoom.clients.map((id) => id).toString()}</span>
            {room.state.status === "waiting" &&
                (Boolean(findBy(room.state.clients, "id", presence.id)) ? (
                    <Button onClick={leaveRoom}>Leave</Button>
                ) : (
                    <Button onClick={joinRoom}>Join</Button>
                ))}
            <Button onClick={toggleDone}>Toggle done</Button>
            <Button onClick={joinRoom}>Join</Button>
            {/* <Button onClick={leaveRoom}>Leave</Button> */}
            <Button onClick={deleteRoom}>Remove</Button>
            {/* <Button onClick={play}>Play</Button> */}
        </Stack>
    );
};
