"use strict";
/**
 * @license
 * Copyright 2017 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.launch = exports.executablePath = exports.defaultArgs = exports.connect = void 0;
__exportStar(require("./index.js"), exports);
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const environment_js_1 = require("./environment.js");
const PuppeteerNode_js_1 = require("./node/PuppeteerNode.js");
const ScreenRecorder_js_1 = require("./node/ScreenRecorder.js");
// Set up Node-specific environment dependencies.
environment_js_1.environment.value = {
    fs: fs_1.default,
    path: path_1.default,
    ScreenRecorder: ScreenRecorder_js_1.ScreenRecorder,
};
/**
 * @public
 */
const puppeteer = new PuppeteerNode_js_1.PuppeteerNode({
    isPuppeteerCore: true,
});
/**
 * @public
 */
exports.connect = puppeteer.connect, 
/**
 * @public
 */
exports.defaultArgs = puppeteer.defaultArgs, 
/**
 * @public
 */
exports.executablePath = puppeteer.executablePath, 
/**
 * @public
 */
exports.launch = puppeteer.launch;
exports.default = puppeteer;
//# sourceMappingURL=puppeteer-core.js.map