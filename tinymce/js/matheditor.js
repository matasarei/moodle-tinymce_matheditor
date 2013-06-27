/**
 * *************************************************************************
 * *                               MathEditor                             **
 * *************************************************************************
 * @package     tinymce                                                   **
 * @subpackage  matheditor                                                **
 * @name        MathEditor                                                **
 * @copyright   oohoo.biz                                                 **
 * @link        http://oohoo.biz                                          **
 * @author      Raymond Wainman (wainman@ualberta.ca)                     **
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later  **
 * *************************************************************************
 * ************************************************************************ */

/**
 * Useful MathQuill API documentation: https://github.com/mathquill/mathquill
 */

/**
 * Constructor for the {@code MathEditor} widget.
 *
 * @param container the container identifier, will append the widget into this container
 * @param editor the active editor object, this object must implement the {@code getLang(ident)}
 *          method which simply retrieves a localized string
 * @param insertHander a callback which accepts one argument that is the value to be inserted, that
 *          is {@code function(latex) { do something with returned value }}, this function is
 *          triggered when the user clicks the insert button, if this is {@code undefined} then the
 *          insert button is NOT shown, in which case one can access the user input via the
 *          {@code Matheditor.prototype.getLatex()} method
 * @param buttonList a list of the buttons to show within the editor, this is simply a comma
 *          delimited list of button identifiers (see the content[] array defined at the bottom of
 *          this file for all the button names), a simple example would be "alpha,plus,cos"
*/
MathEditor = function(container, editor, insertHandler, buttonList) {
    this.top_container = $(container);
    this.editor = editor;
    this.insertHandler = insertHandler;
    if(buttonList) {
        this.setButtonList(buttonList, false);
    }
    this.content = this.getContent_();
    this.colours = this.getColours_();
    this.decorate_();
};

/**
 * Constructor for the {@code Button} object which are used as different mathematical operators
 * to be inserted into the equation.
 *
 * @param name the name of the button, shown in the form of a tooltip
 * @param display the icon shown on the button itself
 * @param latex the latex command corresponding to the button
 */
 MathEditor.Button = function(name, display, latex) {
    this.name = name;
    this.display = display;
    this.latex = latex;
};

/**
 * Factory method to create a generic button with a LaTeX command. Will simply use the
 * {@code mathquill('write', latex)} API call to MathQuill when inserting the value in the
 * equation.
 *
 * @param name the name of the button, shown in the form of a tooltip
 * @param display the icon shown on the button itself
 * @param latex the latex command corresponding to the button
 */
 MathEditor.B = function(name, display, latex) {
    return new MathEditor.Button(name, display, latex);
};

/**
 * Factory method to create a generic button that will prompt the user to specify a matrix size
 * first before making a call to the MathQuill API.
 *
 * @param name the name of the button, shown in the form of a tooltip
 * @param display the icon shown on the button itself
 * @param prepend the latex command prepend, this will usually be something like '\\left('
 * @param postpend the latex command postpend, this will usually be something like '\\right)'
*/
MathEditor.BM = function(name, display, prepend, postpend) {
    var button = new MathEditor.Button(name, display, null);
    button.matrix = true;
    button.prepend = prepend;
    button.postpend = postpend;
    return button;
};

/**
 * Constructor for the {@code Tab} object. This is simply a grouping of buttons that correspond to
 * a particular category and consequently a tab in the widget.
 *
 * @param name the name of the tab, shown at the top of the widget
 * @param buttons the set of buttons corresponding to this tab
 */
 MathEditor.Tab = function(name, buttons) {
    this.name = name;
    this.buttons = buttons;
};

/**
 * Convenience factory method for the {@code Tab} object.
 *
 * @param name the name of the tab, shown at the top of the widget
 * @param buttons the set of buttons corresponding to this tab
 */
 MathEditor.T = function(name, buttons) {
    return new MathEditor.Tab(name, buttons);
};

/**
 * Sentinel object to indicate a new line within the editor tab.
 */
 MathEditor.Break = function() {
    // Empty
};

MathEditor.Colour = function(name, colour) {
    this.name = name;
    this.colour = colour;
};

MathEditor.C = function(name, colour) {
    return new MathEditor.Colour(name, colour);
};

