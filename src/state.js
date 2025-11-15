"use strict";
/**
 * State Management Utilities for Tsyne
 *
 * Provides reactive state management, data binding, and state passing capabilities
 * for building applications with various architectural patterns (MVC, MVVM, MVP).
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Model = exports.ViewModel = exports.DialogResult = exports.TwoWayBinding = exports.StateStore = exports.ComputedState = exports.ObservableState = void 0;
/**
 * Observable State
 *
 * Provides reactive state management with change notifications.
 * Perfect for implementing data binding and reactive UIs.
 *
 * @example
 * ```typescript
 * const count = new ObservableState(0);
 * count.subscribe((newVal, oldVal) => {
 *   console.log(`Count changed from ${oldVal} to ${newVal}`);
 * });
 * count.set(5); // Triggers subscriber
 * ```
 */
var ObservableState = /** @class */ (function () {
    function ObservableState(initialValue) {
        this.listeners = new Set();
        this.value = initialValue;
    }
    /**
     * Get the current value
     */
    ObservableState.prototype.get = function () {
        return this.value;
    };
    /**
     * Set a new value and notify all subscribers
     */
    ObservableState.prototype.set = function (newValue) {
        var oldValue = this.value;
        if (oldValue !== newValue) {
            this.value = newValue;
            this.notifyListeners(newValue, oldValue);
        }
    };
    /**
     * Update the value using a function
     */
    ObservableState.prototype.update = function (updater) {
        this.set(updater(this.value));
    };
    /**
     * Subscribe to state changes
     * @returns Unsubscribe function
     */
    ObservableState.prototype.subscribe = function (listener) {
        var _this = this;
        this.listeners.add(listener);
        return function () { return _this.listeners.delete(listener); };
    };
    /**
     * Notify all listeners of a state change
     */
    ObservableState.prototype.notifyListeners = function (newValue, oldValue) {
        this.listeners.forEach(function (listener) { return listener(newValue, oldValue); });
    };
    return ObservableState;
}());
exports.ObservableState = ObservableState;
/**
 * Computed State
 *
 * Derives its value from one or more observable states.
 * Automatically updates when dependencies change.
 *
 * @example
 * ```typescript
 * const firstName = new ObservableState('John');
 * const lastName = new ObservableState('Doe');
 * const fullName = new ComputedState(
 *   [firstName, lastName],
 *   (first, last) => `${first} ${last}`
 * );
 * ```
 */
var ComputedState = /** @class */ (function () {
    function ComputedState(dependencies, computeFn) {
        var _this = this;
        this.listeners = new Set();
        this.unsubscribers = [];
        // Initial computation
        this.value = computeFn.apply(void 0, dependencies.map(function (dep) { return dep.get(); }));
        // Subscribe to all dependencies
        dependencies.forEach(function (dep) {
            var unsubscribe = dep.subscribe(function () {
                _this.recompute(dependencies, computeFn);
            });
            _this.unsubscribers.push(unsubscribe);
        });
    }
    ComputedState.prototype.get = function () {
        return this.value;
    };
    ComputedState.prototype.subscribe = function (listener) {
        var _this = this;
        this.listeners.add(listener);
        return function () { return _this.listeners.delete(listener); };
    };
    ComputedState.prototype.dispose = function () {
        this.unsubscribers.forEach(function (unsub) { return unsub(); });
        this.listeners.clear();
    };
    ComputedState.prototype.recompute = function (dependencies, computeFn) {
        var _this = this;
        var oldValue = this.value;
        this.value = computeFn.apply(void 0, dependencies.map(function (dep) { return dep.get(); }));
        if (oldValue !== this.value) {
            this.listeners.forEach(function (listener) { return listener(_this.value, oldValue); });
        }
    };
    return ComputedState;
}());
exports.ComputedState = ComputedState;
/**
 * State Store
 *
 * Centralized state management for larger applications.
 * Similar to Redux or Vuex, but simpler.
 *
 * @example
 * ```typescript
 * interface AppState {
 *   user: string;
 *   count: number;
 * }
 *
 * const store = new StateStore<AppState>({
 *   user: 'Guest',
 *   count: 0
 * });
 *
 * store.subscribe(state => console.log('State changed:', state));
 * store.update(state => ({ ...state, count: state.count + 1 }));
 * ```
 */
