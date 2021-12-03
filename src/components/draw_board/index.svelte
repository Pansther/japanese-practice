<script type="ts">
    import cx from 'classnames'
    import repeat from 'lodash/repeat'

    import instructions from '../../constant/instruction.js'

    export let brushColor
    export let isCanDraw
    export let isCanErase
    export let isCanShowBg
    export let isCanShowBgToggle
    export let randomAlpha

    function hover(e) {
        if (isCanDraw) {
            e.target.style.background = brushColor
        }
        if (isCanErase) {
            e.target.style.background = 'unset'
        }
    }
</script>

<div class="drawing_container">
    <div
        class={cx('drawing', {
            ['hide_background']: !isCanShowBg && !isCanShowBgToggle,
        })}
        style={`background-image: url(https://www.nhk.or.jp/lesson/assets/images/letters/detail/hira/${randomAlpha}.png);`}
    >
        {#each repeat(' ', 60) as div}
            <div class="row">
                {#each repeat(' ', 40) as div}
                    <div class="column" on:mousemove={hover} />
                {/each}
            </div>
        {/each}
    </div>
    <div class="instruction_box">
        {#each Object.keys(instructions) as key}
            <div>
                {#each instructions[key] as ins}
                    <span>{ins}</span>
                {/each}
            </div>
        {/each}
    </div>
</div>

<style lang="scss">
    .drawing_container {
        display: flex;
        flex-direction: column;
        gap: 10px;

        .drawing {
            display: grid;
            user-select: none;
            background-position: center;
            background-size: contain;

            justify-content: center;
            grid-template-columns: repeat(60, 10px);

            .row {
                max-width: 400px;

                .column {
                    max-width: 10px;
                    height: 10px;
                    border: 1px solid rgba($color: #000000, $alpha: 0.1);

                    &:hover {
                        background: lightgray;
                    }
                }
            }
        }

        .instruction_box {
            display: flex;
            justify-content: flex-start;
            gap: 30px;

            div {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
            }
        }
    }

    .hide_background {
        background-image: none !important;
    }
</style>
