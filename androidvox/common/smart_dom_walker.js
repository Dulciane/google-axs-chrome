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
 * @fileoverview A JavaScript class for walking the DOM in a "smart" way.
 * Includes special DOM navigation for tables.
 * @author rshearer@google.com (Rachel Shearer)
 */


cvoxgoog.provide('cvox.SmartDomWalker');

cvoxgoog.require('cvox.AriaUtil');
cvoxgoog.require('cvox.DomUtil');
cvoxgoog.require('cvox.LinearDomWalker');
cvoxgoog.require('cvox.TraverseTable');
cvoxgoog.require('cvox.XpathUtil');



/**
 * A subclass of LinearDomWalker that walks the DOM in a smarter way. Includes
 * special smart navigation for tables and richer content descriptions.
 * @extends {cvox.LinearDomWalker}
 * @constructor
 */
cvox.SmartDomWalker = function() {
  this.tables = [];
  this.currentTableNavigator = null;
  this.announceTable = false;
  this.tableMode = false;
};
cvoxgoog.inherits(cvox.SmartDomWalker, cvox.LinearDomWalker);


/**
 * @type {number}
 * If a node contains more characters than this, it should not be treated
 * as a leaf node by the smart navigation algorithm.
 *
 * This number was determined by looking at the average number of
 * characters in a paragraph:
 * http://www.fullondesign.co.uk/design/usability/
 * 285-how-many-characters-per-a-page-is-normal.htm
 * and then trying it out on a few popular websites (CNN, BBC,
 * Google Search, etc.) and making sure it made sense.
 */
cvox.SmartDomWalker.SMARTNAV_MAX_CHARCOUNT = 1500;


/**
 * @type {string}
 * If a node contains any of these elements, it should not be treated
 * as a leaf node by the smart navigation algorithm.
 */
cvox.SmartDomWalker.SMARTNAV_BREAKOUT_XPATH = './/blockquote |' +
    './/button |' +
    './/code |' +
    './/form |' +
    './/frame |' +
    './/h1 |' +
    './/h2 |' +
    './/h3 |' +
    './/h4 |' +
    './/h5 |' +
    './/h6 |' +
    './/hr |' +
    './/iframe |' +
    './/input |' +
    './/object |' +
    './/ol |' +
    './/p |' +
    './/pre |' +
    './/select |' +
    './/table |' +
    './/tr |' +
    './/ul |' +
    // Aria widget roles
    './/*[@role="alert"] |' +
    './/*[@role="alertdialog"] |' +
    './/*[@role="button"] |' +
    './/*[@role="checkbox"] |' +
    './/*[@role="combobox"] |' +
    './/*[@role="dialog"] |' +
    './/*[@role="log"] |' +
    './/*[@role="marquee"] |' +
    './/*[@role="menubar"] |' +
    './/*[@role="progressbar"] |' +
    './/*[@role="radio"] |' +
    './/*[@role="radiogroup"] |' +
    './/*[@role="scrollbar"] |' +
    './/*[@role="slider"] |' +
    './/*[@role="spinbutton"] |' +
    './/*[@role="status"] |' +
    './/*[@role="tab"] |' +
    './/*[@role="tabpanel"] |' +
    './/*[@role="textbox"] |' +
    './/*[@role="toolbar"] |' +
    './/*[@role="tooltip"] |' +
    './/*[@role="treeitem"] |' +
    // Aria structure roles
    './/*[@role="article"] |' +
    './/*[@role="document"] |' +
    './/*[@role="group"] |' +
    './/*[@role="heading"] |' +
    './/*[@role="img"] |' +
    './/*[@role="list"] |' +
    './/*[@role="math"] |' +
    './/*[@role="region"] |' +
    './/*[@role="row"] |' +
    './/*[@role="separator"]';


/**
 * Initializes table traversal if the current node is part of a table.
 * @return {boolean} Whether or not there is a table here.
 */