/**
 * Decorates the specified container with the widget. Generates all of the DOM nodes and appends
 * them to this container.
 *
 * @private
 */
 MathEditor.prototype.decorate_ = function() {
    this.container = $('<div class="matheditor-container"></div>')
    .appendTo(this.top_container);

    this.generateTabs_();
    this.generatePanes_();
    this.generateMatrixInput_();

    // Equation field
    this.equation = $('<div class="matheditor-equation"></span>')
    .appendTo(this.container);
    this.equation.mathquill('editable');

    // Latex Field
    this.latex = $('<textarea class="matheditor-latex"></textarea>')
    .appendTo(this.container);
    this.latex.css('visibility', 'hidden');
    this.generateLatexButton_();

    this.bindEvents_();
};

/**
 * Removes the editor from the specified container (given in the constructor).
 *
 * @private
 */
 MathEditor.prototype.undecorate_ = function() {
    this.top_container.empty();
};

/**
 * Generates the top category tabs across the top of the widget.
 *
 * @private
 */
 MathEditor.prototype.generateTabs_ = function() {
    var self = this;
    var tabList = $('<div class="matheditor-tabs"><ul></ul></div>').appendTo(this.container);
    var paneContainer = $('<div class="matheditor-panes"></div>').appendTo(self.container);
    $(this.content).each(function(index, tab) {
        tab.dom = $('<li>' + self.editor.getLang(tab.name) + '</li>').appendTo(tabList);
        tab.pane = $('<div class="matheditor-pane"></div>').appendTo(paneContainer);
        tab.pane.hide();
    });
    if(!self.buttonMap) {
        this.generateSideBar_(paneContainer);
    }
    $('<div class="matheditor-clear"></div>').appendTo(paneContainer);
};

/**
 * Generates the panes for each category and the buttons within each.
 *
 * @private
 */
 MathEditor.prototype.generatePanes_ = function() {
    var self = this;
    $(this.content).each(function(index, tab) {
        var tabHasContent = false;
        $(tab.buttons).each(function(index, button) {
            // Filter out buttons that the user doesn't want
            if(self.buttonMap && !self.buttonMap[button.name] && tab.name !== 'matheditor.variables') {
                return;
            }
            if(button instanceof MathEditor.Break) {
                tab.pane.append('<br/>');
            } else {
                var classValue = '';
                if(!button.matrix) {
                    classValue = 'class="matheditor-pane-button"';
                }

                if(self.buttonMap && self.singleTab) {
                    var targetTab = self.content[self.content.length - 1].pane;
                } else {
                    tabHasContent = true;
                    var targetTab = tab.pane;
                }

                button.dom = $('<button ' + classValue + ' title="' +
                    self.editor.getLang(button.name) +'"></button>').appendTo(targetTab);
                button.dom.html('\\(' + button.display + '\\)');
            }
        });
        if(!tabHasContent) {
            tab.dom.hide();
            tab.hasContent = false;
        } else {
            tab.hasContent = true;
        }
    });

    // Activate the first SHOWN tab
    var oneActive = false;
    $(this.content).each(function(index, tab) {
        if(tab.hasContent && !oneActive) {
            oneActive = true;
            tab.pane.css('display', 'inline-block');
            tab.dom.addClass('matheditor-tabs-active');
        }
    });
    if(this.buttonMap) {
        this.content[this.content.length - 1].pane.show();
        this.content[this.content.length - 1].dom.addClass('matheditor-tabs-active');
    }
};

MathEditor.prototype.generateSideBar_ = function(element) {
    var self = this;
    var sidebar = $('<div class="matheditor-sidebar"></div>').appendTo(element);
    this.colourDropdown = $('<button><div class="matheditor-colour matheditor-colour-black" '
        + 'title="' + self.editor.getLang('matheditor.font_color') + '"></div></button>')
    .appendTo(sidebar);
    this.generateColourPicker_(sidebar);
    this.bold = $('<button class="matheditor-bold" title="' + self.editor.getLang('matheditor.bold')
        + '">B</button>').appendTo(sidebar);
    this.italic = $('<button class="matheditor-italic" title="' + self.editor.getLang('matheditor.italic')
        + '">I</button>')
    .appendTo(sidebar);
};

MathEditor.prototype.generateColourPicker_ = function(element) {
    var self = this;
    this.colourPicker = $('<div class="matheditor-form"></div>').appendTo(element);
    $(this.colours).each(function(index, colour) {
        colour.dom = $('<div class="matheditor-colour matheditor-colour-' + colour.colour + '" '
            + 'title="' + self.editor.getLang(colour.name) + '"></div>')
        .appendTo(self.colourPicker);
    });
    this.colourPicker.hide();
};

