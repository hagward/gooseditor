var editorDefaultHeight = parseInt($('#editor').css('height').slice(0, -2));
var editorHeightIncrease = parseInt($('#editor').css('font-size').slice(0, -2)) + 3;

var numLines = 1;
var numSpacesIndent = 4;
var documentLength = 0;

var autoCompleteLiterals = {'(': ')', '[': ']', '{': '}'};
var indentLiterals = {'{': '}'};

var indentText = [];
for (var i = 0; i < numSpacesIndent; i++)
	indentText.push(' ');
indentText = indentText.join('');

$(document).ready(function() {
	$('#editor').keydown(function(event) {
		// Indent when user presses tab.
		if (event.which == 9) {
			event.preventDefault();
			editorInsert(indentText, $('#editor').textrange('get')['position'], true);
		}
	});

	$('#editor').bind('updateInfo keyup mousedown mousemove mouseup', function() {
		updateLineNumberBar();
		if (getLengthDiff() == 1)
			autoComplete();
		documentLength = $('#editor').val().length;
	});
});

function updateLineNumberBar() {
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

function autoIndent() {
	console.log('autoIndent');
	var indentArray = [];
	var position = $('#editor').textrange('get')['position'];
	var indentLevel = getIndentLevel(position);
	console.log('level: ' + indentLevel);
	
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
}

function autoComplete() {
	var text = $('#editor').val();
	var cursorPos = $('#editor').textrange('get')['position'];
	var insertedChar = text.charAt(cursorPos - 1);
	if (insertedChar == '\n') {
		autoIndent();
	} else {
		var replacement = autoCompleteLiterals[insertedChar];
		if (replacement) {
			console.log('autoComplete');
			editorInsert(replacement, cursorPos, false);
			$('#editor').textrange('setcursor', cursorPos);
		}
	}
}

function getLengthDiff() {
	return $('#editor').val().length - documentLength;
}

/**
 * Returns the number of lines in the textarea.
 */
function getNumLines() {
	var text = $('#editor').val();
	var lines = text.split(/\r|\r\n|\n/);
	return lines.length;
}

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
 * Adjusts the height of the line number bar and the editor.
 */
function adjustHeight(newNumLines) {
	var newHeight = Math.max(editorHeightIncrease * newNumLines, editorDefaultHeight);
	$('#lineNumbers').css('height', newHeight + 'px');
	$('#editor').css('height', newHeight + 'px');
}

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