import { ObjectLiteral } from "@pastable/core";

export interface Player {
    id: string;
    username: string;
    color: string;
    cursor?: { x: number; y: number };
}

export interface Room {
    name: string;
    clients: Array<RoomPlayer>;
    state: Map<any, any>;
}

export interface RoomPlayer extends Pick<Player, "id"> {
    state: ObjectLiteral;
}

export interface AvailableRoom {
    name: string;
    clients: Array<Pick<Player, "id">>;
}
