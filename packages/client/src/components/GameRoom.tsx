import { useRoomState } from "@/hooks/useRoomState";
import { AvailableRoom } from "@/types";
import { Button, Stack } from "@chakra-ui/react";

// TODO colyseus-monitor like
export const LobbyRoom = ({ availableRoom }: { availableRoom: AvailableRoom }) => {
    const roomName = availableRoom.name;

    const room = useRoomState<DemoRoomState>(roomName);
    const joinRoom = () => room.join();
    const leaveRoom = () => room.leave();
    const deleteRoom = () => room.delete();

    const toggleDone = () => room.update({ mark: !room.state.mark });

    return (
        <Stack border="1px solid teal">
            <Stack direction="row">
                <span>id: {room.name}</span>
                <span>ctx mark: {room.state.mark ? "done" : "empty"}</span>
            </Stack>
            <span>clients: {availableRoom.clients.map((id) => id).toString()}</span>
            <span>names: {room.clients.map((player) => player.username).toString()}</span>
            {room.state.status === "waiting" &&
                (room.isIn ? <Button onClick={leaveRoom}>Leave</Button> : <Button onClick={joinRoom}>Join</Button>)}
            <Button onClick={toggleDone}>Toggle done</Button>
            <Button onClick={deleteRoom}>Remove</Button>
            {/* <Button onClick={play}>Play</Button> */}
        </Stack>
    );
};

interface DemoRoomState {
    status: string;
    mark: boolean;
}
