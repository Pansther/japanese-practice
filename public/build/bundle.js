
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function update_await_block_branch(info, ctx, dirty) {
        const child_ctx = ctx.slice();
        const { resolved } = info;
        if (info.current === info.then) {
            child_ctx[info.value] = resolved;
        }
        if (info.current === info.catch) {
            child_ctx[info.error] = resolved;
        }
        info.block.p(child_ctx, dirty);
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.2' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    /*!
      Copyright (c) 2018 Jed Watson.
      Licensed under the MIT License (MIT), see
      http://jedwatson.github.io/classnames
    */

    var classnames = createCommonjsModule(function (module) {
    /* global define */

    (function () {

    	var hasOwn = {}.hasOwnProperty;

    	function classNames() {
    		var classes = [];

    		for (var i = 0; i < arguments.length; i++) {
    			var arg = arguments[i];
    			if (!arg) continue;

    			var argType = typeof arg;

    			if (argType === 'string' || argType === 'number') {
    				classes.push(arg);
    			} else if (Array.isArray(arg)) {
    				if (arg.length) {
    					var inner = classNames.apply(null, arg);
    					if (inner) {
    						classes.push(inner);
    					}
    				}
    			} else if (argType === 'object') {
    				if (arg.toString === Object.prototype.toString) {
    					for (var key in arg) {
    						if (hasOwn.call(arg, key) && arg[key]) {
    							classes.push(key);
    						}
    					}
    				} else {
    					classes.push(arg.toString());
    				}
    			}
    		}

    		return classes.join(' ');
    	}

    	if (module.exports) {
    		classNames.default = classNames;
    		module.exports = classNames;
    	} else {
    		window.classNames = classNames;
    	}
    }());
    });

    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeFloor$1 = Math.floor,
        nativeRandom$1 = Math.random;

    /**
     * The base implementation of `_.random` without support for returning
     * floating-point numbers.
     *
     * @private
     * @param {number} lower The lower bound.
     * @param {number} upper The upper bound.
     * @returns {number} Returns the random number.
     */
    function baseRandom(lower, upper) {
      return lower + nativeFloor$1(nativeRandom$1() * (upper - lower + 1));
    }

    var _baseRandom = baseRandom;

    /**
     * Performs a
     * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
     * comparison between two values to determine if they are equivalent.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     * @example
     *
     * var object = { 'a': 1 };
     * var other = { 'a': 1 };
     *
     * _.eq(object, object);
     * // => true
     *
     * _.eq(object, other);
     * // => false
     *
     * _.eq('a', 'a');
     * // => true
     *
     * _.eq('a', Object('a'));
     * // => false
     *
     * _.eq(NaN, NaN);
     * // => true
     */
    function eq(value, other) {
      return value === other || (value !== value && other !== other);
    }

    var eq_1 = eq;

    /** Detect free variable `global` from Node.js. */

    var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;

    var _freeGlobal = freeGlobal;

    /** Detect free variable `self`. */
    var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

    /** Used as a reference to the global object. */
    var root = _freeGlobal || freeSelf || Function('return this')();

    var _root = root;

    /** Built-in value references. */
    var Symbol$1 = _root.Symbol;

    var _Symbol = Symbol$1;

    /** Used for built-in method references. */
    var objectProto$5 = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$3 = objectProto$5.hasOwnProperty;

    /**
     * Used to resolve the
     * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
     * of values.
     */
    var nativeObjectToString$1 = objectProto$5.toString;

    /** Built-in value references. */
    var symToStringTag$1 = _Symbol ? _Symbol.toStringTag : undefined;

    /**
     * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the raw `toStringTag`.
     */
    function getRawTag(value) {
      var isOwn = hasOwnProperty$3.call(value, symToStringTag$1),
          tag = value[symToStringTag$1];

      try {
        value[symToStringTag$1] = undefined;
        var unmasked = true;
      } catch (e) {}

      var result = nativeObjectToString$1.call(value);
      if (unmasked) {
        if (isOwn) {
          value[symToStringTag$1] = tag;
        } else {
          delete value[symToStringTag$1];
        }
      }
      return result;
    }

    var _getRawTag = getRawTag;

    /** Used for built-in method references. */
    var objectProto$4 = Object.prototype;

    /**
     * Used to resolve the
     * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
     * of values.
     */
    var nativeObjectToString = objectProto$4.toString;

    /**
     * Converts `value` to a string using `Object.prototype.toString`.
     *
     * @private
     * @param {*} value The value to convert.
     * @returns {string} Returns the converted string.
     */
    function objectToString(value) {
      return nativeObjectToString.call(value);
    }

    var _objectToString = objectToString;

    /** `Object#toString` result references. */
    var nullTag = '[object Null]',
        undefinedTag = '[object Undefined]';

    /** Built-in value references. */
    var symToStringTag = _Symbol ? _Symbol.toStringTag : undefined;

    /**
     * The base implementation of `getTag` without fallbacks for buggy environments.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the `toStringTag`.
     */
    function baseGetTag(value) {
      if (value == null) {
        return value === undefined ? undefinedTag : nullTag;
      }
      return (symToStringTag && symToStringTag in Object(value))
        ? _getRawTag(value)
        : _objectToString(value);
    }

    var _baseGetTag = baseGetTag;

    /**
     * Checks if `value` is the
     * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
     * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(_.noop);
     * // => true
     *
     * _.isObject(null);
     * // => false
     */
    function isObject(value) {
      var type = typeof value;
      return value != null && (type == 'object' || type == 'function');
    }

    var isObject_1 = isObject;

    /** `Object#toString` result references. */
    var asyncTag = '[object AsyncFunction]',
        funcTag$1 = '[object Function]',
        genTag = '[object GeneratorFunction]',
        proxyTag = '[object Proxy]';

    /**
     * Checks if `value` is classified as a `Function` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a function, else `false`.
     * @example
     *
     * _.isFunction(_);
     * // => true
     *
     * _.isFunction(/abc/);
     * // => false
     */
    function isFunction(value) {
      if (!isObject_1(value)) {
        return false;
      }
      // The use of `Object#toString` avoids issues with the `typeof` operator
      // in Safari 9 which returns 'object' for typed arrays and other constructors.
      var tag = _baseGetTag(value);
      return tag == funcTag$1 || tag == genTag || tag == asyncTag || tag == proxyTag;
    }

    var isFunction_1 = isFunction;

    /** Used as references for various `Number` constants. */
    var MAX_SAFE_INTEGER$3 = 9007199254740991;

    /**
     * Checks if `value` is a valid array-like length.
     *
     * **Note:** This method is loosely based on
     * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
     * @example
     *
     * _.isLength(3);
     * // => true
     *
     * _.isLength(Number.MIN_VALUE);
     * // => false
     *
     * _.isLength(Infinity);
     * // => false
     *
     * _.isLength('3');
     * // => false
     */
    function isLength(value) {
      return typeof value == 'number' &&
        value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER$3;
    }

    var isLength_1 = isLength;

    /**
     * Checks if `value` is array-like. A value is considered array-like if it's
     * not a function and has a `value.length` that's an integer greater than or
     * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
     * @example
     *
     * _.isArrayLike([1, 2, 3]);
     * // => true
     *
     * _.isArrayLike(document.body.children);
     * // => true
     *
     * _.isArrayLike('abc');
     * // => true
     *
     * _.isArrayLike(_.noop);
     * // => false
     */
    function isArrayLike(value) {
      return value != null && isLength_1(value.length) && !isFunction_1(value);
    }

    var isArrayLike_1 = isArrayLike;

    /** Used as references for various `Number` constants. */
    var MAX_SAFE_INTEGER$2 = 9007199254740991;

    /** Used to detect unsigned integer values. */
    var reIsUint = /^(?:0|[1-9]\d*)$/;

    /**
     * Checks if `value` is a valid array-like index.
     *
     * @private
     * @param {*} value The value to check.
     * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
     * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
     */
    function isIndex(value, length) {
      var type = typeof value;
      length = length == null ? MAX_SAFE_INTEGER$2 : length;

      return !!length &&
        (type == 'number' ||
          (type != 'symbol' && reIsUint.test(value))) &&
            (value > -1 && value % 1 == 0 && value < length);
    }

    var _isIndex = isIndex;

    /**
     * Checks if the given arguments are from an iteratee call.
     *
     * @private
     * @param {*} value The potential iteratee value argument.
     * @param {*} index The potential iteratee index or key argument.
     * @param {*} object The potential iteratee object argument.
     * @returns {boolean} Returns `true` if the arguments are from an iteratee call,
     *  else `false`.
     */
    function isIterateeCall(value, index, object) {
      if (!isObject_1(object)) {
        return false;
      }
      var type = typeof index;
      if (type == 'number'
            ? (isArrayLike_1(object) && _isIndex(index, object.length))
            : (type == 'string' && index in object)
          ) {
        return eq_1(object[index], value);
      }
      return false;
    }

    var _isIterateeCall = isIterateeCall;

    /** Used to match a single whitespace character. */
    var reWhitespace = /\s/;

    /**
     * Used by `_.trim` and `_.trimEnd` to get the index of the last non-whitespace
     * character of `string`.
     *
     * @private
     * @param {string} string The string to inspect.
     * @returns {number} Returns the index of the last non-whitespace character.
     */
    function trimmedEndIndex(string) {
      var index = string.length;

      while (index-- && reWhitespace.test(string.charAt(index))) {}
      return index;
    }

    var _trimmedEndIndex = trimmedEndIndex;

    /** Used to match leading whitespace. */
    var reTrimStart = /^\s+/;

    /**
     * The base implementation of `_.trim`.
     *
     * @private
     * @param {string} string The string to trim.
     * @returns {string} Returns the trimmed string.
     */
    function baseTrim(string) {
      return string
        ? string.slice(0, _trimmedEndIndex(string) + 1).replace(reTrimStart, '')
        : string;
    }

    var _baseTrim = baseTrim;

    /**
     * Checks if `value` is object-like. A value is object-like if it's not `null`
     * and has a `typeof` result of "object".
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
     * @example
     *
     * _.isObjectLike({});
     * // => true
     *
     * _.isObjectLike([1, 2, 3]);
     * // => true
     *
     * _.isObjectLike(_.noop);
     * // => false
     *
     * _.isObjectLike(null);
     * // => false
     */
    function isObjectLike(value) {
      return value != null && typeof value == 'object';
    }

    var isObjectLike_1 = isObjectLike;

    /** `Object#toString` result references. */
    var symbolTag = '[object Symbol]';

    /**
     * Checks if `value` is classified as a `Symbol` primitive or object.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
     * @example
     *
     * _.isSymbol(Symbol.iterator);
     * // => true
     *
     * _.isSymbol('abc');
     * // => false
     */
    function isSymbol(value) {
      return typeof value == 'symbol' ||
        (isObjectLike_1(value) && _baseGetTag(value) == symbolTag);
    }

    var isSymbol_1 = isSymbol;

    /** Used as references for various `Number` constants. */
    var NAN = 0 / 0;

    /** Used to detect bad signed hexadecimal string values. */
    var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

    /** Used to detect binary string values. */
    var reIsBinary = /^0b[01]+$/i;

    /** Used to detect octal string values. */
    var reIsOctal = /^0o[0-7]+$/i;

    /** Built-in method references without a dependency on `root`. */
    var freeParseInt = parseInt;

    /**
     * Converts `value` to a number.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to process.
     * @returns {number} Returns the number.
     * @example
     *
     * _.toNumber(3.2);
     * // => 3.2
     *
     * _.toNumber(Number.MIN_VALUE);
     * // => 5e-324
     *
     * _.toNumber(Infinity);
     * // => Infinity
     *
     * _.toNumber('3.2');
     * // => 3.2
     */
    function toNumber(value) {
      if (typeof value == 'number') {
        return value;
      }
      if (isSymbol_1(value)) {
        return NAN;
      }
      if (isObject_1(value)) {
        var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
        value = isObject_1(other) ? (other + '') : other;
      }
      if (typeof value != 'string') {
        return value === 0 ? value : +value;
      }
      value = _baseTrim(value);
      var isBinary = reIsBinary.test(value);
      return (isBinary || reIsOctal.test(value))
        ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
        : (reIsBadHex.test(value) ? NAN : +value);
    }

    var toNumber_1 = toNumber;

    /** Used as references for various `Number` constants. */
    var INFINITY$1 = 1 / 0,
        MAX_INTEGER = 1.7976931348623157e+308;

    /**
     * Converts `value` to a finite number.
     *
     * @static
     * @memberOf _
     * @since 4.12.0
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {number} Returns the converted number.
     * @example
     *
     * _.toFinite(3.2);
     * // => 3.2
     *
     * _.toFinite(Number.MIN_VALUE);
     * // => 5e-324
     *
     * _.toFinite(Infinity);
     * // => 1.7976931348623157e+308
     *
     * _.toFinite('3.2');
     * // => 3.2
     */
    function toFinite(value) {
      if (!value) {
        return value === 0 ? value : 0;
      }
      value = toNumber_1(value);
      if (value === INFINITY$1 || value === -INFINITY$1) {
        var sign = (value < 0 ? -1 : 1);
        return sign * MAX_INTEGER;
      }
      return value === value ? value : 0;
    }

    var toFinite_1 = toFinite;

    /** Built-in method references without a dependency on `root`. */
    var freeParseFloat = parseFloat;

    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeMin$1 = Math.min,
        nativeRandom = Math.random;

    /**
     * Produces a random number between the inclusive `lower` and `upper` bounds.
     * If only one argument is provided a number between `0` and the given number
     * is returned. If `floating` is `true`, or either `lower` or `upper` are
     * floats, a floating-point number is returned instead of an integer.
     *
     * **Note:** JavaScript follows the IEEE-754 standard for resolving
     * floating-point values which can produce unexpected results.
     *
     * @static
     * @memberOf _
     * @since 0.7.0
     * @category Number
     * @param {number} [lower=0] The lower bound.
     * @param {number} [upper=1] The upper bound.
     * @param {boolean} [floating] Specify returning a floating-point number.
     * @returns {number} Returns the random number.
     * @example
     *
     * _.random(0, 5);
     * // => an integer between 0 and 5
     *
     * _.random(5);
     * // => also an integer between 0 and 5
     *
     * _.random(5, true);
     * // => a floating-point number between 0 and 5
     *
     * _.random(1.2, 5.2);
     * // => a floating-point number between 1.2 and 5.2
     */
    function random(lower, upper, floating) {
      if (floating && typeof floating != 'boolean' && _isIterateeCall(lower, upper, floating)) {
        upper = floating = undefined;
      }
      if (floating === undefined) {
        if (typeof upper == 'boolean') {
          floating = upper;
          upper = undefined;
        }
        else if (typeof lower == 'boolean') {
          floating = lower;
          lower = undefined;
        }
      }
      if (lower === undefined && upper === undefined) {
        lower = 0;
        upper = 1;
      }
      else {
        lower = toFinite_1(lower);
        if (upper === undefined) {
          upper = lower;
          lower = 0;
        } else {
          upper = toFinite_1(upper);
        }
      }
      if (lower > upper) {
        var temp = lower;
        lower = upper;
        upper = temp;
      }
      if (floating || lower % 1 || upper % 1) {
        var rand = nativeRandom();
        return nativeMin$1(lower + (rand * (upper - lower + freeParseFloat('1e-' + ((rand + '').length - 1)))), upper);
      }
      return _baseRandom(lower, upper);
    }

    var random_1 = random;

    /**
     * The base implementation of `_.times` without support for iteratee shorthands
     * or max array length checks.
     *
     * @private
     * @param {number} n The number of times to invoke `iteratee`.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Array} Returns the array of results.
     */
    function baseTimes(n, iteratee) {
      var index = -1,
          result = Array(n);

      while (++index < n) {
        result[index] = iteratee(index);
      }
      return result;
    }

    var _baseTimes = baseTimes;

    /**
     * This method returns the first argument it receives.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Util
     * @param {*} value Any value.
     * @returns {*} Returns `value`.
     * @example
     *
     * var object = { 'a': 1 };
     *
     * console.log(_.identity(object) === object);
     * // => true
     */
    function identity(value) {
      return value;
    }

    var identity_1 = identity;

    /**
     * Casts `value` to `identity` if it's not a function.
     *
     * @private
     * @param {*} value The value to inspect.
     * @returns {Function} Returns cast function.
     */
    function castFunction(value) {
      return typeof value == 'function' ? value : identity_1;
    }

    var _castFunction = castFunction;

    /**
     * Converts `value` to an integer.
     *
     * **Note:** This method is loosely based on
     * [`ToInteger`](http://www.ecma-international.org/ecma-262/7.0/#sec-tointeger).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {number} Returns the converted integer.
     * @example
     *
     * _.toInteger(3.2);
     * // => 3
     *
     * _.toInteger(Number.MIN_VALUE);
     * // => 0
     *
     * _.toInteger(Infinity);
     * // => 1.7976931348623157e+308
     *
     * _.toInteger('3.2');
     * // => 3
     */
    function toInteger(value) {
      var result = toFinite_1(value),
          remainder = result % 1;

      return result === result ? (remainder ? result - remainder : result) : 0;
    }

    var toInteger_1 = toInteger;

    /** Used as references for various `Number` constants. */
    var MAX_SAFE_INTEGER$1 = 9007199254740991;

    /** Used as references for the maximum length and index of an array. */
    var MAX_ARRAY_LENGTH = 4294967295;

    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeMin = Math.min;

    /**
     * Invokes the iteratee `n` times, returning an array of the results of
     * each invocation. The iteratee is invoked with one argument; (index).
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Util
     * @param {number} n The number of times to invoke `iteratee`.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the array of results.
     * @example
     *
     * _.times(3, String);
     * // => ['0', '1', '2']
     *
     *  _.times(4, _.constant(0));
     * // => [0, 0, 0, 0]
     */
    function times(n, iteratee) {
      n = toInteger_1(n);
      if (n < 1 || n > MAX_SAFE_INTEGER$1) {
        return [];
      }
      var index = MAX_ARRAY_LENGTH,
          length = nativeMin(n, MAX_ARRAY_LENGTH);

      iteratee = _castFunction(iteratee);
      n -= MAX_ARRAY_LENGTH;

      var result = _baseTimes(length, iteratee);
      while (++index < n) {
        iteratee(index);
      }
      return result;
    }

    var times_1 = times;

    /**
     * Copies the values of `source` to `array`.
     *
     * @private
     * @param {Array} source The array to copy values from.
     * @param {Array} [array=[]] The array to copy values to.
     * @returns {Array} Returns `array`.
     */
    function copyArray(source, array) {
      var index = -1,
          length = source.length;

      array || (array = Array(length));
      while (++index < length) {
        array[index] = source[index];
      }
      return array;
    }

    var _copyArray = copyArray;

    /**
     * A specialized version of `_.shuffle` which mutates and sets the size of `array`.
     *
     * @private
     * @param {Array} array The array to shuffle.
     * @param {number} [size=array.length] The size of `array`.
     * @returns {Array} Returns `array`.
     */
    function shuffleSelf(array, size) {
      var index = -1,
          length = array.length,
          lastIndex = length - 1;

      size = size === undefined ? length : size;
      while (++index < size) {
        var rand = _baseRandom(index, lastIndex),
            value = array[rand];

        array[rand] = array[index];
        array[index] = value;
      }
      array.length = size;
      return array;
    }

    var _shuffleSelf = shuffleSelf;

    /**
     * A specialized version of `_.shuffle` for arrays.
     *
     * @private
     * @param {Array} array The array to shuffle.
     * @returns {Array} Returns the new shuffled array.
     */
    function arrayShuffle(array) {
      return _shuffleSelf(_copyArray(array));
    }

    var _arrayShuffle = arrayShuffle;

    /**
     * A specialized version of `_.map` for arrays without support for iteratee
     * shorthands.
     *
     * @private
     * @param {Array} [array] The array to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Array} Returns the new mapped array.
     */
    function arrayMap(array, iteratee) {
      var index = -1,
          length = array == null ? 0 : array.length,
          result = Array(length);

      while (++index < length) {
        result[index] = iteratee(array[index], index, array);
      }
      return result;
    }

    var _arrayMap = arrayMap;

    /**
     * The base implementation of `_.values` and `_.valuesIn` which creates an
     * array of `object` property values corresponding to the property names
     * of `props`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Array} props The property names to get values for.
     * @returns {Object} Returns the array of property values.
     */
    function baseValues(object, props) {
      return _arrayMap(props, function(key) {
        return object[key];
      });
    }

    var _baseValues = baseValues;

    /** `Object#toString` result references. */
    var argsTag$1 = '[object Arguments]';

    /**
     * The base implementation of `_.isArguments`.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an `arguments` object,
     */
    function baseIsArguments(value) {
      return isObjectLike_1(value) && _baseGetTag(value) == argsTag$1;
    }

    var _baseIsArguments = baseIsArguments;

    /** Used for built-in method references. */
    var objectProto$3 = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$2 = objectProto$3.hasOwnProperty;

    /** Built-in value references. */
    var propertyIsEnumerable = objectProto$3.propertyIsEnumerable;

    /**
     * Checks if `value` is likely an `arguments` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an `arguments` object,
     *  else `false`.
     * @example
     *
     * _.isArguments(function() { return arguments; }());
     * // => true
     *
     * _.isArguments([1, 2, 3]);
     * // => false
     */
    var isArguments = _baseIsArguments(function() { return arguments; }()) ? _baseIsArguments : function(value) {
      return isObjectLike_1(value) && hasOwnProperty$2.call(value, 'callee') &&
        !propertyIsEnumerable.call(value, 'callee');
    };

    var isArguments_1 = isArguments;

    /**
     * Checks if `value` is classified as an `Array` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an array, else `false`.
     * @example
     *
     * _.isArray([1, 2, 3]);
     * // => true
     *
     * _.isArray(document.body.children);
     * // => false
     *
     * _.isArray('abc');
     * // => false
     *
     * _.isArray(_.noop);
     * // => false
     */
    var isArray = Array.isArray;

    var isArray_1 = isArray;

    /**
     * This method returns `false`.
     *
     * @static
     * @memberOf _
     * @since 4.13.0
     * @category Util
     * @returns {boolean} Returns `false`.
     * @example
     *
     * _.times(2, _.stubFalse);
     * // => [false, false]
     */
    function stubFalse() {
      return false;
    }

    var stubFalse_1 = stubFalse;

    var isBuffer_1 = createCommonjsModule(function (module, exports) {
    /** Detect free variable `exports`. */
    var freeExports = exports && !exports.nodeType && exports;

    /** Detect free variable `module`. */
    var freeModule = freeExports && 'object' == 'object' && module && !module.nodeType && module;

    /** Detect the popular CommonJS extension `module.exports`. */
    var moduleExports = freeModule && freeModule.exports === freeExports;

    /** Built-in value references. */
    var Buffer = moduleExports ? _root.Buffer : undefined;

    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined;

    /**
     * Checks if `value` is a buffer.
     *
     * @static
     * @memberOf _
     * @since 4.3.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
     * @example
     *
     * _.isBuffer(new Buffer(2));
     * // => true
     *
     * _.isBuffer(new Uint8Array(2));
     * // => false
     */
    var isBuffer = nativeIsBuffer || stubFalse_1;

    module.exports = isBuffer;
    });

    /** `Object#toString` result references. */
    var argsTag = '[object Arguments]',
        arrayTag = '[object Array]',
        boolTag = '[object Boolean]',
        dateTag = '[object Date]',
        errorTag = '[object Error]',
        funcTag = '[object Function]',
        mapTag = '[object Map]',
        numberTag = '[object Number]',
        objectTag = '[object Object]',
        regexpTag = '[object RegExp]',
        setTag = '[object Set]',
        stringTag = '[object String]',
        weakMapTag = '[object WeakMap]';

    var arrayBufferTag = '[object ArrayBuffer]',
        dataViewTag = '[object DataView]',
        float32Tag = '[object Float32Array]',
        float64Tag = '[object Float64Array]',
        int8Tag = '[object Int8Array]',
        int16Tag = '[object Int16Array]',
        int32Tag = '[object Int32Array]',
        uint8Tag = '[object Uint8Array]',
        uint8ClampedTag = '[object Uint8ClampedArray]',
        uint16Tag = '[object Uint16Array]',
        uint32Tag = '[object Uint32Array]';

    /** Used to identify `toStringTag` values of typed arrays. */
    var typedArrayTags = {};
    typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
    typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
    typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
    typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
    typedArrayTags[uint32Tag] = true;
    typedArrayTags[argsTag] = typedArrayTags[arrayTag] =
    typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
    typedArrayTags[dataViewTag] = typedArrayTags[dateTag] =
    typedArrayTags[errorTag] = typedArrayTags[funcTag] =
    typedArrayTags[mapTag] = typedArrayTags[numberTag] =
    typedArrayTags[objectTag] = typedArrayTags[regexpTag] =
    typedArrayTags[setTag] = typedArrayTags[stringTag] =
    typedArrayTags[weakMapTag] = false;

    /**
     * The base implementation of `_.isTypedArray` without Node.js optimizations.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
     */
    function baseIsTypedArray(value) {
      return isObjectLike_1(value) &&
        isLength_1(value.length) && !!typedArrayTags[_baseGetTag(value)];
    }

    var _baseIsTypedArray = baseIsTypedArray;

    /**
     * The base implementation of `_.unary` without support for storing metadata.
     *
     * @private
     * @param {Function} func The function to cap arguments for.
     * @returns {Function} Returns the new capped function.
     */
    function baseUnary(func) {
      return function(value) {
        return func(value);
      };
    }

    var _baseUnary = baseUnary;

    var _nodeUtil = createCommonjsModule(function (module, exports) {
    /** Detect free variable `exports`. */
    var freeExports = exports && !exports.nodeType && exports;

    /** Detect free variable `module`. */
    var freeModule = freeExports && 'object' == 'object' && module && !module.nodeType && module;

    /** Detect the popular CommonJS extension `module.exports`. */
    var moduleExports = freeModule && freeModule.exports === freeExports;

    /** Detect free variable `process` from Node.js. */
    var freeProcess = moduleExports && _freeGlobal.process;

    /** Used to access faster Node.js helpers. */
    var nodeUtil = (function() {
      try {
        // Use `util.types` for Node.js 10+.
        var types = freeModule && freeModule.require && freeModule.require('util').types;

        if (types) {
          return types;
        }

        // Legacy `process.binding('util')` for Node.js < 10.
        return freeProcess && freeProcess.binding && freeProcess.binding('util');
      } catch (e) {}
    }());

    module.exports = nodeUtil;
    });

    /* Node.js helper references. */
    var nodeIsTypedArray = _nodeUtil && _nodeUtil.isTypedArray;

    /**
     * Checks if `value` is classified as a typed array.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
     * @example
     *
     * _.isTypedArray(new Uint8Array);
     * // => true
     *
     * _.isTypedArray([]);
     * // => false
     */
    var isTypedArray = nodeIsTypedArray ? _baseUnary(nodeIsTypedArray) : _baseIsTypedArray;

    var isTypedArray_1 = isTypedArray;

    /** Used for built-in method references. */
    var objectProto$2 = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$1 = objectProto$2.hasOwnProperty;

    /**
     * Creates an array of the enumerable property names of the array-like `value`.
     *
     * @private
     * @param {*} value The value to query.
     * @param {boolean} inherited Specify returning inherited property names.
     * @returns {Array} Returns the array of property names.
     */
    function arrayLikeKeys(value, inherited) {
      var isArr = isArray_1(value),
          isArg = !isArr && isArguments_1(value),
          isBuff = !isArr && !isArg && isBuffer_1(value),
          isType = !isArr && !isArg && !isBuff && isTypedArray_1(value),
          skipIndexes = isArr || isArg || isBuff || isType,
          result = skipIndexes ? _baseTimes(value.length, String) : [],
          length = result.length;

      for (var key in value) {
        if ((inherited || hasOwnProperty$1.call(value, key)) &&
            !(skipIndexes && (
               // Safari 9 has enumerable `arguments.length` in strict mode.
               key == 'length' ||
               // Node.js 0.10 has enumerable non-index properties on buffers.
               (isBuff && (key == 'offset' || key == 'parent')) ||
               // PhantomJS 2 has enumerable non-index properties on typed arrays.
               (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
               // Skip index properties.
               _isIndex(key, length)
            ))) {
          result.push(key);
        }
      }
      return result;
    }

    var _arrayLikeKeys = arrayLikeKeys;

    /** Used for built-in method references. */
    var objectProto$1 = Object.prototype;

    /**
     * Checks if `value` is likely a prototype object.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
     */
    function isPrototype(value) {
      var Ctor = value && value.constructor,
          proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto$1;

      return value === proto;
    }

    var _isPrototype = isPrototype;

    /**
     * Creates a unary function that invokes `func` with its argument transformed.
     *
     * @private
     * @param {Function} func The function to wrap.
     * @param {Function} transform The argument transform.
     * @returns {Function} Returns the new function.
     */
    function overArg(func, transform) {
      return function(arg) {
        return func(transform(arg));
      };
    }

    var _overArg = overArg;

    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeKeys = _overArg(Object.keys, Object);

    var _nativeKeys = nativeKeys;

    /** Used for built-in method references. */
    var objectProto = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty = objectProto.hasOwnProperty;

    /**
     * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     */
    function baseKeys(object) {
      if (!_isPrototype(object)) {
        return _nativeKeys(object);
      }
      var result = [];
      for (var key in Object(object)) {
        if (hasOwnProperty.call(object, key) && key != 'constructor') {
          result.push(key);
        }
      }
      return result;
    }

    var _baseKeys = baseKeys;

    /**
     * Creates an array of the own enumerable property names of `object`.
     *
     * **Note:** Non-object values are coerced to objects. See the
     * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
     * for more details.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.keys(new Foo);
     * // => ['a', 'b'] (iteration order is not guaranteed)
     *
     * _.keys('hi');
     * // => ['0', '1']
     */
    function keys(object) {
      return isArrayLike_1(object) ? _arrayLikeKeys(object) : _baseKeys(object);
    }

    var keys_1 = keys;

    /**
     * Creates an array of the own enumerable string keyed property values of `object`.
     *
     * **Note:** Non-object values are coerced to objects.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property values.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.values(new Foo);
     * // => [1, 2] (iteration order is not guaranteed)
     *
     * _.values('hi');
     * // => ['h', 'i']
     */
    function values(object) {
      return object == null ? [] : _baseValues(object, keys_1(object));
    }

    var values_1 = values;

    /**
     * The base implementation of `_.shuffle`.
     *
     * @private
     * @param {Array|Object} collection The collection to shuffle.
     * @returns {Array} Returns the new shuffled array.
     */
    function baseShuffle(collection) {
      return _shuffleSelf(values_1(collection));
    }

    var _baseShuffle = baseShuffle;

    /**
     * Creates an array of shuffled values, using a version of the
     * [Fisher-Yates shuffle](https://en.wikipedia.org/wiki/Fisher-Yates_shuffle).
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Collection
     * @param {Array|Object} collection The collection to shuffle.
     * @returns {Array} Returns the new shuffled array.
     * @example
     *
     * _.shuffle([1, 2, 3, 4]);
     * // => [4, 1, 3, 2]
     */
    function shuffle(collection) {
      var func = isArray_1(collection) ? _arrayShuffle : _baseShuffle;
      return func(collection);
    }

    var shuffle_1 = shuffle;

    /**
     * The base implementation of `_.slice` without an iteratee call guard.
     *
     * @private
     * @param {Array} array The array to slice.
     * @param {number} [start=0] The start position.
     * @param {number} [end=array.length] The end position.
     * @returns {Array} Returns the slice of `array`.
     */
    function baseSlice(array, start, end) {
      var index = -1,
          length = array.length;

      if (start < 0) {
        start = -start > length ? 0 : (length + start);
      }
      end = end > length ? length : end;
      if (end < 0) {
        end += length;
      }
      length = start > end ? 0 : ((end - start) >>> 0);
      start >>>= 0;

      var result = Array(length);
      while (++index < length) {
        result[index] = array[index + start];
      }
      return result;
    }

    var _baseSlice = baseSlice;

    /**
     * Creates a slice of `array` with `n` elements taken from the end.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Array
     * @param {Array} array The array to query.
     * @param {number} [n=1] The number of elements to take.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {Array} Returns the slice of `array`.
     * @example
     *
     * _.takeRight([1, 2, 3]);
     * // => [3]
     *
     * _.takeRight([1, 2, 3], 2);
     * // => [2, 3]
     *
     * _.takeRight([1, 2, 3], 5);
     * // => [1, 2, 3]
     *
     * _.takeRight([1, 2, 3], 0);
     * // => []
     */
    function takeRight(array, n, guard) {
      var length = array == null ? 0 : array.length;
      if (!length) {
        return [];
      }
      n = (guard || n === undefined) ? 1 : toInteger_1(n);
      n = length - n;
      return _baseSlice(array, n < 0 ? 0 : n, length);
    }

    var takeRight_1 = takeRight;

    /** Used as references for various `Number` constants. */
    var MAX_SAFE_INTEGER = 9007199254740991;

    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeFloor = Math.floor;

    /**
     * The base implementation of `_.repeat` which doesn't coerce arguments.
     *
     * @private
     * @param {string} string The string to repeat.
     * @param {number} n The number of times to repeat the string.
     * @returns {string} Returns the repeated string.
     */
    function baseRepeat(string, n) {
      var result = '';
      if (!string || n < 1 || n > MAX_SAFE_INTEGER) {
        return result;
      }
      // Leverage the exponentiation by squaring algorithm for a faster repeat.
      // See https://en.wikipedia.org/wiki/Exponentiation_by_squaring for more details.
      do {
        if (n % 2) {
          result += string;
        }
        n = nativeFloor(n / 2);
        if (n) {
          string += string;
        }
      } while (n);

      return result;
    }

    var _baseRepeat = baseRepeat;

    /** Used as references for various `Number` constants. */
    var INFINITY = 1 / 0;

    /** Used to convert symbols to primitives and strings. */
    var symbolProto = _Symbol ? _Symbol.prototype : undefined,
        symbolToString = symbolProto ? symbolProto.toString : undefined;

    /**
     * The base implementation of `_.toString` which doesn't convert nullish
     * values to empty strings.
     *
     * @private
     * @param {*} value The value to process.
     * @returns {string} Returns the string.
     */
    function baseToString(value) {
      // Exit early for strings to avoid a performance hit in some environments.
      if (typeof value == 'string') {
        return value;
      }
      if (isArray_1(value)) {
        // Recursively convert values (susceptible to call stack limits).
        return _arrayMap(value, baseToString) + '';
      }
      if (isSymbol_1(value)) {
        return symbolToString ? symbolToString.call(value) : '';
      }
      var result = (value + '');
      return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
    }

    var _baseToString = baseToString;

    /**
     * Converts `value` to a string. An empty string is returned for `null`
     * and `undefined` values. The sign of `-0` is preserved.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {string} Returns the converted string.
     * @example
     *
     * _.toString(null);
     * // => ''
     *
     * _.toString(-0);
     * // => '-0'
     *
     * _.toString([1, 2, 3]);
     * // => '1,2,3'
     */
    function toString(value) {
      return value == null ? '' : _baseToString(value);
    }

    var toString_1 = toString;

    /**
     * Repeats the given string `n` times.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category String
     * @param {string} [string=''] The string to repeat.
     * @param {number} [n=1] The number of times to repeat the string.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {string} Returns the repeated string.
     * @example
     *
     * _.repeat('*', 3);
     * // => '***'
     *
     * _.repeat('abc', 2);
     * // => 'abcabc'
     *
     * _.repeat('abc', 0);
     * // => ''
     */
    function repeat(string, n, guard) {
      if ((guard ? _isIterateeCall(string, n, guard) : n === undefined)) {
        n = 1;
      } else {
        n = toInteger_1(n);
      }
      return _baseRepeat(toString_1(string), n);
    }

    var repeat_1 = repeat;

    var instructions = {
        press: [
            'Press "Q" to prev',
            'Press "W" to random',
            'Press "E" to next',
            'Press "F" to toggle show alpha',
            'Press "Space" to clear board',
        ],
        hold: ['Hold "A" to draw', 'Hold "S" to erase', 'Hold "D" to show alpha'],
        click: ['Click to next'],
    };

    /* src\components\draw_board\index.svelte generated by Svelte v3.44.2 */

    const { Object: Object_1 } = globals;
    const file$2 = "src\\components\\draw_board\\index.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    function get_each_context_2$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	return child_ctx;
    }

    // (29:16) {#each repeat(' ', 40) as div}
    function create_each_block_3(ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "column svelte-26pwle");
    			add_location(div, file$2, 29, 20, 916);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (!mounted) {
    				dispose = listen_dev(div, "mousemove", /*hover*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(29:16) {#each repeat(' ', 40) as div}",
    		ctx
    	});

    	return block;
    }

    // (27:8) {#each repeat(' ', 60) as div}
    function create_each_block_2$1(ctx) {
    	let div;
    	let t;
    	let each_value_3 = repeat_1(' ', 40);
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			attr_dev(div, "class", "row svelte-26pwle");
    			add_location(div, file$2, 27, 12, 829);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*hover*/ 8) {
    				each_value_3 = repeat_1(' ', 40);
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_3.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2$1.name,
    		type: "each",
    		source: "(27:8) {#each repeat(' ', 60) as div}",
    		ctx
    	});

    	return block;
    }

    // (38:16) {#each instructions[key] as ins}
    function create_each_block_1$1(ctx) {
    	let span;
    	let t_value = /*ins*/ ctx[10] + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			add_location(span, file$2, 38, 20, 1209);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(38:16) {#each instructions[key] as ins}",
    		ctx
    	});

    	return block;
    }

    // (36:8) {#each Object.keys(instructions) as key}
    function create_each_block$1(ctx) {
    	let div;
    	let t;
    	let each_value_1 = instructions[/*key*/ ctx[7]];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			attr_dev(div, "class", "svelte-26pwle");
    			add_location(div, file$2, 36, 12, 1132);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*instructions, Object*/ 0) {
    				each_value_1 = instructions[/*key*/ ctx[7]];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(36:8) {#each Object.keys(instructions) as key}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div2;
    	let div0;
    	let div0_class_value;
    	let div0_style_value;
    	let t;
    	let div1;
    	let each_value_2 = repeat_1(' ', 60);
    	validate_each_argument(each_value_2);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_1[i] = create_each_block_2$1(get_each_context_2$1(ctx, each_value_2, i));
    	}

    	let each_value = Object.keys(instructions);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", div0_class_value = "" + (null_to_empty(classnames('drawing', {
    				['hide_background']: !/*isCanShowBg*/ ctx[0] && !/*isCanShowBgToggle*/ ctx[1]
    			})) + " svelte-26pwle"));

    			attr_dev(div0, "style", div0_style_value = `background-image: url(https://www.nhk.or.jp/lesson/assets/images/letters/detail/hira/${/*randomAlpha*/ ctx[2]}.png);`);
    			add_location(div0, file$2, 20, 4, 524);
    			attr_dev(div1, "class", "instruction_box svelte-26pwle");
    			add_location(div1, file$2, 34, 4, 1039);
    			attr_dev(div2, "class", "drawing_container svelte-26pwle");
    			add_location(div2, file$2, 19, 0, 487);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div0, null);
    			}

    			append_dev(div2, t);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*repeat, hover*/ 8) {
    				each_value_2 = repeat_1(' ', 60);
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2$1(ctx, each_value_2, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_2$1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_2.length;
    			}

    			if (dirty & /*isCanShowBg, isCanShowBgToggle*/ 3 && div0_class_value !== (div0_class_value = "" + (null_to_empty(classnames('drawing', {
    				['hide_background']: !/*isCanShowBg*/ ctx[0] && !/*isCanShowBgToggle*/ ctx[1]
    			})) + " svelte-26pwle"))) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			if (dirty & /*randomAlpha*/ 4 && div0_style_value !== (div0_style_value = `background-image: url(https://www.nhk.or.jp/lesson/assets/images/letters/detail/hira/${/*randomAlpha*/ ctx[2]}.png);`)) {
    				attr_dev(div0, "style", div0_style_value);
    			}

    			if (dirty & /*instructions, Object*/ 0) {
    				each_value = Object.keys(instructions);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Draw_board', slots, []);
    	let { brushColor } = $$props;
    	let { isCanDraw } = $$props;
    	let { isCanErase } = $$props;
    	let { isCanShowBg } = $$props;
    	let { isCanShowBgToggle } = $$props;
    	let { randomAlpha } = $$props;

    	function hover(e) {
    		if (isCanDraw) {
    			e.target.style.background = brushColor;
    		}

    		if (isCanErase) {
    			e.target.style.background = 'unset';
    		}
    	}

    	const writable_props = [
    		'brushColor',
    		'isCanDraw',
    		'isCanErase',
    		'isCanShowBg',
    		'isCanShowBgToggle',
    		'randomAlpha'
    	];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Draw_board> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('brushColor' in $$props) $$invalidate(4, brushColor = $$props.brushColor);
    		if ('isCanDraw' in $$props) $$invalidate(5, isCanDraw = $$props.isCanDraw);
    		if ('isCanErase' in $$props) $$invalidate(6, isCanErase = $$props.isCanErase);
    		if ('isCanShowBg' in $$props) $$invalidate(0, isCanShowBg = $$props.isCanShowBg);
    		if ('isCanShowBgToggle' in $$props) $$invalidate(1, isCanShowBgToggle = $$props.isCanShowBgToggle);
    		if ('randomAlpha' in $$props) $$invalidate(2, randomAlpha = $$props.randomAlpha);
    	};

    	$$self.$capture_state = () => ({
    		cx: classnames,
    		repeat: repeat_1,
    		instructions,
    		brushColor,
    		isCanDraw,
    		isCanErase,
    		isCanShowBg,
    		isCanShowBgToggle,
    		randomAlpha,
    		hover
    	});

    	$$self.$inject_state = $$props => {
    		if ('brushColor' in $$props) $$invalidate(4, brushColor = $$props.brushColor);
    		if ('isCanDraw' in $$props) $$invalidate(5, isCanDraw = $$props.isCanDraw);
    		if ('isCanErase' in $$props) $$invalidate(6, isCanErase = $$props.isCanErase);
    		if ('isCanShowBg' in $$props) $$invalidate(0, isCanShowBg = $$props.isCanShowBg);
    		if ('isCanShowBgToggle' in $$props) $$invalidate(1, isCanShowBgToggle = $$props.isCanShowBgToggle);
    		if ('randomAlpha' in $$props) $$invalidate(2, randomAlpha = $$props.randomAlpha);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		isCanShowBg,
    		isCanShowBgToggle,
    		randomAlpha,
    		hover,
    		brushColor,
    		isCanDraw,
    		isCanErase
    	];
    }

    class Draw_board extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			brushColor: 4,
    			isCanDraw: 5,
    			isCanErase: 6,
    			isCanShowBg: 0,
    			isCanShowBgToggle: 1,
    			randomAlpha: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Draw_board",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*brushColor*/ ctx[4] === undefined && !('brushColor' in props)) {
    			console.warn("<Draw_board> was created without expected prop 'brushColor'");
    		}

    		if (/*isCanDraw*/ ctx[5] === undefined && !('isCanDraw' in props)) {
    			console.warn("<Draw_board> was created without expected prop 'isCanDraw'");
    		}

    		if (/*isCanErase*/ ctx[6] === undefined && !('isCanErase' in props)) {
    			console.warn("<Draw_board> was created without expected prop 'isCanErase'");
    		}

    		if (/*isCanShowBg*/ ctx[0] === undefined && !('isCanShowBg' in props)) {
    			console.warn("<Draw_board> was created without expected prop 'isCanShowBg'");
    		}

    		if (/*isCanShowBgToggle*/ ctx[1] === undefined && !('isCanShowBgToggle' in props)) {
    			console.warn("<Draw_board> was created without expected prop 'isCanShowBgToggle'");
    		}

    		if (/*randomAlpha*/ ctx[2] === undefined && !('randomAlpha' in props)) {
    			console.warn("<Draw_board> was created without expected prop 'randomAlpha'");
    		}
    	}

    	get brushColor() {
    		throw new Error("<Draw_board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set brushColor(value) {
    		throw new Error("<Draw_board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isCanDraw() {
    		throw new Error("<Draw_board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isCanDraw(value) {
    		throw new Error("<Draw_board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isCanErase() {
    		throw new Error("<Draw_board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isCanErase(value) {
    		throw new Error("<Draw_board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isCanShowBg() {
    		throw new Error("<Draw_board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isCanShowBg(value) {
    		throw new Error("<Draw_board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isCanShowBgToggle() {
    		throw new Error("<Draw_board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isCanShowBgToggle(value) {
    		throw new Error("<Draw_board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get randomAlpha() {
    		throw new Error("<Draw_board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set randomAlpha(value) {
    		throw new Error("<Draw_board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var alphaData = [
        ['a', 'i', 'u', 'e', 'o'],
        ['ka', 'ki', 'ku', 'ke', 'ko'],
        ['sa', 'shi', 'su', 'se', 'so'],
        ['ta', 'chi', 'tsu', 'te', 'to'],
        ['na', 'ni', 'nu', 'ne', 'no'],
        ['ha', 'hi', 'fu', 'he', 'ho'],
        ['ma', 'mi', 'mu', 'me', 'mo'],
        ['ya', '', 'yu', '', 'yo'],
        ['ra', 'ri', 'ru', 're', 'ro'],
        ['wa', '', 'wo', '', 'n'],
    ];

    var colors = [
        'gray',
        'black',
        'purple',
        'royalblue',
        'deepskyblue',
        'limegreen',
        'gold',
        'orange',
        'salmon',
        'tomato',
        'deeppink',
        'pink',
    ];

    /* src\components\alpha\index.svelte generated by Svelte v3.44.2 */
    const file$1 = "src\\components\\alpha\\index.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[27] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[31] = list[i];
    	child_ctx[33] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[34] = list[i];
    	child_ctx[36] = i;
    	return child_ctx;
    }

    // (1:0) <script type="ts">var _a, _b;  import cx from 'classnames';  import random from 'lodash/random';  import times from 'lodash/times';  import shuffle from 'lodash/shuffle';  import takeRight from 'lodash/takeRight';  import DrawBoard from '../draw_board/index.svelte';  import alphaData from '../../constant/alpha.js';  import colors from '../../constant/color.js';  let alphaNum = 0;  let brushColor = colors === null || colors === void 0 ? void 0 : colors[0];  let isCanDraw = false;  let isCanErase = false;  let isCanShowBg = false;  let isCanShowBgToggle = false;  let mode = 'normal';  $: randomAlpha =      ((_a = alphaData === null || alphaData === void 0 ? void 0 : alphaData[parseInt(`${alphaNum / 5}
    function create_catch_block_1(ctx) {
    	const block = { c: noop, m: noop, p: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block_1.name,
    		type: "catch",
    		source: "(1:0) <script type=\\\"ts\\\">var _a, _b;  import cx from 'classnames';  import random from 'lodash/random';  import times from 'lodash/times';  import shuffle from 'lodash/shuffle';  import takeRight from 'lodash/takeRight';  import DrawBoard from '../draw_board/index.svelte';  import alphaData from '../../constant/alpha.js';  import colors from '../../constant/color.js';  let alphaNum = 0;  let brushColor = colors === null || colors === void 0 ? void 0 : colors[0];  let isCanDraw = false;  let isCanErase = false;  let isCanShowBg = false;  let isCanShowBgToggle = false;  let mode = 'normal';  $: randomAlpha =      ((_a = alphaData === null || alphaData === void 0 ? void 0 : alphaData[parseInt(`${alphaNum / 5}",
    		ctx
    	});

    	return block;
    }

    // (142:57)               <div class="table">                  {#each alphaData as alphaList, row}
    function create_then_block_1(ctx) {
    	let div;
    	let each_value_1 = alphaData;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "table svelte-h5libe");
    			add_location(div, file$1, 142, 12, 4423);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*randomAlpha, setAlpha*/ 16388) {
    				each_value_1 = alphaData;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block_1.name,
    		type: "then",
    		source: "(142:57)               <div class=\\\"table\\\">                  {#each alphaData as alphaList, row}",
    		ctx
    	});

    	return block;
    }

    // (146:24) {#each alphaList as al, col}
    function create_each_block_2(ctx) {
    	let span;
    	let t_value = /*al*/ ctx[34] + "";
    	let t;
    	let span_class_value;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[24](/*row*/ ctx[33], /*col*/ ctx[36]);
    	}

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);

    			attr_dev(span, "class", span_class_value = "" + (null_to_empty(classnames({
    				['match']: /*al*/ ctx[34] === /*randomAlpha*/ ctx[2]
    			})) + " svelte-h5libe"));

    			attr_dev(span, "id", `hiragana-${/*row*/ ctx[33] * 5 + /*col*/ ctx[36]}`);
    			add_location(span, file$1, 146, 28, 4621);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);

    			if (!mounted) {
    				dispose = listen_dev(span, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*randomAlpha*/ 4 && span_class_value !== (span_class_value = "" + (null_to_empty(classnames({
    				['match']: /*al*/ ctx[34] === /*randomAlpha*/ ctx[2]
    			})) + " svelte-h5libe"))) {
    				attr_dev(span, "class", span_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(146:24) {#each alphaList as al, col}",
    		ctx
    	});

    	return block;
    }

    // (144:16) {#each alphaData as alphaList, row}
    function create_each_block_1(ctx) {
    	let div;
    	let t;
    	let each_value_2 = /*alphaList*/ ctx[31];
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			attr_dev(div, "class", "column svelte-h5libe");
    			add_location(div, file$1, 144, 20, 4517);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*randomAlpha, setAlpha*/ 16388) {
    				each_value_2 = /*alphaList*/ ctx[31];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(144:16) {#each alphaData as alphaList, row}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <script type="ts">var _a, _b;  import cx from 'classnames';  import random from 'lodash/random';  import times from 'lodash/times';  import shuffle from 'lodash/shuffle';  import takeRight from 'lodash/takeRight';  import DrawBoard from '../draw_board/index.svelte';  import alphaData from '../../constant/alpha.js';  import colors from '../../constant/color.js';  let alphaNum = 0;  let brushColor = colors === null || colors === void 0 ? void 0 : colors[0];  let isCanDraw = false;  let isCanErase = false;  let isCanShowBg = false;  let isCanShowBgToggle = false;  let mode = 'normal';  $: randomAlpha =      ((_a = alphaData === null || alphaData === void 0 ? void 0 : alphaData[parseInt(`${alphaNum / 5}
    function create_pending_block_1(ctx) {
    	const block = { c: noop, m: noop, p: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block_1.name,
    		type: "pending",
    		source: "(1:0) <script type=\\\"ts\\\">var _a, _b;  import cx from 'classnames';  import random from 'lodash/random';  import times from 'lodash/times';  import shuffle from 'lodash/shuffle';  import takeRight from 'lodash/takeRight';  import DrawBoard from '../draw_board/index.svelte';  import alphaData from '../../constant/alpha.js';  import colors from '../../constant/color.js';  let alphaNum = 0;  let brushColor = colors === null || colors === void 0 ? void 0 : colors[0];  let isCanDraw = false;  let isCanErase = false;  let isCanShowBg = false;  let isCanShowBgToggle = false;  let mode = 'normal';  $: randomAlpha =      ((_a = alphaData === null || alphaData === void 0 ? void 0 : alphaData[parseInt(`${alphaNum / 5}",
    		ctx
    	});

    	return block;
    }

    // (158:12) {#if mode === 'practice'}
    function create_if_block_3(ctx) {
    	let span;
    	let t0;
    	let t1_value = /*practiceAlpha*/ ctx[1]?.length + "";
    	let t1;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text("remaining: ");
    			t1 = text(t1_value);
    			attr_dev(span, "class", "svelte-h5libe");
    			add_location(span, file$1, 158, 16, 5103);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*practiceAlpha*/ 2 && t1_value !== (t1_value = /*practiceAlpha*/ ctx[1]?.length + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(158:12) {#if mode === 'practice'}",
    		ctx
    	});

    	return block;
    }

    // (162:16) {#if mode === 'normal' || (mode === 'practice' && practiceAlpha?.length)}
    function create_if_block_2(ctx) {
    	let h1;
    	let t;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			t = text(/*randomAlpha*/ ctx[2]);
    			attr_dev(h1, "class", "svelte-h5libe");
    			add_location(h1, file$1, 162, 20, 5333);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*randomAlpha*/ 4) set_data_dev(t, /*randomAlpha*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(162:16) {#if mode === 'normal' || (mode === 'practice' && practiceAlpha?.length)}",
    		ctx
    	});

    	return block;
    }

    // (165:16) {#if mode === 'practice' && !practiceAlpha?.length}
    function create_if_block_1(ctx) {
    	let h2;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Practice Complete";
    			attr_dev(h2, "class", "svelte-h5libe");
    			add_location(h2, file$1, 165, 20, 5469);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(165:16) {#if mode === 'practice' && !practiceAlpha?.length}",
    		ctx
    	});

    	return block;
    }

    // (189:16) {:else}
    function create_else_block(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "restart";
    			add_location(button, file$1, 189, 20, 6437);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*restartPractice*/ ctx[19], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(189:16) {:else}",
    		ctx
    	});

    	return block;
    }

    // (182:16) {#if practiceAlpha?.length}
    function create_if_block(ctx) {
    	let div0;
    	let button0;
    	let t1;
    	let div1;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "next";
    			t1 = space();
    			div1 = element("div");
    			button1 = element("button");
    			button1.textContent = "cancel";
    			add_location(button0, file$1, 183, 24, 6193);
    			add_location(div0, file$1, 182, 20, 6162);
    			add_location(button1, file$1, 186, 24, 6319);
    			add_location(div1, file$1, 185, 20, 6288);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, button0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*nextPractice*/ ctx[16], false, false, false),
    					listen_dev(button1, "click", /*goNormal*/ ctx[18], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(182:16) {#if practiceAlpha?.length}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <script type="ts">var _a, _b;  import cx from 'classnames';  import random from 'lodash/random';  import times from 'lodash/times';  import shuffle from 'lodash/shuffle';  import takeRight from 'lodash/takeRight';  import DrawBoard from '../draw_board/index.svelte';  import alphaData from '../../constant/alpha.js';  import colors from '../../constant/color.js';  let alphaNum = 0;  let brushColor = colors === null || colors === void 0 ? void 0 : colors[0];  let isCanDraw = false;  let isCanErase = false;  let isCanShowBg = false;  let isCanShowBgToggle = false;  let mode = 'normal';  $: randomAlpha =      ((_a = alphaData === null || alphaData === void 0 ? void 0 : alphaData[parseInt(`${alphaNum / 5}
    function create_catch_block(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(1:0) <script type=\\\"ts\\\">var _a, _b;  import cx from 'classnames';  import random from 'lodash/random';  import times from 'lodash/times';  import shuffle from 'lodash/shuffle';  import takeRight from 'lodash/takeRight';  import DrawBoard from '../draw_board/index.svelte';  import alphaData from '../../constant/alpha.js';  import colors from '../../constant/color.js';  let alphaNum = 0;  let brushColor = colors === null || colors === void 0 ? void 0 : colors[0];  let isCanDraw = false;  let isCanErase = false;  let isCanShowBg = false;  let isCanShowBgToggle = false;  let mode = 'normal';  $: randomAlpha =      ((_a = alphaData === null || alphaData === void 0 ? void 0 : alphaData[parseInt(`${alphaNum / 5}",
    		ctx
    	});

    	return block;
    }

    // (196:43)           <div on:click={next}
    function create_then_block(ctx) {
    	let div;
    	let drawboard;
    	let current;
    	let mounted;
    	let dispose;

    	drawboard = new Draw_board({
    			props: {
    				brushColor: /*brushColor*/ ctx[3],
    				isCanDraw: /*isCanDraw*/ ctx[4],
    				isCanErase: /*isCanErase*/ ctx[5],
    				isCanShowBg: /*isCanShowBg*/ ctx[6],
    				isCanShowBgToggle: /*isCanShowBgToggle*/ ctx[7],
    				randomAlpha: /*randomAlpha*/ ctx[2]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(drawboard.$$.fragment);
    			add_location(div, file$1, 196, 8, 6616);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(drawboard, div, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div, "click", /*next*/ ctx[20], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const drawboard_changes = {};
    			if (dirty[0] & /*brushColor*/ 8) drawboard_changes.brushColor = /*brushColor*/ ctx[3];
    			if (dirty[0] & /*isCanDraw*/ 16) drawboard_changes.isCanDraw = /*isCanDraw*/ ctx[4];
    			if (dirty[0] & /*isCanErase*/ 32) drawboard_changes.isCanErase = /*isCanErase*/ ctx[5];
    			if (dirty[0] & /*isCanShowBg*/ 64) drawboard_changes.isCanShowBg = /*isCanShowBg*/ ctx[6];
    			if (dirty[0] & /*isCanShowBgToggle*/ 128) drawboard_changes.isCanShowBgToggle = /*isCanShowBgToggle*/ ctx[7];
    			if (dirty[0] & /*randomAlpha*/ 4) drawboard_changes.randomAlpha = /*randomAlpha*/ ctx[2];
    			drawboard.$set(drawboard_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(drawboard.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(drawboard.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(drawboard);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(196:43)           <div on:click={next}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <script type="ts">var _a, _b;  import cx from 'classnames';  import random from 'lodash/random';  import times from 'lodash/times';  import shuffle from 'lodash/shuffle';  import takeRight from 'lodash/takeRight';  import DrawBoard from '../draw_board/index.svelte';  import alphaData from '../../constant/alpha.js';  import colors from '../../constant/color.js';  let alphaNum = 0;  let brushColor = colors === null || colors === void 0 ? void 0 : colors[0];  let isCanDraw = false;  let isCanErase = false;  let isCanShowBg = false;  let isCanShowBgToggle = false;  let mode = 'normal';  $: randomAlpha =      ((_a = alphaData === null || alphaData === void 0 ? void 0 : alphaData[parseInt(`${alphaNum / 5}
    function create_pending_block(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(1:0) <script type=\\\"ts\\\">var _a, _b;  import cx from 'classnames';  import random from 'lodash/random';  import times from 'lodash/times';  import shuffle from 'lodash/shuffle';  import takeRight from 'lodash/takeRight';  import DrawBoard from '../draw_board/index.svelte';  import alphaData from '../../constant/alpha.js';  import colors from '../../constant/color.js';  let alphaNum = 0;  let brushColor = colors === null || colors === void 0 ? void 0 : colors[0];  let isCanDraw = false;  let isCanErase = false;  let isCanShowBg = false;  let isCanShowBgToggle = false;  let mode = 'normal';  $: randomAlpha =      ((_a = alphaData === null || alphaData === void 0 ? void 0 : alphaData[parseInt(`${alphaNum / 5}",
    		ctx
    	});

    	return block;
    }

    // (210:8) {#each colors as color}
    function create_each_block(ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[25](/*color*/ ctx[27]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "palette svelte-h5libe");
    			attr_dev(div, "style", `background: ${/*color*/ ctx[27]};`);
    			add_location(div, file$1, 210, 12, 6975);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", click_handler_1, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(210:8) {#each colors as color}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div9;
    	let div7;
    	let promise;
    	let t0;
    	let div6;
    	let t1;
    	let div0;
    	let t2;
    	let div0_style_value;
    	let t3;
    	let div4;
    	let div1;
    	let button0;
    	let t5;
    	let button1;
    	let t7;
    	let div2;
    	let button2;
    	let t9;
    	let div3;
    	let button3;
    	let div4_class_value;
    	let t11;
    	let div5;
    	let div5_class_value;
    	let t12;
    	let promise_1;
    	let t13;
    	let div8;
    	let current;
    	let mounted;
    	let dispose;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block_1,
    		then: create_then_block_1,
    		catch: create_catch_block_1,
    		value: 30
    	};

    	handle_promise(promise = /*forceUpdateTable*/ ctx[11](/*doRerenderTable*/ ctx[9]), info);
    	let if_block0 = /*mode*/ ctx[0] === 'practice' && create_if_block_3(ctx);
    	let if_block1 = (/*mode*/ ctx[0] === 'normal' || /*mode*/ ctx[0] === 'practice' && /*practiceAlpha*/ ctx[1]?.length) && create_if_block_2(ctx);
    	let if_block2 = /*mode*/ ctx[0] === 'practice' && !/*practiceAlpha*/ ctx[1]?.length && create_if_block_1(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*practiceAlpha*/ ctx[1]?.length) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block3 = current_block_type(ctx);

    	let info_1 = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 30,
    		blocks: [,,,]
    	};

    	handle_promise(promise_1 = /*forceUpdate*/ ctx[10](/*doRerender*/ ctx[8]), info_1);
    	let each_value = colors;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div9 = element("div");
    			div7 = element("div");
    			info.block.c();
    			t0 = space();
    			div6 = element("div");
    			if (if_block0) if_block0.c();
    			t1 = space();
    			div0 = element("div");
    			if (if_block1) if_block1.c();
    			t2 = space();
    			if (if_block2) if_block2.c();
    			t3 = space();
    			div4 = element("div");
    			div1 = element("div");
    			button0 = element("button");
    			button0.textContent = "prev";
    			t5 = space();
    			button1 = element("button");
    			button1.textContent = "next";
    			t7 = space();
    			div2 = element("div");
    			button2 = element("button");
    			button2.textContent = "random";
    			t9 = space();
    			div3 = element("div");
    			button3 = element("button");
    			button3.textContent = "go practice";
    			t11 = space();
    			div5 = element("div");
    			if_block3.c();
    			t12 = space();
    			info_1.block.c();
    			t13 = space();
    			div8 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "style", div0_style_value = `color: ${/*brushColor*/ ctx[3]};`);
    			add_location(div0, file$1, 160, 12, 5183);
    			add_location(button0, file$1, 170, 20, 5646);
    			add_location(button1, file$1, 171, 20, 5710);
    			add_location(div1, file$1, 169, 16, 5619);
    			add_location(button2, file$1, 174, 20, 5821);
    			add_location(div2, file$1, 173, 16, 5794);
    			add_location(button3, file$1, 177, 20, 5936);
    			add_location(div3, file$1, 176, 16, 5909);
    			attr_dev(div4, "class", div4_class_value = "" + (null_to_empty(classnames({ ['hide']: /*mode*/ ctx[0] !== 'normal' })) + " svelte-h5libe"));
    			add_location(div4, file$1, 168, 12, 5552);
    			attr_dev(div5, "class", div5_class_value = "" + (null_to_empty(classnames({ ['hide']: /*mode*/ ctx[0] !== 'practice' })) + " svelte-h5libe"));
    			add_location(div5, file$1, 180, 12, 6044);
    			attr_dev(div6, "class", "random_container svelte-h5libe");
    			add_location(div6, file$1, 156, 8, 5016);
    			attr_dev(div7, "class", "hiragana_container svelte-h5libe");
    			add_location(div7, file$1, 140, 4, 4318);
    			attr_dev(div8, "class", "palette_box svelte-h5libe");
    			add_location(div8, file$1, 208, 4, 6903);
    			attr_dev(div9, "class", "sandbox svelte-h5libe");
    			add_location(div9, file$1, 139, 0, 4291);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div7);
    			info.block.m(div7, info.anchor = null);
    			info.mount = () => div7;
    			info.anchor = t0;
    			append_dev(div7, t0);
    			append_dev(div7, div6);
    			if (if_block0) if_block0.m(div6, null);
    			append_dev(div6, t1);
    			append_dev(div6, div0);
    			if (if_block1) if_block1.m(div0, null);
    			append_dev(div0, t2);
    			if (if_block2) if_block2.m(div0, null);
    			append_dev(div6, t3);
    			append_dev(div6, div4);
    			append_dev(div4, div1);
    			append_dev(div1, button0);
    			append_dev(div1, t5);
    			append_dev(div1, button1);
    			append_dev(div4, t7);
    			append_dev(div4, div2);
    			append_dev(div2, button2);
    			append_dev(div4, t9);
    			append_dev(div4, div3);
    			append_dev(div3, button3);
    			append_dev(div6, t11);
    			append_dev(div6, div5);
    			if_block3.m(div5, null);
    			append_dev(div9, t12);
    			info_1.block.m(div9, info_1.anchor = null);
    			info_1.mount = () => div9;
    			info_1.anchor = t13;
    			append_dev(div9, t13);
    			append_dev(div9, div8);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div8, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*prevAlpha*/ ctx[12], false, false, false),
    					listen_dev(button1, "click", /*nextAlpha*/ ctx[13], false, false, false),
    					listen_dev(button2, "click", /*getNewAlpha*/ ctx[15], false, false, false),
    					listen_dev(button3, "click", /*goPractice*/ ctx[17], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (dirty[0] & /*doRerenderTable*/ 512 && promise !== (promise = /*forceUpdateTable*/ ctx[11](/*doRerenderTable*/ ctx[9])) && handle_promise(promise, info)) ; else {
    				update_await_block_branch(info, ctx, dirty);
    			}

    			if (/*mode*/ ctx[0] === 'practice') {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(div6, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*mode*/ ctx[0] === 'normal' || /*mode*/ ctx[0] === 'practice' && /*practiceAlpha*/ ctx[1]?.length) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(div0, t2);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*mode*/ ctx[0] === 'practice' && !/*practiceAlpha*/ ctx[1]?.length) {
    				if (if_block2) ; else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					if_block2.m(div0, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (!current || dirty[0] & /*brushColor*/ 8 && div0_style_value !== (div0_style_value = `color: ${/*brushColor*/ ctx[3]};`)) {
    				attr_dev(div0, "style", div0_style_value);
    			}

    			if (!current || dirty[0] & /*mode*/ 1 && div4_class_value !== (div4_class_value = "" + (null_to_empty(classnames({ ['hide']: /*mode*/ ctx[0] !== 'normal' })) + " svelte-h5libe"))) {
    				attr_dev(div4, "class", div4_class_value);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block3) {
    				if_block3.p(ctx, dirty);
    			} else {
    				if_block3.d(1);
    				if_block3 = current_block_type(ctx);

    				if (if_block3) {
    					if_block3.c();
    					if_block3.m(div5, null);
    				}
    			}

    			if (!current || dirty[0] & /*mode*/ 1 && div5_class_value !== (div5_class_value = "" + (null_to_empty(classnames({ ['hide']: /*mode*/ ctx[0] !== 'practice' })) + " svelte-h5libe"))) {
    				attr_dev(div5, "class", div5_class_value);
    			}

    			info_1.ctx = ctx;

    			if (dirty[0] & /*doRerender*/ 256 && promise_1 !== (promise_1 = /*forceUpdate*/ ctx[10](/*doRerender*/ ctx[8])) && handle_promise(promise_1, info_1)) ; else {
    				update_await_block_branch(info_1, ctx, dirty);
    			}

    			if (dirty[0] & /*brushColor*/ 8) {
    				each_value = colors;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div8, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(info_1.block);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info_1.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);
    			info.block.d();
    			info.token = null;
    			info = null;
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if_block3.d();
    			info_1.block.d();
    			info_1.token = null;
    			info_1 = null;
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let randomAlpha;
    	let practiceAlpha;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Alpha', slots, []);
    	var _a, _b;
    	let alphaNum = 0;

    	let brushColor = colors === null || colors === void 0
    	? void 0
    	: colors[0];

    	let isCanDraw = false;
    	let isCanErase = false;
    	let isCanShowBg = false;
    	let isCanShowBgToggle = false;
    	let mode = 'normal';

    	const forceUpdate = async _ => {
    		
    	};

    	const forceUpdateTable = async _ => {
    		
    	};

    	let doRerender = 0;
    	let doRerenderTable = 0;

    	function prevAlpha() {
    		var _a;
    		if ($$invalidate(23, --alphaNum) < 0) $$invalidate(23, alphaNum = 0);

    		$$invalidate(23, alphaNum = !((_a = alphaData === null || alphaData === void 0
    		? void 0
    		: alphaData[parseInt(`${alphaNum / 5}`, 10)]) === null || _a === void 0
    		? void 0
    		: _a[alphaNum % 5])
    		? $$invalidate(23, --alphaNum)
    		: alphaNum);

    		$$invalidate(8, doRerender++, doRerender);
    	}

    	function nextAlpha() {
    		if ($$invalidate(23, ++alphaNum) > 49) $$invalidate(23, alphaNum = 49);
    		checkNumAndNext();
    	}

    	function setAlpha(row, col) {
    		if (mode === 'normal') {
    			$$invalidate(23, alphaNum = row * 5 + col);
    			$$invalidate(8, doRerender++, doRerender);
    		}
    	}

    	function getNewAlpha() {
    		$$invalidate(23, alphaNum = random_1(50));
    		checkNumAndNext();
    		$$invalidate(8, doRerender++, doRerender);
    	}

    	function checkNumAndNext() {
    		var _a;

    		$$invalidate(23, alphaNum = !((_a = alphaData === null || alphaData === void 0
    		? void 0
    		: alphaData[parseInt(`${alphaNum / 5}`, 10)]) === null || _a === void 0
    		? void 0
    		: _a[alphaNum % 5])
    		? $$invalidate(23, ++alphaNum)
    		: alphaNum);

    		$$invalidate(8, doRerender++, doRerender);
    	}

    	function nextPractice() {
    		if (practiceAlpha === null || practiceAlpha === void 0
    		? void 0
    		: practiceAlpha.length) {
    			document.querySelector(`#hiragana-${alphaNum}`).style.background = 'lightskyblue';

    			$$invalidate(1, practiceAlpha = takeRight_1(practiceAlpha, (practiceAlpha === null || practiceAlpha === void 0
    			? void 0
    			: practiceAlpha.length) - 1));

    			$$invalidate(23, alphaNum = practiceAlpha[1]);
    			$$invalidate(8, doRerender++, doRerender);
    		}
    	}

    	function goPractice() {
    		$$invalidate(0, mode = 'practice');
    	}

    	function goNormal() {
    		$$invalidate(0, mode = 'normal');
    		$$invalidate(9, doRerenderTable++, doRerenderTable);
    	}

    	function restartPractice() {
    		$$invalidate(0, mode = 'normal');
    		$$invalidate(0, mode = 'practice');
    		$$invalidate(9, doRerenderTable++, doRerenderTable);
    	}

    	function next() {
    		if (mode === 'normal') nextAlpha();
    		if (mode === 'practice') nextPractice();
    	}

    	window.addEventListener('keydown', event => {
    		switch (event === null || event === void 0 ? void 0 : event.code) {
    			case 'KeyA':
    				if (!isCanDraw) $$invalidate(4, isCanDraw = true);
    				break;
    			case 'KeyS':
    				if (!isCanErase) $$invalidate(5, isCanErase = true);
    				break;
    			case 'KeyD':
    				if (!isCanShowBg) $$invalidate(6, isCanShowBg = true);
    				break;
    			case 'KeyF':
    				$$invalidate(7, isCanShowBgToggle = !isCanShowBgToggle);
    				break;
    			case 'KeyQ':
    				if (mode === 'normal') prevAlpha();
    				break;
    			case 'KeyW':
    				if (mode === 'normal') getNewAlpha();
    				if (mode === 'practice') nextPractice();
    				break;
    			case 'KeyE':
    				if (mode === 'normal') nextAlpha();
    				if (mode === 'practice') nextPractice();
    				break;
    			case 'Space':
    				event.preventDefault();
    				$$invalidate(8, doRerender++, doRerender);
    				break;
    		}
    	});

    	window.addEventListener('keyup', () => {
    		if (isCanDraw) $$invalidate(4, isCanDraw = false);
    		if (isCanErase) $$invalidate(5, isCanErase = false);
    		if (isCanShowBg) $$invalidate(6, isCanShowBg = false);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Alpha> was created with unknown prop '${key}'`);
    	});

    	const click_handler = (row, col) => setAlpha(row, col);
    	const click_handler_1 = color => $$invalidate(3, brushColor = color);

    	$$self.$capture_state = () => ({
    		_a,
    		_b,
    		cx: classnames,
    		random: random_1,
    		times: times_1,
    		shuffle: shuffle_1,
    		takeRight: takeRight_1,
    		DrawBoard: Draw_board,
    		alphaData,
    		colors,
    		alphaNum,
    		brushColor,
    		isCanDraw,
    		isCanErase,
    		isCanShowBg,
    		isCanShowBgToggle,
    		mode,
    		forceUpdate,
    		forceUpdateTable,
    		doRerender,
    		doRerenderTable,
    		prevAlpha,
    		nextAlpha,
    		setAlpha,
    		getNewAlpha,
    		checkNumAndNext,
    		nextPractice,
    		goPractice,
    		goNormal,
    		restartPractice,
    		next,
    		practiceAlpha,
    		randomAlpha
    	});

    	$$self.$inject_state = $$props => {
    		if ('_a' in $$props) $$invalidate(21, _a = $$props._a);
    		if ('_b' in $$props) $$invalidate(22, _b = $$props._b);
    		if ('alphaNum' in $$props) $$invalidate(23, alphaNum = $$props.alphaNum);
    		if ('brushColor' in $$props) $$invalidate(3, brushColor = $$props.brushColor);
    		if ('isCanDraw' in $$props) $$invalidate(4, isCanDraw = $$props.isCanDraw);
    		if ('isCanErase' in $$props) $$invalidate(5, isCanErase = $$props.isCanErase);
    		if ('isCanShowBg' in $$props) $$invalidate(6, isCanShowBg = $$props.isCanShowBg);
    		if ('isCanShowBgToggle' in $$props) $$invalidate(7, isCanShowBgToggle = $$props.isCanShowBgToggle);
    		if ('mode' in $$props) $$invalidate(0, mode = $$props.mode);
    		if ('doRerender' in $$props) $$invalidate(8, doRerender = $$props.doRerender);
    		if ('doRerenderTable' in $$props) $$invalidate(9, doRerenderTable = $$props.doRerenderTable);
    		if ('practiceAlpha' in $$props) $$invalidate(1, practiceAlpha = $$props.practiceAlpha);
    		if ('randomAlpha' in $$props) $$invalidate(2, randomAlpha = $$props.randomAlpha);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*mode, _b*/ 4194305) {
    			$$invalidate(1, practiceAlpha = mode === 'practice'
    			? shuffle_1($$invalidate(22, _b = times_1(50, 0)) === null || _b === void 0
    				? void 0
    				: _b.filter(num => ![36, 38, 46, 48].includes(num)))
    			: []);
    		}

    		if ($$self.$$.dirty[0] & /*mode, practiceAlpha, alphaNum*/ 8388611) {
    			{
    				$$invalidate(23, alphaNum = mode === 'practice' ? practiceAlpha[0] : alphaNum);
    			}
    		}

    		if ($$self.$$.dirty[0] & /*alphaNum, _a, randomAlpha*/ 10485764) {
    			$$invalidate(2, randomAlpha = ($$invalidate(21, _a = alphaData === null || alphaData === void 0
    			? void 0
    			: alphaData[parseInt(`${alphaNum / 5}`, 10)]) === null || _a === void 0
    			? void 0
    			: _a[alphaNum % 5]) || randomAlpha);
    		}
    	};

    	return [
    		mode,
    		practiceAlpha,
    		randomAlpha,
    		brushColor,
    		isCanDraw,
    		isCanErase,
    		isCanShowBg,
    		isCanShowBgToggle,
    		doRerender,
    		doRerenderTable,
    		forceUpdate,
    		forceUpdateTable,
    		prevAlpha,
    		nextAlpha,
    		setAlpha,
    		getNewAlpha,
    		nextPractice,
    		goPractice,
    		goNormal,
    		restartPractice,
    		next,
    		_a,
    		_b,
    		alphaNum,
    		click_handler,
    		click_handler_1
    	];
    }

    class Alpha extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Alpha",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.44.2 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let alpha;
    	let current;
    	alpha = new Alpha({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Japanese Practice v0.2";
    			t1 = space();
    			create_component(alpha.$$.fragment);
    			attr_dev(h1, "class", "svelte-1tq6b4c");
    			add_location(h1, file, 4, 4, 94);
    			attr_dev(main, "class", "svelte-1tq6b4c");
    			add_location(main, file, 3, 0, 83);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			mount_component(alpha, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(alpha.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(alpha.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(alpha);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Alpha });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
        props: {
            name: 'world'
        }
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