/**
 * Generates the matrix parameter input form (rows and columns prompt).
 *
 * @private
 */
 MathEditor.prototype.generateMatrixInput_ = function() {
    this.form = $('<div class="matheditor-form"></div>').appendTo(this.container);
    this.form.append('Rows: ');
    this.form.rows = $('<input type="number" min="1" class="matheditor-form-number" value="1">')
    .appendTo(this.form);
    this.form.append('<br/>Columns: ');
    this.form.cols = $('<input type="number" min="1" class="matheditor-form-number" value="1">')
    .appendTo(this.form);
    this.form.append('<br/>');
    this.form.button = $('<button>' + this.editor.getLang('matheditor.create') + '</button>')
    .appendTo(this.form);
    this.form.hide();
};

/**
 * Generates the LaTeX toggle button in the bottom right of the widget, this button is used to
 * toggle the LaTeX text box.
 *
 * @private
 */
 MathEditor.prototype.generateLatexButton_ = function() {
    var footerDiv = $('<div class="matheditor-buttons"></div>').appendTo(this.container);
    this.latexButton = $('<div class="matheditor-buttons-latex">'
        + this.editor.getLang('matheditor.latex')
        + ' <input type="checkbox"></div>').appendTo(footerDiv);
    if(this.insertHandler) {
        this.insertButton = $('<div class="matheditor-buttons-insert">'
            + this.editor.getLang('matheditor.insert') + ' &#x25B6</div>')
        .appendTo(footerDiv);
    }
};

/**
 * Inserts a matrix into the equation, this is triggered after the user has entered the matrix
 * parameters.
 *
 * @private
 */
 MathEditor.prototype.insertMatrix_ = function() {
    var latex = this.activeMatrix.prepend;
    latex += '\\begin{matrix}';
    for(var row = 0; row < this.form.rows.val(); row++) {
        // There are column-1 ampersands (since it is a delimiter)
        for(var col = 0; col < this.form.cols.val() - 1; col++) {
            latex += '&';
        }
        // Same idea as the ampersand, the backslashes are only used as delimiters
        if(row != (this.form.rows.val() -1)) {
            latex += '\\\\';
        }
    }
    latex += '\\end{matrix}';
    latex += this.activeMatrix.postpend;
    this.equation.mathquill('write', latex);
    this.updateLatex_();
};

/**
 * Resets the Matrix size input form to the default 2x2 size.
 *
 * @private
 */
 MathEditor.prototype.matrixInputReset_ = function() {
    this.form.rows.val(2);
    this.form.cols.val(2);
};

/**
 * Binds all of the events for the widget.
 *
 * @private
 */
 MathEditor.prototype.bindEvents_ = function() {
    var self = this;
    // Matrix Input Form Events
    $('html').click(function() {
        self.form.hide();
        self.colourPicker.hide();
    });
    this.form.click(function(e) {
        e.stopPropagation();
    });
    this.form.button.click(function(e) {
        e.stopPropagation();
        self.form.hide();
        self.insertMatrix_();
        e.preventDefault();
    });

    // Tabs and button events
    $(this.content).each(function(index, tab) {
        tab.dom.mouseover(function() {
            self.hidePanes_();
            tab.dom.addClass('matheditor-tabs-active');
            tab.pane.css('display', 'inline-block');
        });
        $(tab.buttons).each(function(buttonIndex, button) {
            if(button instanceof MathEditor.Break) {
                return;
            }
            if(self.buttonMap && !self.buttonMap[button.name]
                && tab.name !== 'matheditor.variables') {
                return;
            }
            button.dom.click(function(e) {
                if (button.matrix) {
                    e.stopPropagation();
                    self.activeMatrix = button;
                    self.matrixInputReset_();
                    var offsetTop = e.pageY - self.container.offset().top;
                    var offsetLeft = e.pageX - self.container.offset().left;
                    self.form.css({
                        top: offsetTop + 15,
                        left: offsetLeft
                    });
                    self.form.toggle();
                } else {
                    if (button.cmd != null) {
                        self.equation.mathquill('cmd', button.cmd);
                    } else {
                        self.equation.mathquill('write', button.latex);
                    }
                    self.updateLatex_();
                }
                e.preventDefault();
            });
        });
    });

    // Equation box events
    this.equation.bind('input propertychange keyup', function() {
        self.updateLatex_();
    });

    // LaTeX text event
    this.latex.bind('input propertychange', function() {
        self.updateEquation_();
    });

    // LaTeX button events
    this.latexButton.click(function() {
        var checkbox = self.latexButton.find(':checkbox');
        if(self.latex.css('visibility') == 'visible') {
            self.latex.css('visibility', 'hidden');
            checkbox.prop('checked', false);
        } else {
            self.latex.css('visibility', 'visible');
            checkbox.prop('checked', true);
        }
    });

    // Insert TinyMCE content
    if(this.insertHandler) {
        this.insertButton.click(function() {
            self.insertHandler(self.latex.val());
        });
    }

    if(!this.buttonMap) {
        // Colour picker events
        this.colourDropdown.click(function(e) {
            e.preventDefault();
            e.stopPropagation();
            self.colourPicker.toggle();
        });

        $(this.colours).each(function(index, colour) {
            colour.dom.click(function() {
                self.colourPicker.hide();
                self.equation.mathquill('color', colour.colour);
                self.updateLatex_();
            });
        });

        // Bold and Italic buttons
        this.bold.click(function() {
            self.equation.mathquill('bold');
            self.updateLatex_();
        });
        this.italic.click(function() {
            self.equation.mathquill('italic');
            self.updateLatex_();
        });
    }
};