var StateStore = /** @class */ (function () {
    function StateStore(initialState) {
        this.listeners = new Set();
        this.state = __assign({}, initialState);
    }
    /**
     * Get the current state (read-only)
     */
    StateStore.prototype.getState = function () {
        return this.state;
    };
    /**
     * Update the state
     */
    StateStore.prototype.update = function (updater) {
        var newState = updater(this.state);
        if (newState !== this.state) {
            this.state = newState;
            this.notifyListeners();
        }
    };
    /**
     * Update a specific property
     */
    StateStore.prototype.set = function (key, value) {
        var _a;
        if (this.state[key] !== value) {
            this.state = __assign(__assign({}, this.state), (_a = {}, _a[key] = value, _a));
            this.notifyListeners();
        }
    };
    /**
     * Get a specific property
     */
    StateStore.prototype.get = function (key) {
        return this.state[key];
    };
    /**
     * Subscribe to state changes
     */
    StateStore.prototype.subscribe = function (listener) {
        var _this = this;
        this.listeners.add(listener);
        return function () { return _this.listeners.delete(listener); };
    };
    StateStore.prototype.notifyListeners = function () {
        var _this = this;
        this.listeners.forEach(function (listener) { return listener(_this.state); });
    };
    return StateStore;
}());
exports.StateStore = StateStore;
var TwoWayBinding = /** @class */ (function () {
    function TwoWayBinding(state, widget, options) {
        if (options === void 0) { options = {}; }
        this.state = state;
        this.widget = widget;
        this.options = options;
    }
    /**
     * Start the binding
     */
    TwoWayBinding.prototype.bind = function () {
        var _this = this;
        var transform = this.options.transform || String;
        var parse = this.options.parse || (function (x) { return x; });
        // Sync initial state to widget
        this.widget.setText(transform(this.state.get()));
        // Subscribe to state changes and update widget
        this.unsubscribe = this.state.subscribe(function (newValue) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.options.onStateChange) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.options.onStateChange(this.widget, newValue)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this.widget.setText(transform(newValue))];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        }); });
        // Note: Widget -> State sync would require onChanged callback support
        // which would need to be added to the Entry widget
    };
    /**
     * Stop the binding
     */
    TwoWayBinding.prototype.unbind = function () {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = undefined;
        }
    };
    return TwoWayBinding;
}());
exports.TwoWayBinding = TwoWayBinding;
/**
 * Dialog Result Pattern
 *
 * Allows passing state into a dialog/window and retrieving the result.
 *
 * @example
 * ```typescript
 * const dialog = new DialogResult<string>();
 *
 * // Show dialog and wait for result
 * const result = await dialog.show(() => {
 *   // Build dialog UI
 *   button('OK', () => dialog.resolve('User clicked OK'));
 *   button('Cancel', () => dialog.reject(new Error('Cancelled')));
 * });
 * ```
 */
var DialogResult = /** @class */ (function () {
    function DialogResult() {
    }
    /**
     * Show the dialog and return a promise that resolves with the result
     */
    DialogResult.prototype.show = function (builder) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                this.promise = new Promise(function (resolve, reject) {
                    _this.resolveFunc = resolve;
                    _this.rejectFunc = reject;
                });
                builder();
                return [2 /*return*/, this.promise];
            });
        });
    };
    /**
     * Resolve the dialog with a value
     */
    DialogResult.prototype.resolve = function (value) {
        if (this.resolveFunc) {
            this.resolveFunc(value);
        }
    };
    /**
     * Reject the dialog with an error
     */
    DialogResult.prototype.reject = function (error) {
        if (this.rejectFunc) {
            this.rejectFunc(error);
        }
    };
    return DialogResult;
}());
exports.DialogResult = DialogResult;
/**
 * ViewModel Base Class
 *
 * Base class for MVVM pattern ViewModels.
 * Provides observable properties and command binding.
 *
 * @example
 * ```typescript
 * class CounterViewModel extends ViewModel {
 *   count = new ObservableState(0);
 *
 *   increment = () => {
 *     this.count.update(c => c + 1);
 *   };
 * }
 * ```
 */
var ViewModel = /** @class */ (function () {
    function ViewModel() {
        this.disposables = [];
    }
    /**
     * Register a cleanup function
     */
    ViewModel.prototype.addDisposable = function (dispose) {
        this.disposables.push(dispose);
    };
    /**
     * Clean up resources
     */
    ViewModel.prototype.dispose = function () {
        this.disposables.forEach(function (d) { return d(); });
        this.disposables = [];
    };
    return ViewModel;
}());
exports.ViewModel = ViewModel;
/**
 * Model Base Class
 *
 * Base class for MVC/MVP pattern Models.
 * Provides observable properties for data changes.
 */
var Model = /** @class */ (function () {
    function Model() {
        this.listeners = new Set();
    }
    /**
     * Subscribe to model changes
     */
    Model.prototype.subscribe = function (listener) {
        var _this = this;
        this.listeners.add(listener);
        return function () { return _this.listeners.delete(listener); };
    };
    /**
     * Notify all listeners that the model has changed
     */
    Model.prototype.notifyChanged = function () {
        this.listeners.forEach(function (listener) { return listener(); });
    };
    return Model;
}());
exports.Model = Model;
