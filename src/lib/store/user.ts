import { writable } from 'svelte/store';
import type { Identifiable, Nameable } from './types';

export type User = Identifiable & Nameable;

export const userStore = writable<User | undefined>();
