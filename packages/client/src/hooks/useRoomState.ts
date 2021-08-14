import { useSocketEvent } from "@/hooks/useSocketConnection";
import { AvailableRoom } from "@/types";
import { atom, useAtom } from "jotai";
import { atomFamily } from "jotai/utils";

export const roomListAtom = atom([] as Array<AvailableRoom>);
export const useRoomList = () => {
    const [roomList, setRoomList] = useAtom(roomListAtom);
    useSocketEvent("room/list", setRoomList);

    return roomList;
};

export const roomFamily = atomFamily(
    (props: { name: string }) => atom(new Map()),
    (a, b) => a.name === b.name
);
export const useRoomState = (name: string) => {
    const [room, setRoom] = useAtom(roomFamily({ name }));
    useSocketEvent("room/update", console.log);

    return room;
};

export const gameFamily = atomFamily(
    (props: { name: string }) => atom({ current: new Map() }),
    (a, b) => a.name === b.name
);
export const useGameRoomState = (name: string) => {
    const [game, setGame] = useAtom(gameFamily({ name }));
    // TODO update ref
    useSocketEvent("game/update", console.log);

    return game;
};