cvox.SmartDomWalker.prototype.enterTable = function() {
  // Find out if this node is part of a table

  if (! this.tableMode) {
    // We are not currently looking in a table. Check ancestors of this node.
    if (cvox.DomUtil.isDescendantOf(this.currentNode, 'TABLE')) {
      var ancestors = cvox.DomUtil.getAncestors(this.currentNode);

      for (var i = (ancestors.length - 1); i >= 0; i--) {
        if (ancestors[i].tagName == 'TABLE') {
          this.currentTableNavigator = new cvox.TraverseTable(ancestors[i]);
          this.tables.push(this.currentTableNavigator);

          this.announceTable = true;

          this.tableMode = true;
          return true;
        }
      }
      // No ancestor TABLE node found.
      return false;
    } else {
      this.tableMode = false;
      return false;
    }
  } else {
    // We are currently looking in a table. Change currentTableNavigator
    // to point to nested table.

    var currentCell = this.currentTableNavigator.getCell();
    var tableChildren = cvox.XpathUtil.evalXPath('.//TABLE', currentCell);
    if (tableChildren.length != 0) {
      // If it has more than one child that is a table, point to the first one
      this.currentTableNavigator = new cvox.TraverseTable(tableChildren[0]);
      this.tables.push(this.currentTableNavigator);

      this.announceTable = true;
      return true;
    } else {
      // No nested tables. Do nothing.
      return false;
    }
  }
};


/**
 * Stops traversing the current table.
 */
cvox.SmartDomWalker.prototype.exitTable = function() {
  this.tableMode = false;
};


/**
 * Navigates to the first cell of the table.
 * @return {Node} Returns the first cell. Null if the table does not have
 * a valid first cell.
 */
cvox.SmartDomWalker.prototype.goToFirstCell = function() {
  if (this.tableMode) {
    if (this.currentTableNavigator.goToCell([0, 0])) {

      this.previousNode = this.currentNode;
      this.setCurrentNode(this.currentTableNavigator.getCell());

      return this.currentNode;
    }
  }
  return null;
};


/**
 * Navigates to the last cell of the table.
 * @return {Node} Returns the last cell. Null if the table does not have
 * a valid last cell.
 */
cvox.SmartDomWalker.prototype.goToLastCell = function() {
  if (this.tableMode) {
    if (this.currentTableNavigator.goToLastCell()) {

      this.previousNode = this.currentNode;
      this.setCurrentNode(this.currentTableNavigator.getCell());

      return this.currentNode;
    }
  }
  return null;
};


/**
 * Navigates to the first cell of current row of the table.
 * @return {Node} Returns the first cell of the row. Null if the table row does
 * not have a valid first cell.
 */
cvox.SmartDomWalker.prototype.goToRowFirstCell = function() {
  if (this.tableMode) {
    var cursor = this.currentTableNavigator.currentCellCursor;
    if (this.currentTableNavigator.goToCell([cursor[0], 0])) {
      this.previousNode = this.currentNode;
      this.setCurrentNode(this.currentTableNavigator.getCell());

      return this.currentNode;
    }
  }
  return null;
};


/**
 * Navigates to the last cell of the current column of the table.
 * @return {Node} Returns the last cell of the row. Null if the table row
 * does not have a valid last cell.
 */
cvox.SmartDomWalker.prototype.goToRowLastCell = function() {
  if (this.tableMode) {
    if (this.currentTableNavigator.goToRowLastCell()) {

      this.previousNode = this.currentNode;
      this.setCurrentNode(this.currentTableNavigator.getCell());

      return this.currentNode;
    }
  }
  return null;
};


/**
 * Navigates to the first cell of current column of the table.
 * @return {Node} Returns the first cell of the column. Null if the table column
 * does not have a valid first cell.
 */
cvox.SmartDomWalker.prototype.goToColFirstCell = function() {
  if (this.tableMode) {
    var cursor = this.currentTableNavigator.currentCellCursor;
    if (this.currentTableNavigator.goToCell([0, cursor[1]])) {
      this.previousNode = this.currentNode;
      this.setCurrentNode(this.currentTableNavigator.getCell());

      return this.currentNode;
    }
  }
  return null;
};


/**
 * Navigates to the last cell of the current column of the table.
 * @return {Node} Returns the last cell of the column. Null if the table column
 * does not have a valid last cell.
 */
cvox.SmartDomWalker.prototype.goToColLastCell = function() {
  if (this.tableMode) {
    if (this.currentTableNavigator.goToColLastCell()) {

      this.previousNode = this.currentNode;
      this.setCurrentNode(this.currentTableNavigator.getCell());

      return this.currentNode;
    }
  }
  return null;
};


/**
 * Navigates to the previous row of the table. If table traversal has not
 * started, navigates to the first cell of the table.
 * @return {Node} Returns the cell in the previous row (same column) of the
 * table. Null if the table does not have a cell in that location.
 */
