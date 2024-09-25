/// <reference types="@sveltejs/kit" />

import type { Agent } from "$lib/store/agent";
import type { User } from "$lib/store/user";
i
// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	declare namespace App {
		interface Locals {
			user?: User;
			agent?: Agent;
		}
		// interface Platform {}
		interface Session {
			agent?: Agent;
		}
		// interface Stuff {}
	}
}
