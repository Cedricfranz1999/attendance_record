import { StoreApi, UseBoundStore, create } from "zustand";
import { createUsersSlice, UsersSlice } from "./user.store";

type StoreState = UsersSlice; 

type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never;

const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(
  _store: S
) => {
  let store = _store as WithSelectors<typeof _store>;
  store.use = {};

  for (let k of Object.keys(_store.getState())) {
    (store.use as any)[k] = () => store((s) => s[k as keyof typeof s]);
  }

  return store;
};

const useStoreBase = create<StoreState>()((...a) => ({
  ...createUsersSlice(...a)
}));

export const UseStore = createSelectors(useStoreBase);
