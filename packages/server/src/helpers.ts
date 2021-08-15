import { ObjectLiteral, pick } from "@pastable/core";
import http from "http";
import { AppWebsocket, GameRoom, GameRoomConfig, LobbyRoom, Room, User } from "types";
import { URL } from "url";
import WebSocket from "ws";

export const makeUrl = (req: http.IncomingMessage) =>
    new URL((req.url.startsWith("/") ? "http://localhost" : "") + req.url);
export const getEventParam = (event: string) => event.split("#")[1];

export const makeUser = (): User => ({ clients: new Set(), rooms: new Set() });
export const makeRoom = ({ name, state }: Pick<Room, "name"> & Partial<Pick<Room, "state">>): LobbyRoom => ({
    name,
    clients: new Set(),
    state: new Map(Object.entries(state || {})),
    config: { updateRate: 10 * 1000 },
    internal: new Map(Object.entries({ timers: new Map() })),
});
export const makeGameRoom = ({
    name,
    state,
    config,
}: Pick<Room, "name"> & Partial<Pick<Room, "state">> & { config?: Partial<GameRoomConfig> }): GameRoom => ({
    ...makeRoom({ name, state }),
    config: { tickRate: 100, clientsRefreshRate: 10 * 1000, stateKeysToRemoveOnDisconnect: [], ...config },
    meta: new Map(),
});

// Presence
export const getClients = (clients: Set<AppWebsocket>) =>
    Array.from(clients.values()).filter((client) => client.readyState === WebSocket.OPEN);
export const getClientState = (ws: AppWebsocket) => ({
    id: (ws as AppWebsocket).id,
    ...Object.fromEntries(Array.from((ws as AppWebsocket).state.entries())),
});
export const getClientMeta = (ws: AppWebsocket) => ({
    id: (ws as AppWebsocket).id,
    ...Object.fromEntries(Array.from((ws as AppWebsocket).meta.entries())),
});
export const isUserInSet = (set: Set<AppWebsocket>, id: AppWebsocket["id"]) => {
    for (let elem of set) {
        if (elem.id === id) return true;
    }

    return false;
};

// Rooms
export const getRoomState = (room: Room) => Object.fromEntries(room.state);
export const getRoomClients = (room: Room) => Array.from(room.clients).map(getClientState);
export const getRoomFullState = (room: Room) => ({
    name: room.name,
    clients: getRoomClients(room),
    state: getRoomState(room),
});

// Games
export const getRoomMeta = (room: GameRoom) => Object.fromEntries(room.meta);
export const getGameFullState = (room: GameRoom) => ({
    name: room.name,
    clients: getRoomClients(room),
    state: getRoomState(room),
    meta: getRoomMeta(room),
});
