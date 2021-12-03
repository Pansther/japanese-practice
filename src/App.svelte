<script lang="ts">
    import Alpha from "./components/alpha/index.svelte";
</script>

<main>
    <h1>Japanese Practice v0.1</h1>
    <Alpha />
</main>

<style>
    main {
        text-align: center;
        padding: 1em;
        max-width: 240px;
        margin: 0 auto;
    }

    h1 {
        color: #ff3e00;
        text-transform: uppercase;
        font-size: 4em;
        font-weight: 100;
        margin-top: 0;
    }

    @media (min-width: 640px) {
        main {
            max-width: none;
        }
    }
</style>
