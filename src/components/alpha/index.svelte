<script type="ts">
    import cx from 'classnames'
    import random from 'lodash/random'

    import DrawBoard from '../draw_board/index.svelte'

    import alphaData from '../../constant/alpha.js'
    import colors from '../../constant/color.js'

    let alphaNum: number = 0
    let brushColor: string = colors?.[0]
    let isCanDraw: boolean = false
    let isCanErase: boolean = false
    let isCanShowBg: boolean = false
    let isCanShowBgToggle: boolean = false

    $: randomAlpha =
        alphaData?.[parseInt(`${alphaNum / 5}`, 10)]?.[alphaNum % 5] ||
        randomAlpha

    const forceUpdate = async (_) => {}
    let doRerender = 0

    function prevAlpha() {
        if (--alphaNum < 0) alphaNum = 0
        alphaNum = !alphaData?.[parseInt(`${alphaNum / 5}`, 10)]?.[alphaNum % 5]
            ? --alphaNum
            : alphaNum
        doRerender++
    }

    function nextAlpha() {
        if (++alphaNum > 49) alphaNum = 49
        checkNumAndNext()
    }

    function setAlpha(row, col) {
        alphaNum = row * 5 + col
        doRerender++
    }

    function getNewAlpha() {
        alphaNum = random(50)
        checkNumAndNext()
        doRerender++
    }

    function checkNumAndNext() {
        alphaNum = !alphaData?.[parseInt(`${alphaNum / 5}`, 10)]?.[alphaNum % 5]
            ? ++alphaNum
            : alphaNum
        doRerender++
    }

    window.addEventListener('keydown', (event) => {
        switch (event?.code) {
            case 'KeyA':
                if (!isCanDraw) isCanDraw = true
                break
            case 'KeyS':
                if (!isCanErase) isCanErase = true
                break
            case 'KeyD':
                if (!isCanShowBg) isCanShowBg = true
                break
            case 'KeyF':
                isCanShowBgToggle = !isCanShowBgToggle
                break
            case 'KeyQ':
                prevAlpha()
                break
            case 'KeyE':
                nextAlpha()
                break
            default:
                break
        }
    })

    window.addEventListener('keyup', () => {
        if (isCanDraw) isCanDraw = false
        if (isCanErase) isCanErase = false
        if (isCanShowBg) isCanShowBg = false
    })
</script>

<div class="sandbox">
    <div class="hiragana_container">
        <div class="table">
            {#each alphaData as alphaList, row}
                <div class="column">
                    {#each alphaList as al, col}
                        <span
                            class={cx({ ['match']: al === randomAlpha })}
                            on:click={() => setAlpha(row, col)}>{al}</span
                        >
                    {/each}
                </div>
            {/each}
        </div>
        <div class="random_container">
            <div style={`color: ${brushColor};`}>
                <h1>{randomAlpha}</h1>
            </div>
            <div>
                <div>
                    <button on:click={prevAlpha}>prev</button>
                    <button on:click={nextAlpha}>next</button>
                </div>
                <button on:click={getNewAlpha}>random</button>
            </div>
        </div>
    </div>

    {#await forceUpdate(doRerender) then _}
        <div on:click={() => doRerender++}>
            <DrawBoard
                {brushColor}
                {isCanDraw}
                {isCanErase}
                {isCanShowBg}
                {isCanShowBgToggle}
                {randomAlpha}
            />
        </div>
    {/await}

    <div class="palette_box">
        {#each colors as color}
            <div
                class="palette"
                style={`background: ${color};`}
                on:click={() => (brushColor = color)}
            />
        {/each}
    </div>
</div>

<style type="scss">
    .sandbox {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 50px;
    }

    .hiragana_container {
        display: grid;
        place-items: center;

        .table {
            display: grid;
            width: 300px;
        }

        .column {
            display: grid;
            grid-template-columns: repeat(5, auto);
            place-items: center;

            span {
                min-width: 60px;
                padding: 2.5px 0;
            }

            &:hover {
                cursor: pointer;
            }
        }

        .match {
            background: lightpink;
        }
    }

    .random_container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        margin: 20px 0;
        gap: 20px;

        h1 {
            font-size: 5rem;
            margin: 0;
        }
    }

    .palette_box {
        display: flex;
        flex-direction: column;
        align-self: flex-start;
    }

    .palette {
        width: 40px;
        height: 40px;

        &:hover {
            cursor: pointer;
        }
    }
</style>
