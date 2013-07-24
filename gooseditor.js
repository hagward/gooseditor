// Here follows some configurable variables.

var numSpacesIndent = 4;
var autoCompleteLiterals = {'(': ')', '[': ']', '{': '}', '\'': '\'', '"': '"'};
var ignoreLiterals = {')': '(', ']': '[', '}': '{', ':': ':', ';': ';', '\'': '\'', '"': '"'};
var indentLiterals = {'{': '}'};
var showLineNumbers = true;

// End of configuration.

var numLines = 1; // keeps track of the number of lines
var documentLength = 0; // used for calculating the diff in document length
var editorDefaultHeight = parseInt($('#editor').css('height').slice(0, -2));
var editorHeightIncrease = parseInt($('#editor').css('font-size').slice(0, -2)) + 3;
var indentText = [];
for (var i = 0; i < numSpacesIndent; i++)
	indentText.push(' ');
indentText = indentText.join('');

$(document).ready(function() {
	$('#useLineNumbers').prop('checked', showLineNumbers);

	// The keydown is only used to catch tab presses for now, as keypress
	// doesn't register that particular key.
	$('#editor').keydown(function(event) {
		var keyCode = event.keyCode || event.which;
		var cursorPos = $('#editor').textrange('get')['position'];
		// User presses tab.
		if (keyCode == 9) {
			// Try to indent.
			event.preventDefault();
			editorInsert(indentText, cursorPos, true);
		}
	});

	// Handle all regular keypresses.
	$('#editor').keypress(function(event) {
		var keyCode = event.keyCode || event.which;
		var cursorPos = $('#editor').textrange('get')['position'];
		// User inserts a newline.
		if (keyCode == 13) {
			event.preventDefault();
			var indentLevel = autoIndent(cursorPos);
			editorInsert('\n', cursorPos, false);
			$('#editor').textrange('setcursor',
				cursorPos + numSpacesIndent * indentLevel + 1);
		// User inserts a letter or special character.
		} else if (keyCode > 31 && keyCode < 128) {
			var insertedChar = String.fromCharCode(keyCode);
			if (ignoreLiterals[insertedChar] && $('#editor').val().charAt(cursorPos) == insertedChar) {
				event.preventDefault();
				$('#editor').textrange('setcursor', cursorPos + 1);
			} else {
				autoComplete(cursorPos, insertedChar);
			}
		}
		updateLineNumberBar();
	});

	// Update the line number bar when the content of the editor change. For
	// line number responsiveness.
	$('#editor').bind('input propertychange', function() {
		updateLineNumberBar();
	});

	// Here follows settings form listeners.

	$('#fontSize').change(function() {
		var fontSize = $('#fontSize').val();
		$('#lineNumbers').css('font-size', fontSize);
		$('#editor').css('font-size', fontSize);
	});

	$('#fontFamily').change(function() {
		var fontFamily = $('#fontFamily').val();
		$('#lineNumbers').css('font-family', fontFamily);
		$('#editor').css('font-family', fontFamily);
	});

	$('#useLineNumbers').change(function() {
		showLineNumbers = $('#useLineNumbers').prop('checked');
		if (!showLineNumbers) {
			$('#lineNumbers').hide();
		} else {
			updateLineNumberBar();
			$('#lineNumbers').show();
		}
	});
});

/**
 * Adjusts the height of the line number bar and the editor to match
 * 'newNumLines' number of lines or the height of the surrounding div,
 * whichever is the greatest.
 */
function adjustHeight(newNumLines) {
	var newHeight = Math.max(editorHeightIncrease * newNumLines, editorDefaultHeight);
	$('#lineNumbers').css('height', (newHeight + 4) + 'px');
	$('#editor').css('height', newHeight + 'px');
}

/**
 * Updates the text on the line number bar to show the current number of lines
 * in the document.
 */
function updateLineNumberBar() {
	if (!showLineNumbers)
		return;

	var newNumLines = getNumLines();
	var linesToInsert = [];
	if (newNumLines > numLines) {
		for (var i = numLines + 1; i <= newNumLines; i++)
			linesToInsert.push('<br>' + i);
		var currentLines = $('#lineNumbers').html();
		$('#lineNumbers').html(currentLines + linesToInsert.join(''));

		adjustHeight(newNumLines);
	} else if (newNumLines < numLines) {
		var charsToRemove = 0;
		for (var i = numLines; i > newNumLines; i--) {
			var numberStr = '' + i;
			charsToRemove += numberStr.length + 4;
		}
		var currentLines = $('#lineNumbers').html();
		$('#lineNumbers').html(currentLines.substring(0, currentLines.length - charsToRemove));
		$('#editor').css('height', (editorHeightIncrease * newNumLines) + 'px');

		adjustHeight(newNumLines);
	}
	numLines = newNumLines;
}

/**
 * Returns the number of lines in the editor.
 */
function getNumLines() {
	var text = $('#editor').val();
	var lines = text.split(/\r|\r\n|\n/);
	return lines.length;
}

/**
 * Indents the code at 'position' to the correct indentation (based on the
 * number of brackets) and adjusts the cursor position.
 */
function autoIndent(position) {
	var indentArray = [];
	var indentLevel = getIndentLevel(position);
	
	if (indentLevel > 0) {
		for (var i = 0; i < indentLevel; i++)
			indentArray.push(indentText);

		// Also indent the closing bracket, if exists.
		if (indentLiterals['{'] == $('#editor').val().charAt(position)) {
			indentArray.push('\n');
			for (var i = 0; i < indentLevel - 1; i++)
				indentArray.push(indentText);
		}
		editorInsert(indentArray.join(''), position, false);
		$('#editor').textrange('setcursor', position + indentLevel * numSpacesIndent);
	}
	return indentLevel;
}

/**
 * Returns the indentation level at 'position', based on the number of opened
 * and closed brackets up to that point.
 */
function getIndentLevel(position) {
	var ups = 0;
	var downs = 0;
	var text = $('#editor').val();
	for (var i = 0; i < position; i++) {
		var character = text.charAt(i);
		if (character == '{')
			ups++;
		else if (character == '}')
			if (downs < ups) downs++;
	}
	return ups - Math.min(ups, downs);
}

/**
 * Tries to auto-complete 'insertedChar' at 'position'.
 */
function autoComplete(position, insertedChar) {
	var replacement = autoCompleteLiterals[insertedChar];
	if (replacement) {
		editorInsert(replacement, position, false);
		$('#editor').textrange('setcursor', position);
		return true;
	}
	return false;
}

/**
 * Inserts 'text' at 'position' in the editor. If 'setCursor' is set, the
 * cursor will be set to the end of the insertion.
 */
function editorInsert(text, position, setCursor) {
	var doc = $('#editor').val();
	var docPieces = [
		doc.substring(0, position),
		text,
		doc.substring(position, doc.length)
	];
	$('#editor').val(docPieces.join(''));

	if (setCursor) {
		position += text.length;
		$('#editor').textrange('setcursor', position);
	}
}