cvox.SmartDomWalker.prototype.previousRow = function() {
  if (this.tableMode) {
    var activeIndex = this.currentTableNavigator.currentCellCursor;
    if ((activeIndex) &&
        (this.currentTableNavigator.goToCell([(activeIndex[0] - 1),
          activeIndex[1]]))) {
      this.previousNode = this.currentNode;
      this.setCurrentNode(this.currentTableNavigator.getCell());

      return this.currentNode;

    }
  }
  return null;
};


/**
 * Navigates to the next row of the table. If table traversal has not
 * started, navigates to the first cell of the table.
 * @return {Node} Returns the cell in the next row (same column) of the
 * table. Null if the table does not have a cell in that location.
 */
cvox.SmartDomWalker.prototype.nextRow = function() {
  if (this.tableMode) {
    var activeIndex = this.currentTableNavigator.currentCellCursor;
    if ((activeIndex) &&
        (this.currentTableNavigator.goToCell([(activeIndex[0] + 1),
                                              activeIndex[1]]))) {
      this.previousNode = this.currentNode;
      this.setCurrentNode(this.currentTableNavigator.getCell());

      return this.currentNode;

    }
  }
  return null;
};


/**
 * Navigates to the previous column of the table. If table traversal has not
 * started, navigates to the first cell of the table.
 * @return {Node} Returns the cell in the previous column (same row) of the
 * table. Null if the table does not have a cell in that location.
 */
cvox.SmartDomWalker.prototype.previousCol = function() {
  if (this.tableMode) {
    var activeIndex = this.currentTableNavigator.currentCellCursor;
    if ((activeIndex) &&
        (this.currentTableNavigator.goToCell([activeIndex[0],
                                              (activeIndex[1] - 1)]))) {
      this.previousNode = this.currentNode;
      this.setCurrentNode(this.currentTableNavigator.getCell());

      return this.currentNode;
    }
  }
  return null;
};


/**
 * Navigates to the next column of the table. If table traversal has not
 * started, navigates to the first cell of the table.
 * @return {Node} Returns the cell in the next column (same row) of the
 * table. Null if the table does not have a cell in that location.
 */
cvox.SmartDomWalker.prototype.nextCol = function() {
  if (this.tableMode) {
    var activeIndex = this.currentTableNavigator.currentCellCursor;
    if ((activeIndex) &&
        (this.currentTableNavigator.goToCell([activeIndex[0],
                                              (activeIndex[1] + 1)]))) {
      this.previousNode = this.currentNode;
      this.setCurrentNode(this.currentTableNavigator.getCell());

      return this.currentNode;
    }
  }
  return null;
};


/** @inheritDoc */
cvox.SmartDomWalker.prototype.next = function() {
  this.previousNode = this.currentNode;

  /* Make sure the handle to the current element is still valid (attached to
   * the document); if it isn't, use the cached list of ancestors to find a
   * valid node, then resume navigation from that point.
   * The current node can be invalidated by AJAX changing content.
   */
  if (this.currentNode &&
      !cvox.DomUtil.isAttachedToDocument(this.currentNode)) {
    for (var i = this.currentAncestors.length - 1, ancestor;
         ancestor = this.currentAncestors[i]; i--) {
      if (cvox.DomUtil.isAttachedToDocument(ancestor)) {
        this.setCurrentNode(ancestor);
        // Previous-Next sequence to put us back at the correct level.
        this.previous();
        this.next();
        break;
      }
    }
  }

  return this.nextContentNode();
};


/** @inheritDoc */
cvox.SmartDomWalker.prototype.previous = function() {
  this.previousNode = this.currentNode;

  /* Make sure the handle to the current element is still valid (attached to the
   * document); if it isn't, use the cached list of ancestors to find a valid
   * node, then resume navigation from that point.
   * The current node can be invalidated by AJAX changing content.
   */
  if (this.currentNode &&
      !cvox.DomUtil.isAttachedToDocument(this.currentNode)) {
    for (var i = this.currentAncestors.length - 1, ancestor;
        ancestor = this.currentAncestors[i]; i--) {
      if (cvox.DomUtil.isAttachedToDocument(ancestor)) {
        this.setCurrentNode(ancestor);
        // Next-previous sequence to put us back at the correct level.
        this.next();
        this.previous();
        break;
      }
    }
  }

  return this.prevContentNode();
};


/**
 * Returns the text content of the row header(s) of the active table cell.
 * @return {string} The text content of the row header(s) of the current cell
 * or '' if the cell has no row headers. If there is more than one header,
 * their text content is concatenated into one string which is returned.
 */
