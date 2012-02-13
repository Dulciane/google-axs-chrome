// Copyright 2012 Google Inc.
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
 * @fileoverview Defines a global object. The initialization of this
 *   object happens in init.js.
 *
 * @author dmazzoni@google.com (Dominic Mazzoni)
 */

goog.provide('cvox.ChromeVox');

goog.require('cvox.AbstractHost');
goog.require('cvox.AbstractLens');
goog.require('cvox.AbstractMsgs');
goog.require('cvox.AbstractTts');

// Constants
/**
 * Constant for verbosity setting (cvox.ChromeVox.verbosity).
 * @const
 * @type {number}
 */
cvox.VERBOSITY_VERBOSE = 0;
/**
 * Constant for verbosity setting (cvox.ChromeVox.verbosity).
 * @const
 * @type {number}
 */
cvox.VERBOSITY_BRIEF = 1;


/**
 * @constructor
 */
cvox.ChromeVox = function() {};

/**
 * @type {cvox.AbstractHost}
 */
cvox.ChromeVox.host = null;
/**
 * @type {cvox.AbstractTts}
 */
cvox.ChromeVox.tts = null;
/**
 * @type {cvox.AbstractMsgs}
 */
cvox.ChromeVox.msgs = null;
/**
 * @type {cvox.AbstractLens}
 */
cvox.ChromeVox.lens = null;
/**
 * @type {boolean}
 */
cvox.ChromeVox.isActive = true;
/**
 * @type {?string}
 */
cvox.ChromeVox.version = null;
/**
 * @type {Object}
 */
cvox.ChromeVox.earcons = null;
/**
 * @type {Object}
 */
cvox.ChromeVox.navigationManager = null;
/**
 * @type {boolean}
 */
cvox.ChromeVox.isStickyOn = false;
/**
 * @type {boolean}
 */
cvox.ChromeVox.keyPrefixOn = false;
/**
 * Verbosity setting.
 * See: cvox.VERBOSITY_VERBOSE and cvox.VERBOSITY_BRIEF
 * @type {number}
 */
cvox.ChromeVox.verbosity = cvox.VERBOSITY_VERBOSE;
/**
 * @type {boolean}
 */
cvox.ChromeVox.isChromeOS = navigator.userAgent.indexOf('CrOS') != -1;
/**
 * @type {boolean}
 */
cvox.ChromeVox.isMac = navigator.platform.indexOf('Mac') != -1;
/**
 * @type {string}
 * TODO (clchen): This logic is already in prefs.js;
 * clean it up to avoid code duplication.
 */
if (cvox.ChromeVox.isChromeOS)
  cvox.ChromeVox.modKeyStr = 'Shift+Search';
else if (cvox.ChromeVox.isMac)
  cvox.ChromeVox.modKeyStr = 'Ctrl+Cmd';
else
  cvox.ChromeVox.modKeyStr = 'Ctrl+Alt';
/**
 * If any of these keys is pressed with the modifier key, we go in sequence mode
 * where the subsequent independent key downs (while modifier keys are down)
 * are a part of the same shortcut. This array is populated in
 * cvox.ChromeVoxKbHandler.loadKeyToFunctionsTable().
 * @type {Object.<string, number>}
 */
cvox.ChromeVox.sequenceSwitchKeyCodes = {};
/**
 * This function can be called before doing an operation that may trigger
 * focus events and other events that would normally be announced. This
 * tells the event manager that these events should be ignored, they're
 * a result of another command that's already announced them. This is
 * a temporary state that's automatically reverted after a few milliseconds,
 * there's no way to explicitly "un-mark".
 * @type {Function}
 */
cvox.ChromeVox.markInUserCommand = function() {};
/**
 * Synchronizes ChromeVox's internal cursor to the targetNode.
 * @param {Node} targetNode The node that ChromeVox should be synced to.
 * @param {boolean=} speakNode If true, speaks out the node.
 * @param {number?} opt_queueMode The queue mode to use for speaking.
 */
cvox.ChromeVox.syncToNode = function(
    targetNode, speakNode, opt_queueMode) {};

/**
 * Process PDFs created with Chrome's built-in PDF plug-in, which has an
 * accessibility hook.
 */
cvox.ChromeVox.processEmbeddedPdfs = function() {};

/**
 * Provide a way for modules that can't depend on cvox.ChromeVoxUserCommands
 * to execute commands.
 *
 * @param {string} commandName The command name as a string.
 */
cvox.ChromeVox.executeUserCommand = function(commandName) {};

/**
 * Speak messages when the page loads. This only happens after preferences
 * have loaded so we don't speak if ChromeVox is installed but inactive.
 */
cvox.ChromeVox.speakInitialMessages = function() {};

/**
 * True if the document body has aria-hidden='true' when we first load.
 * ChromeVox will disallow any navigation and not eat any keystrokes.
 * @type {boolean}
 */
cvox.ChromeVox.entireDocumentIsHidden = false;
