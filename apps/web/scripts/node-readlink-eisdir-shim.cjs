/**
 * Next.js webpack builds call fs.readlink while resolving build dependencies.
 * On this Windows host, Node 24 reports EISDIR for regular files instead of
 * the EINVAL shape webpack already tolerates for non-symlink paths.
 */
"use strict";

const fs = require("node:fs");

if (process.platform === "win32") {
  const originalReadlink = fs.readlink;
  const originalReadlinkSync = fs.readlinkSync;
  const originalPromisesReadlink = fs.promises?.readlink;

  const normalizeReadlinkError = (error) => {
    if (
      error &&
      typeof error === "object" &&
      error.code === "EISDIR" &&
      typeof error.syscall === "string" &&
      error.syscall === "readlink"
    ) {
      error.code = "EINVAL";
      return error;
    }
    return error;
  };

  fs.readlink = function patchedReadlink(path, options, callback) {
    if (typeof options === "function") {
      return originalReadlink.call(fs, path, (error, linkString) => {
        options(normalizeReadlinkError(error), linkString);
      });
    }

    return originalReadlink.call(fs, path, options, (error, linkString) => {
      callback(normalizeReadlinkError(error), linkString);
    });
  };

  fs.readlinkSync = function patchedReadlinkSync(path, options) {
    try {
      return originalReadlinkSync.call(fs, path, options);
    } catch (error) {
      throw normalizeReadlinkError(error);
    }
  };

  if (originalPromisesReadlink) {
    fs.promises.readlink = async function patchedPromisesReadlink(
      path,
      options
    ) {
      try {
        return await originalPromisesReadlink.call(fs.promises, path, options);
      } catch (error) {
        throw normalizeReadlinkError(error);
      }
    };
  }
}
