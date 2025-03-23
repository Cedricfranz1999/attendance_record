
import { StateCreator } from 'zustand'

export type UserData = {
  id: string,
  img: any
}

export interface UsersSlice {
  users: UserData[],
  setUsers: (users: UserData[]) => void,
  getUsers: () => UserData[]
  
}

export const createUsersSlice: StateCreator<UsersSlice> = (set, get) => ({
  users: [],
  
  getUsers: () => {
    return get().users;
  },
  setUsers: (user: UserData[]) => {
    return set({ users: user });
  },
});