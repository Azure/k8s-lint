"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExecutableExtension = void 0;
const os = require("os");
function getExecutableExtension() {
    if (os.type().match(/^Win/)) {
        return ".exe";
    }
    return "";
}
exports.getExecutableExtension = getExecutableExtension;
