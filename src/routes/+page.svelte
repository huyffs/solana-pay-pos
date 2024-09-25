<script lang="ts">
	import { Button, Form, Modal, TextInput } from 'carbon-components-svelte';
	import { Checkmark, Close } from 'carbon-icons-svelte';
	import RequestList from '$lib/components/RequestList.svelte';
	import Keypad from '$lib/components/Keypad.svelte';
	import { createQR } from '$lib/utils/createQR';
	import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
	import { onDestroy, onMount } from 'svelte';
	import {
		findTransactionSignature,
		FindTransactionSignatureError,
		validateTransactionSignature
	} from '@solana/pay';
	import BigNumber from 'bignumber.js';
	import { requestStore, type PagoRequest } from '$lib/store/request';
	import { getApps, initializeApp } from 'firebase/app';
	import {
		getFirestore,
		collection,
		query,
		where,
		onSnapshot,
		orderBy,
		QueryDocumentSnapshot,
		doc
	} from 'firebase/firestore';
	import type { Unsubscribe } from 'firebase/firestore';
	import type { FireRequest } from '$lib/server/db';
	import { PUBLIC_FIREBASE_CONFIG, PUBLIC_SPL_TOKEN } from '$env/static/public';
	import { agentStore, type Agent } from '$lib/store/agent';

	//* for the future update
	// /** @type {import('./$types').PageData} */
	// let data: { agent: Agent };
	const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

	let qrContainer: HTMLDivElement;
	let activeRequest: PagoRequest | undefined;
	let checkReqTimer: NodeJS.Timer;
	let unQuery: Unsubscribe;
	let unRequests: PagoRequest[];
	let value = 0;

	onMount(() => {
		if (!$agentStore) {
			return;
		}
		if (!getApps().length) {
			initializeApp(JSON.parse(PUBLIC_FIREBASE_CONFIG));
		}
		const db = getFirestore();
		const q = query<PagoRequest>(
			collection(db, 'requests').withConverter<PagoRequest>({
				toFirestore: (data) => data,
				fromFirestore: (snap: QueryDocumentSnapshot<FireRequest>) => {
					const data = snap.data();
					return {
						...data,
						createTimeMs: data.createTime.toMillis(),
						updateTimeMs: data.updateTime?.toMillis()
					};
				}
			}),
			where('agent', '==', doc(db, `agents`, $agentStore.id)),
			orderBy('createTime', 'desc')
		);
		if (unQuery) {
			unQuery();
		}
		unQuery = onSnapshot(q, (snap) => {
			const requests: PagoRequest[] = [];
			snap.forEach((doc) => {
				requests.push(doc.data());
			});
			requestStore.set(requests);
		});
	});

	onDestroy(() => {
		if (unQuery) {
			unQuery();
		}
		if (unRequestsTimer) {
			unRequestsTimer();
		}
		clearInterval(checkReqTimer);
	});

	const unRequestsTimer = requestStore.subscribe((requests) => {
		const unReqs: PagoRequest[] = [];
		for (const r of requests) {
			if (!r.state || r.state < 2) {
				unReqs.push(r);
			}
		}
		unRequests = unReqs;
		if (unRequests.length) {
			if (!checkReqTimer) {
				checkReqTimer = setInterval(checkRequests, 2000);
			}
		} else if (checkReqTimer) {
			clearInterval(checkReqTimer);
		}
	});

	async function checkRequests() {
		unRequests.forEach(async (request) => {
			try {
				if (!request.signature) {
					const sig = await findTransactionSignature(
						connection,
						new PublicKey(request.reference),
						undefined,
						'confirmed'
					);
					requestStore.update((s) => {
						request.signature = sig.signature;
						return s;
					});
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
				requestStore.update((s) => {
					request.state = 2;
					return s;
				});

				if (activeRequest !== request && activeRequest?.reference === request.reference) {
					activeRequest = request;
				}
				await fetch(`/api/requests/${request.reference}`);
			} catch (error: any) {
				// If the RPC node doesn't have the transaction signature yet, try again
				if (!(error instanceof FindTransactionSignatureError)) {
					console.error(error);
				}
			}
		});
	}

	function onKeypadTap(e: CustomEvent<number>) {
		if (e.detail > 9) {
			value *= e.detail;
		} else {
			value = Math.round(value * 10 + e.detail);
		}
	}

	function onWindowKeydown(e: KeyboardEvent) {
		e.preventDefault();
		if (e.key >= '0' && e.key <= '9') {
			const num = parseInt(e.key, 10);
			value = Math.round(value * 10 + num);
		} else if (e.key === 'Escape') {
			value = 0;
		} else if (e.key === 'Backspace') {
			value = (value / 10) | 0;
		} else if (e.key === 'ArrowUp') {
			value += 100;
		} else if (e.key === 'ArrowDown') {
			value -= 100;
		}
		if (value < 0) {
			value = 0;
		}
	}

	function onClearClick(e: MouseEvent) {
		e.preventDefault();
		value = 0;
	}

	async function onSendClick(e: MouseEvent) {
		e.preventDefault();
		try {
			const res = await fetch('/api/requests', {
				method: 'post',
				body: JSON.stringify({
					amount: (value / 100).toFixed(2)
				})
			});
			if (res.ok) {
				showRequest(await res.json());
			} else {
				console.error('Failed request', res.status, await res.text());
			}
		} catch (err) {
			console.error('Error request', err);
		}
	}

	async function showRequest(r: PagoRequest) {
		activeRequest = r;
	}

	function hideRequest() {
		activeRequest = undefined;
	}

	async function onRequestOpen() {
		if (!activeRequest) {
			return;
		}
		const qr = createQR(activeRequest.url, 400);
		qr.append(qrContainer);
	}

	function onRequestClose() {
		if (qrContainer) {
			qrContainer.innerHTML = '';
		}
	}
</script>

<svelte:window on:keydown={onWindowKeydown} />

<section class="checkout">
	<div class="input">
		<h1>{$agentStore?.forename} {$agentStore?.surname}</h1>
		<Form>
			<TextInput value={(value / 100).toFixed(2)} placeholder="0.00" type="number" step="0.01" />
			<div class="actions">
				<Button kind="danger" icon={Close} on:click={onClearClick} />
				<Button icon={Checkmark} on:click={onSendClick} />
			</div>
		</Form>

		<div class="keypad">
			<Keypad on:tap={onKeypadTap} />
		</div>
	</div>

	<div class="list">
		<RequestList on:requestClick={(e) => showRequest(e.detail)} />
	</div>
</section>
<Modal
	size="lg"
	preventCloseOnClickOutside
	open={!!activeRequest}
	modalHeading="Scan with Phantom to pay"
	primaryButtonText="Hide"
	on:click:button--primary={hideRequest}
	on:open={onRequestOpen}
	on:close={onRequestClose}
>
	<svg
		width="128"
		height="128"
		viewBox="0 0 128 128"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<circle cx="64" cy="64" r="64" fill="url(#paint0_linear)" />
		<path
			d="M110.584 64.9142H99.142C99.142 41.7651 80.173 23 56.7724 23C33.6612 23 14.8716 41.3057 14.4118 64.0583C13.936 87.577 36.241 108 60.0186 108H63.0094C83.9723 108 112.069 91.7667 116.459 71.9874C117.27 68.3413 114.358 64.9142 110.584 64.9142ZM39.7689 65.9454C39.7689 69.0411 37.2095 71.5729 34.0802 71.5729C30.9509 71.5729 28.3916 69.0399 28.3916 65.9454V56.8414C28.3916 53.7457 30.9509 51.2139 34.0802 51.2139C37.2095 51.2139 39.7689 53.7457 39.7689 56.8414V65.9454ZM59.5224 65.9454C59.5224 69.0411 56.9631 71.5729 53.8338 71.5729C50.7045 71.5729 48.1451 69.0399 48.1451 65.9454V56.8414C48.1451 53.7457 50.7056 51.2139 53.8338 51.2139C56.9631 51.2139 59.5224 53.7457 59.5224 56.8414V65.9454Z"
			fill="url(#paint1_linear)"
		/>
		<defs>
			<linearGradient
				id="paint0_linear"
				x1="64"
				y1="0"
				x2="64"
				y2="128"
				gradientUnits="userSpaceOnUse"
			>
				<stop stop-color="#534BB1" />
				<stop offset="1" stop-color="#551BF9" />
			</linearGradient>
			<linearGradient
				id="paint1_linear"
				x1="65.4998"
				y1="23"
				x2="65.4998"
				y2="108"
				gradientUnits="userSpaceOnUse"
			>
				<stop stop-color="white" />
				<stop offset="1" stop-color="white" stop-opacity="0.82" />
			</linearGradient>
		</defs>
	</svg>

	{#if activeRequest?.state === 2}
		<h2>Received {activeRequest.amount} PAGO!</h2>
	{:else if activeRequest?.state === 1}
		<h2>Transfer of {activeRequest.amount} PAGO is in progress</h2>
	{:else}
		<div class="qr-container" bind:this={qrContainer} />
		<h2>Waiting for {activeRequest?.amount} PAGO!</h2>
	{/if}
</Modal>

<style lang="scss">
	.checkout {
		display: flex;
		flex-direction: row;
		padding: 1em;
		flex-wrap: wrap;
		gap: 2em;
		:global(.bx--text-input) {
			font-size: 3em;
			height: 1.3em;
			text-align: center;
		}
		:global(.bx--btn__icon) {
			width: 2em;
			height: 2em;
		}
	}
	.input {
		flex: 2;
	}
	h1 {
		text-align: center;
		margin-bottom: 1em;
	}
	.list {
		flex: 3;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
	}
	.keypad {
		display: flex;
		justify-content: center;
		margin: 2em 0 0;
	}
	.qr-container {
		display: flex;
		justify-content: center;
		width: 100%;
	}
	:global(.bx--modal-content) {
		display: flex;
		flex-direction: column;
		align-items: center;
		h2 {
			margin-top: 1em;
		}
	}
</style>
