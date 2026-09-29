import { createStore, del, get, set } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

const appStore = createStore('basecamp', 'state');
const photoStore = createStore('basecamp-photos', 'blobs');

/** zustand storage adapter backed by IndexedDB. */
export const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name, appStore)) ?? null,
  setItem: async (name, value) => {
    await set(name, value, appStore);
  },
  removeItem: async (name) => {
    await del(name, appStore);
  },
};

export async function savePhotoBlob(id: string, blob: Blob): Promise<void> {
  await set(id, blob, photoStore);
}
export async function getPhotoBlob(id: string): Promise<Blob | undefined> {
  return get<Blob>(id, photoStore);
}
export async function deletePhotoBlob(id: string): Promise<void> {
  await del(id, photoStore);
}
