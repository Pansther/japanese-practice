<script type="ts">
    import cx from 'classnames'
    import random from 'lodash/random'
    import times from 'lodash/times'
    import shuffle from 'lodash/shuffle'
    import takeRight from 'lodash/takeRight'

    import DrawBoard from '../draw_board/index.svelte'

    import alphaData from '../../constant/alpha.js'
    import instructions from '../../constant/instruction.js'
    import colors from '../../constant/color.js'

    let alphaNum: number = 0
    let brushColor: string = colors?.[0]
    let isCanDraw: boolean = false
    let isCanErase: boolean = false
    let isCanShowBg: boolean = false
    let isCanShowBgToggle: boolean = false
    let mode: 'normal' | 'practice' = 'normal'
    let alphaType: 'hira' | 'kana' = 'hira'

    $: randomAlpha =
        alphaData?.[parseInt(`${alphaNum / 5}`, 10)]?.[alphaNum % 5] ||
        randomAlpha

    $: practiceAlpha =
        mode === 'practice'
            ? shuffle(
                  times(50, 0)?.filter((num) => ![36, 38, 46, 48].includes(num))
              )
            : []
    $: {
        alphaNum = mode === 'practice' ? practiceAlpha[0] : alphaNum
    }

    const forceUpdate = async (_) => {}
    const forceUpdateTable = async (_) => {}
    let doRerender = 0
    let doRerenderTable = 0

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
        if (mode === 'normal') {
            alphaNum = row * 5 + col
            doRerender++
        }
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

    function nextPractice() {
        if (practiceAlpha?.length) {
            document.querySelector<HTMLElement>(
                `#hiragana-${alphaNum}`
            ).style.background = 'lightskyblue'
            practiceAlpha = takeRight(practiceAlpha, practiceAlpha?.length - 1)
            alphaNum = practiceAlpha[1]
            doRerender++
        }
    }

    function goPractice() {
        mode = 'practice'
    }

    function goNormal() {
        mode = 'normal'
        doRerenderTable++
    }

    function restartPractice() {
        mode = 'normal'
        mode = 'practice'
        doRerenderTable++
    }

    function next() {
        if (mode === 'normal') nextAlpha()
        if (mode === 'practice') nextPractice()
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
                if (mode === 'normal') prevAlpha()
                break
            case 'KeyW':
                if (mode === 'normal') getNewAlpha()
                if (mode === 'practice') nextPractice()
                break
            case 'KeyE':
                if (mode === 'normal') nextAlpha()
                if (mode === 'practice') nextPractice()
                break
            case 'Space':
                event.preventDefault()
                doRerender++
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
        {#await forceUpdateTable(doRerenderTable) then _}
            <div class="table">
                {#each alphaData as alphaList, row}
                    <div class="column">
                        {#each alphaList as al, col}
                            <span
                                class={cx({ ['match']: al === randomAlpha })}
                                id={`hiragana-${row * 5 + col}`}
                                on:click={() => setAlpha(row, col)}>{al}</span
                            >
                        {/each}
                    </div>
                {/each}
            </div>
        {/await}
        <div class="type_box">
            type: {alphaType}
            <div>
                <button on:click={() => { alphaType = 'hira' }}>hiragana</button>
                <button on:click={() => { alphaType = 'kana' }}>katakana</button>
            </div>
        </div>
        <div class="random_container">
            {#if mode === 'practice'}
                <span>remaining: {practiceAlpha?.length}</span>
            {/if}
            <div style={`color: ${brushColor};`}>
                {#if mode === 'normal' || (mode === 'practice' && practiceAlpha?.length)}
                    <h1>{randomAlpha}</h1>
                {/if}
                {#if mode === 'practice' && !practiceAlpha?.length}
                    <h2>Practice Complete</h2>
                {/if}
            </div>
            <div class={cx({ ['hide']: mode !== 'normal' })}>
                <div>
                    <button on:click={prevAlpha}>prev</button>
                    <button on:click={nextAlpha}>next</button>
                </div>
                <div>
                    <button on:click={getNewAlpha}>random</button>
                </div>
                <div>
                    <button on:click={goPractice}>go practice</button>
                </div>
            </div>
            <div class={cx({ ['hide']: mode !== 'practice' })}>
                {#if practiceAlpha?.length}
                    <div>
                        <button on:click={nextPractice}>next</button>
                    </div>
                    <div>
                        <button on:click={goNormal}>cancel</button>
                    </div>
                {:else}
                    <button on:click={goNormal}>exit</button>
                    <button on:click={restartPractice}>restart</button>
                {/if}
            </div>
        </div>
    </div>

    {#await forceUpdate(doRerender) then _}
        <div on:click={next}>
            <DrawBoard
                {brushColor}
                {isCanDraw}
                {isCanErase}
                {isCanShowBg}
                {isCanShowBgToggle}
                {randomAlpha}
                {alphaType}
                {instructions}
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

        .hide {
            display: none;
        }
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

                &:hover {
                    background: lightgray;
                    cursor: pointer;
                }
            }
        }

        .match {
            background: lightpink;
        }
    }

    .type_box {
        display: flex;
        justify-self: flex-start;
        align-items: center;
        margin: 20px 0 -30px 20px;
        gap: 10px;
        
        div {
            display: flex;
            align-items: center;
            gap: 5px;
        }

        input {
            margin: 0;
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

        h2 {
            color: limegreen;
            font-size: 2rem;
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
