import WebSocket from "ws";

export type GlobalSubscription = "presence" | "rooms" | "games";

export interface User {
    clients: Set<AppWebsocket>;
    rooms: Set<Room>;
}

export type WsEventPayload<Data = any> = [event: string, data?: Data];

// TODO statemachine events
export interface Room {
    name: string;
    clients: Set<AppWebsocket>;
    state: Map<any, any>;
    internal: Map<any, any>;
    // TODO admin ?
}

/**
 * LobbyRoom are used to sync only when events happen and every X seconds
 * Events are broadcasted to everyone else in the room but the sender
 */
export interface LobbyRoom extends Room {
    config: RoomConfig;
}
export interface RoomConfig {
    updateRate: number;
    [key: string]: any;
}

/**
 * GameRoom are used to handle fast updates
 * Events are broadcasted to everyone at the given tick rate
 */
export interface GameRoom extends Room {
    meta?: Map<any, any>;
    config?: GameRoomConfig;
}
export interface GameRoomConfig {
    tickRate: number;
    stateKeysToRemoveOnDisconnect: string[];
    [key: string]: any;
}

export type AppWebsocket = WebSocket & {
    id?: string;
    state: Map<any, any>;
    meta: Map<any, any>;
    internal: Map<any, any>;
    isAlive?: boolean;
};

interface WsEventObject {
    event: string;
    payload: any;
}
export interface EventHandlerRef extends WsEventObject {
    ws: AppWebsocket;
    opts: {
        binary: boolean;
    };
    user: User;
    globalSubscriptions: Map<GlobalSubscription, Set<AppWebsocket>>;
    rooms: Map<string, LobbyRoom>;
    games: Map<string, GameRoom>;

    // Misc
    broadcastEvent: (room: Room, event: string, payload?: any) => void;
    broadcastSub: (sub: GlobalSubscription, [event, payload]: WsEventPayload<any>) => void;
    broadcastPresenceList: (excludeSelf?: boolean) => void;

    // Presence
    getPresenceList: () => any[];
    sendPresenceList: () => void;
    getPresenceMetaList: () => any[];

    // Rooms
    getRoomListEvent: () => WsEventPayload<any>;
    sendRoomsList: () => void;
    onJoinRoom: (room: Room) => void;

    // Games
    getGameRoomListEvent: () => WsEventPayload<any>;
    sendGamesList: () => void;
}