/**
 * Refreshes the LaTeX textbox with the latest LaTeX code from the equation pane. Uses the
 * {@code mathquill('latex')} API call.
 *
 * @private
 */
 MathEditor.prototype.updateLatex_ = function() {
    var latex = this.equation.mathquill('latex');
    this.latex.val('');
    this.latex.val(latex);
    if(this.callback) {
        this.callback(latex);
    }
};

/**
 * Refreshes the MathQuill equation box with the latest LaTeX code from the LaTeX text box.
 *
 * @private
 */
 MathEditor.prototype.updateEquation_ = function() {
    var latex = this.latex.val();
    this.equation.mathquill('revert');
    this.equation.mathquill('editable');
    this.equation.mathquill('write', latex);
    if(this.callback) {
        this.callback(latex);
    }
};

/**
 * Hides all the button panes.
 *
 * @private
 */
 MathEditor.prototype.hidePanes_ = function() {
    $(this.content).each(function(index, tab) {
        tab.dom.removeClass('matheditor-tabs-active');
        tab.pane.hide();
    });
};

/**
 * Sets the active equation to the LaTeX value given.
 *
 * @param latex the equation latex string
 */
 MathEditor.prototype.setLatex = function(latex) {
    if(latex != '') {
        this.equation.mathquill('write', latex);
        this.updateLatex_();
    }
};

/**
 * Gets the LaTeX of the current user input equation.
 *
 * @return string the latex for the current equation
 */
 MathEditor.prototype.getLatex = function() {
    return this.latex.val();
};

/**
 * Set an onchange callback event which is fired every time the user modifies the equation.
 *
 * @param callback function with one argument which is the new latex code
 */
 MathEditor.prototype.onChange = function(callback) {
    this.callback = callback;
};

/**
 * Sets the buttons shown in the editor.
 *
 * @param buttonList a list of the buttons to show within the editor, this is simply a comma
 *          delimited list of button identifiers (see the content[] array defined at the bottom of
 *          this file for all the button names), a simple example would be "alpha,plus,cos"
 * @param redocorate the editor (true/false)
 * @param singleTab show all buttons in a single tab
 */
 MathEditor.prototype.setButtonList = function(buttonList, redecorate, singleTab) {
    this.singleTab = singleTab;
    buttonList = buttonList.split(',');
    // Only use single tab if there are less than 20 buttons
    if(buttonList.length > 20) {
        this.singleTab = false;
    }
    this.buttonMap = [];
    var buttonMap = this.buttonMap;
    $(buttonList).each(function(index, name) {
        buttonMap['matheditor.' + name.trim()] = true;
    });
    var singleTab = new MathEditor.T('asd', []);
    this.content.push(singleTab);
    if(redecorate) {
        var latex = this.getLatex();
        this.undecorate_();
        this.decorate_(); // Redraw the editor
        this.setLatex(latex);
    }
};

/**
 * Retrieves a comma delimited list of all the possible buttons that can appear within the editor.
 *
 * @returns a comma delimited list of button names
 */
 MathEditor.prototype.getButtonList = function() {
    var allButtons = [];
    $(this.content).each(function(tabIndex, tab) {
        $(tab.buttons).each(function(buttonIndex, button) {
            if(button instanceof MathEditor.Break) {
                return;
            }
            allButtons.push(button.name.substring(11));
        });
    });
    return allButtons.join(',');
};

/**
 * Adds a new tab labelled variables to the editor with the specified buttons.
 *
 * @param variables a 
 */
 MathEditor.prototype.setVariables = function(variables) {
    var variableTab = new MathEditor.T('matheditor.variables', []);
    $(variables).each(function() {
        variableTab.buttons.push(new MathEditor.B('', '\\(' + this + '\\)', this));
    });
    this.content.push(variableTab);
    var latex = this.getLatex();
    this.undecorate_();
    this.decorate_(); // Redraw the editor
    this.setLatex(latex);
};