cvox.SmartDomWalker.prototype.getRowHeaderText = function() {
  var rowHeaderText = '';
  if (this.tableMode) {
    var rowHeaders = this.currentTableNavigator.getCellRowHeaders();
    for (var i = 0; i < rowHeaders.length; i++) {
      rowHeaderText += cvox.DomUtil.collapseWhitespace(
          cvox.DomUtil.getValue(rowHeaders[i]) + ' ' +
          cvox.DomUtil.getName(rowHeaders[i]));
    }
  }
  return rowHeaderText;
};


/**
 * Returns the text content for the first cell in the current row. This is
 * used as the 'best guess' at a row header for the current cell, when no
 * row header is explicitly specified.
 * @return {string} The text content of the guessed row header of the current
 * cell or '' if we aren't in table mode.
 */
cvox.SmartDomWalker.prototype.getRowHeaderGuess = function() {
  var rowHeaderText = '';
  if (this.tableMode) {
    var currentCursor = this.currentTableNavigator.currentCellCursor;
    var firstCellInRow =
        this.currentTableNavigator.getCellAt([currentCursor[0], 0]);
    rowHeaderText += cvox.DomUtil.collapseWhitespace(
        cvox.DomUtil.getValue(firstCellInRow) + ' ' +
        cvox.DomUtil.getName(firstCellInRow));
  }
  return rowHeaderText;
};


/**
 * Returns the text content of the col header(s) of the active table cell.
 * @return {string} The text content of the col header(s) of the current cell
 * or '' if the cell has no col headers. If there is more than one header,
 * their text content is concatenated into one string which is returned.
 */
cvox.SmartDomWalker.prototype.getColHeaderText = function() {
  var colHeaderText = '';
  if (this.tableMode) {
    var colHeaders = this.currentTableNavigator.getCellColHeaders();
    for (var i = 0; i < colHeaders.length; i++) {
      colHeaderText += cvox.DomUtil.collapseWhitespace(
          cvox.DomUtil.getValue(colHeaders[i]) + ' ' +
          cvox.DomUtil.getName(colHeaders[i]));
    }
  }
  return colHeaderText;
};


/**
 * Returns the text content for the first cell in the current col. This is
 * used as the 'best guess' at a col header for the current cell, when no
 * col header is explicitly specified.
 * @return {string} The text content of the guessed col header of the current
 * cell or '' if we aren't in table mode.
 */
cvox.SmartDomWalker.prototype.getColHeaderGuess = function() {
  var colHeaderText = '';
  if (this.tableMode) {
    var currentCursor = this.currentTableNavigator.currentCellCursor;
    var firstCellInCol =
        this.currentTableNavigator.getCellAt([0, currentCursor[1]]);
    colHeaderText += cvox.DomUtil.collapseWhitespace(
        cvox.DomUtil.getValue(firstCellInCol) + ' ' +
        cvox.DomUtil.getName(firstCellInCol));
  }
  return colHeaderText;
};


/**
 * Returns the current row index.
 * @return {?number} The current row index. Null if we aren't in table mode.
 */
cvox.SmartDomWalker.prototype.getRowIndex = function() {
  if (this.tableMode) {
    // Add 1 because the table navigator is zero-indexed.
    return this.currentTableNavigator.currentCellCursor[0] + 1;
  }
  return null;
};


/**
 * Returns the current column index.
 * @return {?number} The current column index. Null if we aren't in table mode.
 */
cvox.SmartDomWalker.prototype.getColIndex = function() {
  if (this.tableMode) {
    // Add 1 because the table navigator is zero-indexed.
    return this.currentTableNavigator.currentCellCursor[1] + 1;
  }
  return null;
};


/**
 * Returns the current number of rows.
 * @return {?number} The number of rows. Null if we aren't in table mode.
 */
cvox.SmartDomWalker.prototype.getRowCount = function() {
  if (this.tableMode) {
    // Add 1 because the table navigator is zero-indexed.
    return this.currentTableNavigator.rowCount;
  }
  return null;
};


/**
 * Returns the current number of columns.
 * @return {?number} The number of columns. Null if we aren't in table mode.
 */
cvox.SmartDomWalker.prototype.getColCount = function() {
  if (this.tableMode) {
    // Add 1 because the table navigator is zero-indexed.
    return this.currentTableNavigator.colCount;
  }
  return null;
};


