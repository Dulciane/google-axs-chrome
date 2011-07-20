// Copyright 2010 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Code to execute before Closure's base.js.
 *
 * @author dmazzoni@google.com (Dominic Mazzoni)
 */

/**
 * Tell Closure to load JavaScript code from the extension root directory.
 * @type {boolean}
 */
window.CLOSURE_BASE_PATH = chrome.extension.getURL('/closure/');

/**
 * Tell Closure not to load deps.js; it's included by manifest.json already.
 * @type {boolean}
 */
window.CLOSURE_NO_DEPS = true;

/**
 * Tell Closure to use a loading mechanism designed for Chrome content
 * scripts.
 * @type {boolean}
 */
window.CHROME_CONTENT_SCRIPT = true;

/**
 * Array of urls that should be included next, in order.
 * @type {Array}
 * @private
 */
window.queue_ = [];

/**
 * Custom function for importing ChromeVox scripts.
 * @param {string} src The JS file to import.
 * @return {boolean} Whether the script was imported.
 */
window.CLOSURE_IMPORT_SCRIPT = function(src) {
  // Only run our version of the import script
  // when trying to inject ChromeVox scripts.
  if (src.indexOf('chrome-extension://') == 0) {
    if (!cvoxgoog.inHtmlDocument_() ||
        cvoxgoog.dependencies_.written[src]) {
      return false;
    }
    cvoxgoog.dependencies_.written[src] = true;
    function loadNextScript() {
      if (cvoxgoog.global.queue_.length == 0)
        return;
      var doc = cvoxgoog.global.document;
      var scriptElt = document.createElement('script');
      scriptElt.type = 'text/javascript';
      scriptElt.src = cvoxgoog.global.queue_[0] + '?' + new Date().getTime();
      doc.getElementsByTagName('head')[0].appendChild(scriptElt);
      scriptElt.onload = function() {
        cvoxgoog.global.queue_ = cvoxgoog.global.queue_.slice(1);
        loadNextScript();
      };
    }
    cvoxgoog.global.queue_.push(src);
    if (cvoxgoog.global.queue_.length == 1) {
      loadNextScript();
    }
    return true;
  } else {
    return cvoxgoog.writeScriptTag_(src);
  }
};

