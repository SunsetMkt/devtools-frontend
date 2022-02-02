// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-check

const path = require('path');

/**
 * `path.dirname` does not include trailing slashes. If we would always
 * use `path.dirname` and then later perform comparisons on the paths that
 * it returns, we could run into false positives. For example, given the
 * the following two paths:
 *
 *     front_end/timeline_model/TimelineModel.js
 *     front_end/timeline/Timeline.js
 *
 * And that would have the following values for `path.dirname`:
 *
 *     front_end/timeline_model
 *     front_end/timeline
 *
 * If we would do a simple `.startswith` on the `path.dirname` of both of
 * these paths, then the first path would start with the dirname of the
 * second. However, they *are* part of different folders. To fix that problem,
 * we need to force a path separator after each folder. That makes sure we
 * and up with the following comparison of path dirnames:
 *
 *     front_end/timeline_model/
 *     front_end/timeline/
 *
 * Now, the first path does *not* start with the second one, as expected.
 *
 * @param {string} file
 * @return {string}
 */
function dirnameWithSeparator(file) {
  return path.dirname(file) + path.sep;
}

function devtoolsPlugin(source, importer) {
  if (!importer) {
    return null;
  }

  if (source === '../../lib/codemirror' || source === 'fs') {
    // These are imported via require(...), but we don't use
    // @rollup/plugin-commonjs. So this check is not necessary for rollup. But
    // need to have this for esbuild as it doesn't ignore require(...).
    return {
      id: source,
      external: true,
    };
  }

  const currentDirectory = path.normalize(dirnameWithSeparator(importer));
  const importedFilelocation = path.normalize(path.join(currentDirectory, source));
  const importedFileDirectory = dirnameWithSeparator(importedFilelocation);

  // Generated files are part of other directories, as they are only imported once
  if (path.basename(importedFileDirectory) === 'generated') {
    return null;
  }

  // An import is considered external (and therefore a separate
  // bundle) if its filename matches its immediate parent's folder
  // name (without the extension). For example:
  // import * as Components from './components/components.js' = external
  // import * as UI from '../ui/ui.js' = external
  // import * as LitHtml from '../third_party/lit-html/lit-html.js' = external
  // import {DataGrid} from './components/DataGrid.js' = not external
  // import * as Components from './components/foo.js' = not external

  // Note that we can't do a simple check for only `third_party`, as in Chromium
  // our full path is `third_party/devtools-frontend/src/`, which thus *always*
  // includes third_party. It also not possible to use the current directory
  // as a check for the import, as the import will be different in Chromium and
  // would therefore not match the path of `__dirname`.
  // These should be removed because the new heuristic _should_ deal with these
  // e.g. it'll pick up third_party/lit-html/lit-html.js is its own entrypoint

  // Puppeteer has dynamic imports in its build gated on an ifNode
  // flag, but our Rollup config doesn't know about that and tries
  // to parse dynamic import('fs'). Let's ignore Puppeteer for now.
  // The long term plan is probably for Puppeteer to ship a web
  // bundle anyway. See go/pptr-agnostify for details.
  if (importedFileDirectory.includes(path.join('front_end', 'third_party', 'puppeteer'))) {
    return null;
  }

  // The CodeMirror addons look like bundles (addon/comment/comment.js) but are not.
  if (importedFileDirectory.includes(path.join('front_end', 'third_party', 'codemirror', 'package'))) {
    return null;
  }

  // The LightHouse bundle shouldn't be processed by `terser` again, as it is uniquely built
  if (importedFilelocation.includes(path.join('front_end', 'third_party', 'lighthouse', 'lighthouse-dt-bundle.js'))) {
    return {
      id: importedFilelocation,
      external: true,
    };
  }

  const importedFileName = path.basename(importedFilelocation, '.js');
  const importedFileParentDirectory = path.basename(path.dirname(importedFilelocation));
  const isExternal = importedFileName === importedFileParentDirectory;

  return {
    id: importedFilelocation,
    external: isExternal,
  };
}

module.exports = {devtoolsPlugin};
