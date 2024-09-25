<script lang="ts" context="module">
	import type { PagoRequest } from '$lib/store/request';
	import { createQR } from '$lib/utils/createQR';
	import { getApps, initializeApp } from 'firebase/app';
	import {
		doc,
		getFirestore,
		onSnapshot,
		QueryDocumentSnapshot,
		type Unsubscribe
	} from 'firebase/firestore';
	import { onDestroy, onMount } from 'svelte';
</script>

<script lang="ts">
	import type { FireRequest } from '$lib/server/db';
	import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
	import {
		findTransactionSignature,
		FindTransactionSignatureError,
		validateTransactionSignature
	} from '@solana/pay';
	import BigNumber from 'bignumber.js';
	import { page } from '$app/stores';
	import { PUBLIC_FIREBASE_CONFIG, PUBLIC_SPL_TOKEN } from '$env/static/public';

	const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
	const size = parseInt($page.params.size || '512', 10);

	let request: PagoRequest;
	let unsub: Unsubscribe;
	let timer: NodeJS.Timer;
	let qr: HTMLElement;

	onMount(() => {
		if (!getApps().length) {
			initializeApp(JSON.parse(PUBLIC_FIREBASE_CONFIG));
		}
		const db = getFirestore();
		const dRef = doc(db, 'requests', $page.params.reference || 'sol').withConverter<PagoRequest>({
			toFirestore: (data) => data,
			fromFirestore: (snap: QueryDocumentSnapshot<FireRequest>) => {
				const data = snap.data();
				return {
					...data,
					createTimeMs: data.createTime.toMillis(),
					updateTimeMs: data.updateTime?.toMillis()
				};
			}
		});
		unsub = onSnapshot(dRef, async (snap) => {
			if (snap.exists()) {
				request = snap.data();
				if (!request.state) {
					createQR(request.url, size).append(qr);
					if (!timer) {
						timer = setInterval(checkRequests, 2000);
					}
				}
			}
		});
	});

	onDestroy(() => {
		if (unsub) {
			unsub();
		}
		if (timer) {
			clearInterval(timer);
		}
	});

	async function checkRequests() {
		try {
			if (!request.signature) {
				const sig = await findTransactionSignature(
					connection,
					new PublicKey(request.reference),
					undefined,
					'confirmed'
				);
				request.signature = sig.signature;
			}

			if (!request.signature) {
				throw Error(`request missing signature ${JSON.stringify(request)}`);
			}

			await validateTransactionSignature(
				connection,
				request.signature,
				new PublicKey(request.recipient),
				new BigNumber(request.amount),
				new PublicKey(PUBLIC_SPL_TOKEN),
				new PublicKey(request.reference)
			);
			request.state = 2;
			clearInterval(timer);
			qr.innerHTML = '';
			await fetch(`/api/requests/${request.reference}`);
		} catch (error: any) {
			// If the RPC node doesn't have the transaction signature yet, try again
			if (!(error instanceof FindTransactionSignatureError)) {
				console.error(error);
			}
		}
	}
</script>

<section>
	{#if !request}
		<h2>Loading...</h2>
	{:else if request.state === 2}
		<h2>Received {request.amount} PAGO!</h2>
	{:else if request.state === 1}
		<h2>Transfer of {request.amount} PAGO is in progress...</h2>
	{/if}
	<div bind:this={qr} />
</section>

<style lang="scss">
	:global(html, body) {
		height: 100%;
	}
	section {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 100%;
	}
</style>
