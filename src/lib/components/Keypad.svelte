<script lang="ts">
	import { Button } from 'carbon-components-svelte';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	function send(i: number) {
		dispatch('tap', i);
	}
</script>

<div class="keypad">
	<Button on:click={() => send(1)}>1</Button>
	<Button on:click={() => send(2)}>2</Button>
	<Button on:click={() => send(3)}>3</Button>
	<Button on:click={() => send(4)}>4</Button>
	<Button on:click={() => send(5)}>5</Button>
	<Button on:click={() => send(6)}>6</Button>
	<Button on:click={() => send(7)}>7</Button>
	<Button on:click={() => send(8)}>8</Button>
	<Button on:click={() => send(9)}>9</Button>
	<div />
	<Button on:click={() => send(0)}>0</Button>
	<Button on:click={() => send(100)}>00</Button>
	<div />
</div>

<style lang="scss">
	.keypad {
		display: grid;
		grid-template-columns: repeat(3, 6em);
		grid-template-rows: repeat(4, 6em);
		grid-gap: 0.5em;
		:global(.bx--btn) {
			border-radius: 50%;
			font-size: 1.2em;
		}
	}
</style>