/**
 * Generates all of the content for the math editor.
 *
 * @private
 */
 MathEditor.prototype.getContent_ = function() {
    return [
    MathEditor.T('matheditor.general', [
        MathEditor.B('matheditor.comma', ',', ','),
        MathEditor.B('matheditor.bullet', '&#x2219', '\\bullet'),
        MathEditor.B('matheditor.plus_minus', '±', '\\pm'),
        MathEditor.B('matheditor.minus_plus', '&#x2213', '\\mp'),
        MathEditor.B('matheditor.equal', '=', '='),
        MathEditor.B('matheditor.not_equal', '&#x2260', '\\neq'),
        MathEditor.B('matheditor.asymptotically_equal', '&#x2243', '\\simeq'),
        MathEditor.B('matheditor.approximately', '&#x223C', '\\sim'),
        MathEditor.B('matheditor.subscript', '&#x2610<sub>&#x25A1</sub>', '{\\placeholder}_{\\placeholder}'),
        MathEditor.B('matheditor.subscript_left', '<sub>&#x25A1</sub>&#x2610', '_{\\placeholder}{\\placeholder}'),
        MathEditor.B('matheditor.superscript', '&#x2610<sup>&#x25A1</sup>', '{\\placeholder}^{\\placeholder}'),
        MathEditor.B('matheditor.superscript_left', '<sup>&#x25A1</sup>&#x2610', '^{\\placeholder}{\\placeholder}'),
        MathEditor.B('matheditor.subsuper_left', '<span class="supsub"><sup class="superscript">' +
                '&#x25A1</sup><sub class="subscript">&#x25A1</sub></span>&nbsp;&nbsp;&nbsp;&#x2610',
                '^{\\placeholder}_{\\placeholder}{\\placeholder}'),
        MathEditor.B('matheditor.subsuper', '&#x2610<span class="supsub"><sup class="superscript">' +
                '&#x25A1</sup><sub class="subscript">&#x25A1</sub></span>&nbsp;&nbsp;',
                '{\\placeholder}^{\\placeholder}_{\\placeholder}'),
        MathEditor.B('matheditor.fraction', '<sup>&#x25A1</sup>/<sub>&#x25A1</sub>', '\\frac{}{}'),
        MathEditor.B('matheditor.round_braces', '(&#x25A1)', '\\left( \\right)'),
        MathEditor.B('matheditor.square_braces', '[&#x25A1]', '\\left[ \\right]'),
        MathEditor.B('matheditor.absolute_braces', '|&#x25A1|', '\\left| \\right|'),
        MathEditor.B('matheditor.curly_braces', '{&#x25A1}', '\\left\\{ \\right\\}'),
        MathEditor.B('matheditor.angle_braces', '&#x27E8&#x25A1&#x27E9', '\\left\\langle \\right\\rangle'),
        MathEditor.B('matheditor.vector', '&#x25A1&#x20D7', '\\vec{}'),
        MathEditor.B('matheditor.hat', '&#x25A1&#x0302', '\\hat{}'),
        MathEditor.B('matheditor.overline', '&#x25A1&#x0305', '\\overline{}'),
        MathEditor.B('matheditor.bar', '&#x25A1&#x0304', '\\bar{}'),
        MathEditor.B('matheditor.log', 'log', '\\log'),
        MathEditor.B('matheditor.logbase', 'log&#x25A1', '\\log_{}'),
        MathEditor.B('matheditor.natural_log', 'ln', '\\ln'),
        MathEditor.B('matheditor.exponential', 'e<sup>&#x25A1</sup>', 'e^{}'),
        MathEditor.B('matheditor.sin', 'sin', '\\sin'),
        MathEditor.B('matheditor.cos', 'cos', '\\cos'),
        MathEditor.B('matheditor.tan', 'tan', '\\tan'),
        MathEditor.B('matheditor.sec', 'sec', '\\sec'),
        MathEditor.B('matheditor.csc', 'csc', '\\csc'),
        MathEditor.B('matheditor.cot', 'cot', '\\cot'),
        MathEditor.B('matheditor.sinh', 'sinh', '\\sinh'),
        MathEditor.B('matheditor.cosh', 'cosh', '\\cosh'),
        MathEditor.B('matheditor.tanh', 'tanh', '\\tanh'),
        MathEditor.B('matheditor.arcsin', 'arcsin', '\\arcsin'),
        MathEditor.B('matheditor.arccos', 'arccos', '\\arccos'),
        MathEditor.B('matheditor.arctan', 'arctan', '\\arctan')
        ]),
    MathEditor.T('matheditor.operators', [
        MathEditor.B('matheditor.plus', '+', '+'),
        MathEditor.B('matheditor.minus', '-', '-'),
        MathEditor.B('matheditor.times', '×', '\\times'),
        MathEditor.B('matheditor.division', '÷', '\\div'),
        MathEditor.B('matheditor.definition', '&#x2255', '≔'),
        MathEditor.B('matheditor.factorial', '!', '!'),
        MathEditor.B('matheditor.oplus', '&#x2295', '\\oplus'),
        MathEditor.B('matheditor.otimes', '&#x2297', '\\otimes'),
        MathEditor.B('matheditor.square_root', '&#x221A &#x25A1', '\\sqrt{}'),
        MathEditor.B('matheditor.square_root_power', '<sup>&#x25A1</sup>&#x221A &#x25A1', '\\sqrt[{}]{}'),
        MathEditor.B('matheditor.ceiling', '&#x2308&#x25A1&#x2309', '\\left\\lceil \\right\\rceil'),
        MathEditor.B('matheditor.floor', '&#x230A&#x25A1&#x230B', '\\left\\lfloor \\right\\rfloor'),
        MathEditor.B('matheditor.sum_limits', '&#x2211<span class="supsub"><sup class="superscript">' +
                '&#x25A1</sup><sub class="subscript">&#x25A1</sub></span>&nbsp;&nbsp;', '\\sum_{}^{}'),
        MathEditor.B('matheditor.sum', '&#x2211', '\\sum'),
        MathEditor.B('matheditor.product_limits', '&#x220F<span class="supsub"><sup class="superscript">' +
                '&#x25A1</sup><sub class="subscript">&#x25A1</sub></span>&nbsp;&nbsp;', '\\prod_{}^{}'),
        MathEditor.B('matheditor.product', '&#x220F', '\\prod'),
        MathEditor.B('matheditor.coproduct_limits', '&#x2210<span class="supsub"><sup class="superscript">' +
                '&#x25A1</sup><sub class="subscript">&#x25A1</sub></span>&nbsp;&nbsp;', '\\coprod_{}^{}'),
        MathEditor.B('matheditor.coproduct', '&#x2210', '\\coprod'),
        MathEditor.B('matheditor.less', '<', '<'),
        MathEditor.B('matheditor.less_equal', '&#x2264', '\\le'),
        MathEditor.B('matheditor.greater', '>', '>'),
        MathEditor.B('matheditor.greater_equal', '&#x2265', '\\ge')
        ]),
    MathEditor.T('matheditor.calculus', [
        MathEditor.B('matheditor.limit', 'lim', '\\lim_{}{\\placeholder}'),
        MathEditor.B('matheditor.integral_limits', '&#x222B<span class="supsub"><sup class="superscript">' +
                '&#x25A1</sup><sub class="subscript">&#x25A1</sub></span>&nbsp;&nbsp;', '\\int^{}_{}'),
        MathEditor.B('matheditor.integral', '&#x222B', '\\int'),
        MathEditor.B('matheditor.integral_contour_limits', '&#x222E<sub>&#x25A1</sub>', '\\oint_{}'),
        MathEditor.B('matheditor.integral_contour', '&#x222E', '\\oint'),
        MathEditor.B('matheditor.differential', 'd', 'd'),
        MathEditor.B('matheditor.partial', '&#x2202', '\\partial'),
        MathEditor.B('matheditor.nabla', '&#x2207;', '\\nabla')
        ]),
    MathEditor.T('matheditor.greek', [
        // Lower Case
        MathEditor.B('matheditor.alpha', '&#x03B1', '\\alpha'),
        MathEditor.B('matheditor.beta', '&#x03B2', '\\beta'),
        MathEditor.B('matheditor.gamma', '&#x03B3', '\\gamma'),
        MathEditor.B('matheditor.delta', '&#x03B4', '\\delta'),
        MathEditor.B('matheditor.epsilon', '&#x03B5', '\\epsilon'),
        MathEditor.B('matheditor.zeta', '&#x03B6', '\\zeta'),
        MathEditor.B('matheditor.eta', '&#x03B7', '\\eta'),
        MathEditor.B('matheditor.theta', '&#x03B8', '\\theta'),
        MathEditor.B('matheditor.iota', '&#x03B9', '\\iota'),
        MathEditor.B('matheditor.kappa', '&#x03BA', '\\kappa'),
        MathEditor.B('matheditor.lambda', '&#x03BB', '\\lambda'),
        MathEditor.B('matheditor.mu', '&#x03BC', '\\mu'),
        MathEditor.B('matheditor.nu', '&#x03BD', '\\nu'),
        MathEditor.B('matheditor.xi', '&#x03BE', '\\xi'),
        MathEditor.B('matheditor.omicron', '&#x03BF', 'o'),
        MathEditor.B('matheditor.pi', '&#x03C0', '\\pi'),
        MathEditor.B('matheditor.rho', '&#x03C1', '\\rho'),
        MathEditor.B('matheditor.sigma', '&#x03C3', '\\sigma'),
        MathEditor.B('matheditor.tau', '&#x03C4', '\\tau'),
        MathEditor.B('matheditor.upsilon', '&#x03C5', '\\upsilon'),
        MathEditor.B('matheditor.phi', '&#x03C6', '\\phi'),
        MathEditor.B('matheditor.chi', '&#x03C7', '\\chi'),
        MathEditor.B('matheditor.psi', '&#x03C8', '\\psi'),
        MathEditor.B('matheditor.omega', '&#x03C9', '\\omega'),

        // Upper Case
        MathEditor.B('matheditor.alpha_uppercase', '&#x0391', 'A'),
        MathEditor.B('matheditor.beta_uppercase', '&#x0392', 'B'),
        MathEditor.B('matheditor.gamma_uppercase', '&#x0393', '\\Gamma'),
        MathEditor.B('matheditor.delta_uppercase', '&#x0394', '\\Delta'),
        MathEditor.B('matheditor.epsilon_uppercase', '&#x0395', 'E'),
        MathEditor.B('matheditor.zeta_uppercase', '&#x0396', 'Z'),
        MathEditor.B('matheditor.eta_uppercase', '&#x0397', 'H'),
        MathEditor.B('matheditor.theta_uppercase', '&#x0398', '\\Theta'),
        MathEditor.B('matheditor.iota_uppercase', '&#x0399', 'I'),
        MathEditor.B('matheditor.kappa_uppercase', '&#x039A', 'K'),
        MathEditor.B('matheditor.lambda_uppercase', '&#x039B', '\\Lambda'),
        MathEditor.B('matheditor.mu_uppercase', '&#x039C', 'M'),
        MathEditor.B('matheditor.nu_uppercase', '&#x039D', 'N'),
        MathEditor.B('matheditor.xi_uppercase', '&#x039E', '\\Xi'),
        MathEditor.B('matheditor.omicron_uppercase', '&#x039F', 'O'),
        MathEditor.B('matheditor.pi_uppercase', '&#x03A0', '\\Pi'),
        MathEditor.B('matheditor.rho_uppercase', '&#x03A1', 'P'),
        MathEditor.B('matheditor.sigma_uppercase', '&#x03A3', '\\Sigma'),
        MathEditor.B('matheditor.tau_uppercase', '&#x03A4', 'T'),
        MathEditor.B('matheditor.upsilon_uppercase', '&#x03A5', 'Y'),
        MathEditor.B('matheditor.phi_uppercase', '&#x03A6', '\\Phi'),
        MathEditor.B('matheditor.chi_uppercase', '&#x03A7', 'X'),
        MathEditor.B('matheditor.psi_uppercase', '&#x03A8', '\\Psi'),
        MathEditor.B('matheditor.omega_uppercase', '&#x03A9', '\\Omega')
        ]),
    MathEditor.T('matheditor.matrix', [
        MathEditor.BM('matheditor.matrix', '&#x25A1 &#x25A1<br/>&#x25A1 &#x25A1', '', ''),
        MathEditor.BM('matheditor.matrix_parenthesis', '&#x239B &#x25A1 &#x25A1 &#x239E<br/>'
            + '&#x239D &#x25A1 &#x25A1 &#x23A0', '\\left(', '\\right)'),
        MathEditor.BM('matheditor.matrix_bracket', '&#x23A1 &#x25A1 &#x25A1 &#x23A4<br/>'
            + '&#x23A3 &#x25A1 &#x25A1 &#x23A6', '\\left[', '\\right]'),
        MathEditor.BM('matheditor.matrix_bar', '&#x23A2 &#x25A1 &#x25A1 &#x23A5<br/>'
            + '&#x23A2 &#x25A1 &#x25A1 &#x23A5', '\\left|', '\\right|')
        ]),
    MathEditor.T('matheditor.logicsets', [
        MathEditor.B('matheditor.implication', '&#x21D2', '\\Rightarrow'),
        MathEditor.B('matheditor.implication_left', '&#x21D0', '\\Leftarrow'),
        MathEditor.B('matheditor.equivalence', '&#x21D4', '\\Leftrightarrow'),
        MathEditor.B('matheditor.negation', '&#x00AC', '\\not'),
        MathEditor.B('matheditor.negation_tilde', '&#x223C', '\\sim'),
        MathEditor.B('matheditor.conjunction', '&#x2227', '\\land'),
        MathEditor.B('matheditor.disjunction', '&#x2228', '\\lor'),
        MathEditor.B('matheditor.forall', '&#x2200', '\\forall'),
        MathEditor.B('matheditor.exists', '&#x2203', '\\exists'),
        MathEditor.B('matheditor.not_exists', '&#x2204', '\\nexists'),
        MathEditor.B('matheditor.set_minus', '\\', '\\setminus'),
        new MathEditor.Break(),
        MathEditor.B('matheditor.empty_set', '&#x2205', '\\varnothing'),
        MathEditor.B('matheditor.union', '&#x222A', '\\cup'),
        MathEditor.B('matheditor.intersection', '&#x2229', '\\cap'),
        MathEditor.B('matheditor.subset_equal', '&#x2286','\\subseteq'),
        MathEditor.B('matheditor.not_subset_equal', '&#x2288','\\notsubseteq'),
        MathEditor.B('matheditor.subset', '&#x2282','\\subset'),
        MathEditor.B('matheditor.not_subset', '&#x2284','\\notsubset'),
        MathEditor.B('matheditor.superset_equal', '&#x2287','\\supseteq'),
        MathEditor.B('matheditor.not_superset_equal', '&#x2289','\\notsupseteq'),
        MathEditor.B('matheditor.superset', '&#x2283','\\supset'),
        MathEditor.B('matheditor.not_superset', '&#x2285','\\notsupset'),
        MathEditor.B('matheditor.in', '&#x2208', '\\in'),
        MathEditor.B('matheditor.not_in', '&#x2209', '\\notin'),
        MathEditor.B('matheditor.contains', '&#x220B', '\\ni'),
        MathEditor.B('matheditor.not_contains', '&#x220C', '\\notni')
        ]),
    MathEditor.T('matheditor.miscellaneous', [
        MathEditor.B('matheditor.infinity', '&#x221E', '\\infty'),
        MathEditor.B('matheditor.primes', '&#x2119', '\\primes'),
        MathEditor.B('matheditor.naturals', '&#x2115', '\\naturals'),
        MathEditor.B('matheditor.integers', '&#x2124', '\\integers'),
        MathEditor.B('matheditor.irrationals', '&#x1D540', '\\irrationals'),
        MathEditor.B('matheditor.rationals', '&#x211A', '\\rationals'),
        MathEditor.B('matheditor.reals', '&#x211D', '\\reals'),
        MathEditor.B('matheditor.complex', '&#x2102', '\\complex'),
        MathEditor.B('matheditor.perpendicular', '&#x22A5', '\\perp'),
        MathEditor.B('matheditor.parallel', '&#x2225', '\\parallel'),
        MathEditor.B('matheditor.therefore', '&#x2234', '\\therefore'),
        MathEditor.B('matheditor.because', '&#x2235', '\\because'),
        MathEditor.B('matheditor.dots_horizontal', '&#x22EF', '\\cdots'),
        MathEditor.B('matheditor.dots_vertical', '&#x22EE', '\\vdots'),
        MathEditor.B('matheditor.dots_diagonal', '&#x22F0', '\\ddots'),
        MathEditor.B('matheditor.arrow_left', '&#x2190', '\\longleftarrow'),
        MathEditor.B('matheditor.arrow_right', '&#x2192', '\\longrightarrow'),
        MathEditor.B('matheditor.angle', '&#x2220', '\\angle'),
        MathEditor.B('matheditor.hbar', '&#x210f', '\\hbar')
        ])
    ];
};

/**
 * Generates the colour objects for the editor.
 *
 * @private
 */
 MathEditor.prototype.getColours_ = function() {
    return [
    MathEditor.C('matheditor.black', 'black'),
    MathEditor.C('matheditor.red', 'red'),
    MathEditor.C('matheditor.blue', 'blue'),
    MathEditor.C('matheditor.magenta', 'magenta'),
    MathEditor.C('matheditor.green', 'green'),
    MathEditor.C('matheditor.purple', 'purple'),
    MathEditor.C('matheditor.orange', 'orange')
    ];
};