/**
 * Returns true if this annotation should be grouped as a collection,
 * meaning that instead of repeating the annotation for each item, we
 * just announce <annotation> collection with <n> items at the front.
 *
 * Currently enabled for links, but could be extended to support other
 * roles that make sense.
 *
 * @param {string} annotation The annotation text.
 * @return {boolean} If this annotation should be a collection.
 */
cvox.SmartDomWalker.prototype.isAnnotationCollection = function(annotation) {
  return (annotation == 'Link');
};


/**
 * Returns a description of the navigation to the current element.
 * @return {Array.<cvox.NavDescription>} The description of the navigation.
 */
cvox.SmartDomWalker.prototype.getCurrentDescription = function() {
  // Use a linear DOM walker in non-smart mode to traverse all of the
  // nodes inside the current smart node and return their annotations.
  var results = [];

  var walker = new cvox.LinearDomWalker();
  walker.currentNode = this.currentNode;
  walker.useSmartNav = false;
  walker.previous();
  walker.next();

  function incrementKey(map, key) {
    var value = map[key];
    value = value ? value + 1 : 1;
    map[key] = value;
  }

  var annotations = [];
  while (cvox.DomUtil.isDescendantOfNode(
      walker.currentNode, this.currentNode)) {
    var ancestors;
    if (results.length == 0) {
      ancestors = cvox.DomUtil.getUniqueAncestors(
          this.previousNode, walker.currentNode);
    } else {
      ancestors = walker.getUniqueAncestors();
    }
    var description = cvox.DomUtil.getDescriptionFromAncestors(ancestors);
    results.push(description);
    if (annotations.indexOf(description.annotation) == -1) {
      annotations.push(description.annotation);
    }
    walker.next();
  }

  // If all of the items have the same annotation, describe it as a
  // <annotation> collection with <n> items. Currently only enabled
  // for links, but support should be added for any other type that
  // makes sense.
  if (results.length >= 3 &&
      annotations.length == 1 &&
      annotations[0].length > 0 &&
      this.isAnnotationCollection(annotations[0])) {
    var commonAnnotation = results[0].annotation;
    var firstContext = results[0].context;
    results[0].context = '';
    for (var i = 0; i < results.length; i++) {
      results[i].annotation = '';
    }

    results.splice(0, 0, new cvox.NavDescription(
        firstContext,
        '',
        '',
        commonAnnotation + ' collection with ' + results.length + ' items'));
  }

  if (this.announceTable) {
    results.splice(0, 0, new cvox.NavDescription(
        this.currentTableNavigator.rowCount + ' rows, ' +
        this.currentTableNavigator.colCount + ' columns',
        '',
        '',
        ''));
    this.announceTable = false;
  }

  if (this.tableMode) {
    results.push(new cvox.NavDescription(
        '', '', '', 'empty cell'));

    // Deal with spanned cells
    results.push(new cvox.NavDescription(
        '', '', '', 'spanned'));
  }

  return results;
};


/** @inheritDoc */
cvox.SmartDomWalker.prototype.isLeafNode = function(targetNode) {
  if (targetNode.tagName == 'LABEL') {
    return cvox.DomUtil.isLeafNode(targetNode);
  }
  if (cvox.DomUtil.isLeafNode(targetNode)) {
    return true;
  }
  if (!cvox.XpathUtil.xpathSupported()) {
    // If there is no xpath, don't bother trying to do the other checks, just
    // return false. While this is not strictly correct, it will at least allow
    // this to fail gracefully in cases where xpath is not available (ie, older
    // versions of Android) by making it behave the same way as linear DOM
    // walker.
    return false;
  }
  var content = cvox.DomUtil.collapseWhitespace(
      cvox.DomUtil.getValue(targetNode) + ' ' +
      cvox.DomUtil.getName(targetNode));
  if (content.length > cvox.SmartDomWalker.SMARTNAV_MAX_CHARCOUNT) {
    return false;
  }
  if (content.replace(/\s/g, '') === '') {
    // Text only contains whitespace
    return false;
  }
  var breakingNodes = cvox.XpathUtil.evalXPath(
      cvox.SmartDomWalker.SMARTNAV_BREAKOUT_XPATH, targetNode);
  for (var i = 0, node; node = breakingNodes[i]; i++) {
    if (cvox.DomUtil.hasContent(node)) {
      return false;
    }
  }
  if (cvox.AriaUtil.isCompositeControl(targetNode) &&
      !cvox.DomUtil.isFocusable(targetNode)) {
    return false;
  }
  return true;
};
