<script lang="ts">
	import { ClickableTile, Tag } from 'carbon-components-svelte';
	import { QrCode } from 'carbon-icons-svelte';
	import { createEventDispatcher } from 'svelte';
	import { requestStore, type PagoRequest } from '$lib/store/request';

	const dispatch = createEventDispatcher();

	function handleClick(request: PagoRequest) {
		dispatch('requestClick', request);
	}
</script>

<div class="request-list">
	{#each $requestStore as request}
		<ClickableTile on:click={() => handleClick(request)}>
			<time>
				<span>{new Date(request.createTimeMs).toDateString()}</span>
				<span>{new Date(request.createTimeMs).toLocaleTimeString()}</span>
			</time>
			<span class="amount">{request.amount}</span>
			<span class="symbol">PAGO</span>
			{#if request.state === 2}
				<Tag type="green">validated</Tag>
			{:else if request.state === 1}
				<Tag type="green">confirmed</Tag>
			{:else}
				<Tag type="red">waiting</Tag>
			{/if}
		</ClickableTile>
	{/each}
</div>

<style lang="scss">
	@use '@carbon/colors';
	.request-list {
		:global(.bx--tile) {
			display: flex;
			align-items: center;
			margin: 0.5em 0;
			padding: 0.5em;
			text-decoration: none;
			font-size: 1em;
		}
	}
	span,
	time {
		display: block;
		margin: 0 0.5em;
	}

	.amount {
		flex: 1;
		color: colors.$yellow-20;
		font-size: 1.2em;
		text-align: right;
	}
	.symbol {
		margin-right: 1em;
	}
	:global(.bx--tag) {
		flex-basis: 6em;
	}
</style>
