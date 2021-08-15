import { successToast } from "@/functions/toasts";
import { useRoomState } from "@/hooks/useRoomState";
import { AvailableRoom, Room } from "@/types";
import { Button, Stack } from "@chakra-ui/react";

// TODO colyseus-monitor like
export const LobbyRoom = ({ availableRoom }: { availableRoom: AvailableRoom }) => {
    const roomName = availableRoom.name;

    const room = useRoomState<DemoRoomState>(roomName);
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
                (room.isIn ? (
                    <Button onClick={() => room.leave()}>Leave</Button>
                ) : (
                    <Button onClick={() => room.join()}>Join</Button>
                ))}
            <Button onClick={toggleDone}>Toggle done</Button>
            <Button onClick={() => room.delete()}>Remove</Button>
            <Button
                onClick={() => {
                    room.get();
                    room.once("state", (room: Room) =>
                        successToast({
                            title: room.name,
                            description: room.clients
                                .map((player) => player.username + " - " + player.color)
                                .toString(),
                        })
                    );
                }}
            >
                Get
            </Button>
        </Stack>
    );
};

interface DemoRoomState {
    status: string;
    mark: boolean;
}
