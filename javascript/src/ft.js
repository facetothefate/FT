(function(root, factory) {
    if (typeof define === 'function' && define.amd) {

        define([false], factory);

    } else if (typeof module === 'object' && module.exports) {

        module.exports = factory(true);

    } else {
        root.FT = factory(false);
    }

}(this, function(node) {
    'use strict';
    //set true will have some debug output
    var debug = false;
    /* File system */
    function readFile(path, callback) {
        if (node) {
            var fs = require('fs');
            return fs.readFile(path, 'utf8', callback);
        } else {
            xmlhttp.open("GET", path, true);
            xmlhttp.onreadystatechange = function() {
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                    callback(null, xmlhttp.responseText);
                }
                //todo 
                //handle error here
            };
        }
    }

    /* runtime lib */
    var class2type = {};
    var typeList = [
        "Boolean", "Number", "String", "Function",
        "Array", "Date", "RegExp", "Object", "Error"
    ];
    typeList.forEach(function(e, i) {
        class2type["[object " + e + "]"] = e;
    });

    function typeof_(obj) {
        if (obj == null) {
            return String(obj);
        }
        return typeof obj === "object" || typeof obj === "function" ?
            class2type[class2type.toString.call(obj)] || "object" :
            typeof obj;
    }

    function checkTypeName(s) {
        for (var i = 0; i < typeList.length; i++) {
            if (s === typeList[i]) {
                return true;
            }
        }
        return false;
    }

    function isPath(s) {
        var regexp = new RegExp('^((http|https|ftp)?:\\/\\/)?' + // protocol
            '(((([a-z\\d]([a-z\\d\\-_]*[a-z\\d\\-_])*)\\.?)+[a-z]{2,}|' + // domain name
            '((\\d{1,3}\\.){3}\\d{1,3})))?' + // OR ip (v4) address
            '(\\:\\d+)?(\\.{0,3}\\/[-a-z\\d%_.~+]*)*' + // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
            '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
        return regexp.test(s);
    }

    /* Parser */
    /****
        Grammar：

        FT -> statements
        statements-> templateFunctionDef
                   | importDef
                   | statements
                   | //Empty
        templateFunctionDef-> TemplateKey_T FunctionName_T ( templateFunctionArgumentsDef ) { functionBody }
        
        templateFunctionArgumentsDef-> Str_T : Str_T  
                                    |  Str_T LogicOp2_T Str_T
                                    |  LogicOp1_T Str_T
                                    |  templateFunctionArgumentsDef , templateFunctionArgumentsDef
                                    |  //Empty

        functionBody-> Str_T  | mixin | functionBody mixin functionBody | //Empty

        mixin-> Mixin_T javascriptExpression Mixin_T
        //Currently we don't check this for now, keep the parse easy but engouh
        //The JS VM will help us to validate the js grammer
        //Actually
        mixin-> Mixin_T Str_T Mixin_T

    */

    var ast = {
        templateFunctions: [
            /* structure
                {
                    name:"F",//function name
                    body:[
                        {
                            content:"<li>",
                            type:1// string
                        },
                        {
                            content:"g(n)",
                            type:2// mixin
                        },
                        {
                            content:"</li>",
                            type:1// string
                        }
                    ],
                    args:{
                        type:true //definination
                        arguments:[
                            {
                                name:"n",
                                type:"Number"
                            }
                        ]
                    }// or
                    args:{
                        arguments:[
                            {
                                condition:"n>=1"
                            }
                        ]
                    }
                }
            */
        ],
        imports: {
            /*
                "../path/to/template/file" : false //init false, parsed, true
            */
        }
    };

    function cleanAst() {
        ast = {
            templateFunctions: [],
            imports: {}
        };
    }

    var state = {
        findNode: 0,
        findTemplateName: 1,
        findTemplateArgs: 2,
        findTemplateBody: 3,
        findImportPath: 4
    };

    function parse(input, path) {
        if (!path) {
            path = "input string"
        }
        //Validate
        if ((typeof_(input) !== "string")) {
            throw Error("Please give a validate input string");
        }
        var buffer = "";
        var token;
        var lineCount = 1;
        var columnCount = 0;
        var index = 0;
        var currentTemplate = {};
        var currentImport = {};
        var currentArgs = {};
        var currentState = 0;
        var comment = false;
        var mixinOpen = false;
        var char;
        for (index = 0; index <= input.length; index++) {
            if (index != input.length) {
                char = input[index];
            } else {
                //EOF
                if (currentState !== state.findNode) {
                    throw Error("Syntax Error: Unexpectd EOF");
                } else if (buffer.length != 0) {
                    throw Error("Syntax Error: Unexpectd EOF");
                }
            }
            columnCount++;
            if (char === '\n' || char === '\r') {
                lineCount++;
                columnCount = 0;
                if (comment) {
                    comment = false;
                }
                continue;
            }
            if (comment) {
                continue;
            }

            if (char === ' ' || char === '\t') {
                //for template body we take all char
                if (currentState !== state.findTemplateBody) {
                    continue;
                }
            }

            if (currentState === state.findNode) {
                buffer += char;
                if (buffer === "template") {
                    currentState = state.findTemplateName;
                    buffer = "";
                    currentTemplate = {};
                }
                if (buffer === "import") {
                    currentState = state.findImportPath;
                    buffer = "";
                    currentImport = {};
                }
                if (buffer === "//") {
                    comment = true;
                }
            } else if (currentState === state.findTemplateName) {
                if (char === "(") {
                    if (!buffer.length) {
                        throw Error("Syntax Error: Expect template function name \nFile: " +
                            path + " \nLine:" + lineCount + " Column:" + columnCount);
                    }
                    currentTemplate.name = buffer;
                    //to-do test if it is a legal function name
                    buffer = "";
                    currentState = state.findTemplateArgs;
                    currentTemplate.args = {
                        arguments: []
                    };
                    currentTemplate.body = [];
                    currentArgs = {};
                } else {
                    buffer += char;
                }
            } else if (currentState === state.findTemplateArgs) {
                if (char === ")") {
                    if (currentTemplate.args.type) {
                        //check type
                        if (!checkTypeName(buffer)) {
                            throw Error("Syntax Error: Unknown Type:" + buffer + "\nFile: " +
                                path + " \nLine:" + lineCount + " Column:" + columnCount);
                        }
                        currentArgs.type = buffer;
                        buffer = "";
                        currentTemplate.args.arguments.push(currentArgs);
                        currentArgs = {};
                    } else {
                        //add test syntax here
                        currentTemplate.args.condition = buffer;
                        buffer = "";
                    }
                } else if (char === ",") {
                    if (!currentTemplate.args.type) {
                        throw Error("Syntax Error: Expect argument type defination but got condition defination\nFile: " +
                            path + " \nLine:" + lineCount + " Column:" + columnCount);
                    }
                    if (!buffer.length) {
                        throw Error("Syntax Error: Expect argurment type defination here\nFile: " +
                            path + " \nLine:" + lineCount + " Column:" + columnCount);
                    }
                    //check type
                    if (!checkTypeName(buffer)) {
                        throw Error("Syntax Error: Unknown Type:" + buffer + "\nFile: " +
                            path + " \nLine:" + lineCount + " Column:" + columnCount);
                    }
                    currentArgs.type = buffer;
                    var legal = false;
                    for (var i = 0; i < typeList.length; i++) {
                        if (typeList[i] == buffer) {
                            legal = true;
                            break;
                        }
                    }
                    if (!legal) {
                        throw Error("Syntax Error: Expect argurment type is " +
                            typeList.join("|") +
                            " but got " + buffer +
                            "\nFile: " + path + "Line:" + lineCount + " Column:" + columnCount);
                    }
                    currentTemplate.args.arguments.push(currentArgs);
                    currentArgs = {};
                    buffer = "";
                } else if (char === ":") {
                    if (!buffer.length) {
                        throw Error("Syntax Error: Expect argurment name \nFile: " +
                            path + " \nLine:" + lineCount + " Column:" + columnCount);
                    }
                    currentArgs.name = buffer;
                    buffer = "";
                    currentTemplate.args.type = true;

                } else if (char === "{") {
                    currentState = state.findTemplateBody;
                } else {
                    buffer += char;
                }
            } else if (currentState === state.findTemplateBody) {
                if (char === "#") {
                    if (mixinOpen) {
                        mixinOpen = false;
                        currentTemplate.body.push({
                            content: buffer,
                            type: 2
                        });
                        buffer = "";
                    } else {
                        //string
                        currentTemplate.body.push({
                            content: buffer,
                            type: 1
                        });
                        buffer = "";
                        mixinOpen = true;
                    }
                } else if (char === "}") {
                    if (mixinOpen) {
                        //error
                        throw Error("Syntax Error: Expect mixin close '#' \nFile: " +
                            path + " \nLine:" + lineCount + " Column:" + columnCount);
                    } else {
                        //string
                        if (buffer.length) {
                            currentTemplate.body.push({
                                content: buffer,
                                type: 1
                            });
                            buffer = "";
                        }
                    }
                    ast.templateFunctions.push(currentTemplate);
                    currentState = state.findNode;
                    currentTemplate = {};
                } else {
                    buffer += char;
                }
            } else if (currentState === state.findImportPath) {
                if (char === ";") {
                    if (buffer.length) {
                        if (isPath(buffer)) {
                            ast.imports[buffer] = false;
                            currentState = state.findNode;
                            buffer = "";
                        } else {
                            throw Error("Invaild Path " +
                                " \nLine:" + lineCount + " Column:" + columnCount);
                        }
                    } else {
                        throw Error("Syntax Error: Expect import path \nFile: " +
                            path + " \nLine:" + lineCount + " Column:" + columnCount);
                    }
                } else {
                    buffer += char;
                }
            }
        }
        if (debug) {
            console.log(JSON.stringify(ast, null, '    '));
        }
    }
    /* Linker */
    /*
     * @breif this function will solve all the import AST
     *        call the parse to the target file and mark the import 
     *        have been done
     */
    function link(callback) {
        var allCompiled = true;
        for (var path in ast.imports) {
            if (ast.imports.hasOwnProperty(path)) {
                if (!ast.imports[path]) {
                    allCompiled = false;
                    readFile(path, function(err, data) {
                        if (err) {
                            throw err;
                        } else {
                            parse(data, path);
                            link(callback);
                        }
                    });
                    ast.imports[path] = true;
                }
            }
        }
        if (allCompiled) {
            callback();
        }
    }

    /* Interpreter */
    var buildInFuncPrefix = "__ft__build__in__";
    var objectCode = {};

    function init() {
        cleanAst();
        buildInFuncPrefix = "__ft__build__in__";
        objectCode = {};
    };

    var RunContext = function() {
        //to-do, there should be a LRU cache save the function results
        this.typeof_ = typeof_;
        this[buildInFuncPrefix + "isNumber"] = function(num) {
            return this.typeof_(num) === "number";
        }
        this[buildInFuncPrefix + "isString"] = function(func) {
            return this.typeof_(func) === "string";
        }
        this[buildInFuncPrefix + "isObject"] = function(obj) {
            return this.typeof_(obj) === "object";
        }
        this[buildInFuncPrefix + "isArray"] = function(arr) {
            return this.typeof_(arr) === "array";
        }
        this[buildInFuncPrefix + "isBool"] = function(bool) {
            return this.typeof_(bool) === "boolean";
        }
        this[buildInFuncPrefix + "isFunction"] = function(func) {
                return this.typeof_(func) === "function";
            }
            //useful for loop
        this.map = function(arr, stepper) {
            if (!this[buildInFuncPrefix + "isArray"](arr)) {
                throw Error("function: Map:Type Error, 1st args must be an array, it is actually:" + this.typeof_(arr));
            }
            if (!this[buildInFuncPrefix + "isFunction"](stepper)) {
                throw Error("function: Map:Type Error, 2nd args must be a function, it is actually:" + this.typeof_(stepper));
            }
            var res = "";
            for (var i = 0; i < arr.length; i++) {
                res += stepper(arr[i]);
            }
            return res;
        }
    };

    /*compiler*/
    /*
     * @breif this function will translate a template function
     *        to a javascript function
     */
    function compileObjCode() {
        //Init the template functions
        for (var i = 0; i < ast.templateFunctions.length; i++) {
            objectCode[ast.templateFunctions[i].name] = {
                body: "",
                arguments: "",
                argumentsLength: 0 //in case we need this in future
            };
        }
        for (var i = 0; i < ast.templateFunctions.length; i++) {
            var f = ast.templateFunctions[i];
            var body = 'var ' + buildInFuncPrefix + 'res="";';
            for (var j = 0; j < f.body.length; j++) {
                if (f.body[j].type == 1) {
                    body += buildInFuncPrefix + 'res+="' + f.body[j].content + '";';
                } else if (f.body[j].type == 2) {
                    body += buildInFuncPrefix + 'res+=(' + f.body[j].content + ');';
                }
            }
            body += 'return ' + buildInFuncPrefix + 'res;';

            var argsText = "";
            if (f.args.type) {
                var polymorphism = "if(";
                for (var j = 0; j < f.args.arguments.length; j++) {
                    var name = f.args.arguments[j].name;
                    var type = f.args.arguments[j].type;
                    argsText += name;
                    if (j < f.args.arguments.length - 1) {
                        argsText += ",";
                    }
                    polymorphism += "this." + buildInFuncPrefix + "is" + type + "(" + name + ")&&";
                }
                polymorphism += "arguments.length==" + f.args.arguments.length + "){";
                body = polymorphism + body + "}";

                objectCode[f.name].arguments = argsText;
                objectCode[f.name].argumentsLength = f.args.arguments.length;
                objectCode[f.name].body += body;
            } else if (f.args.condition) {
                //add pattern match conditon
                body = "if(" + f.args.condition + "){" + body + "}";
                objectCode[f.name].body = body + objectCode[f.name].body;
            }

        }
        //Add polymorphism check
        for (var func in objectCode) {
            objectCode[func].body +=
                "var argumentInfo='[';";
            objectCode[func].body +=
                "for(var i=0; i<arguments.length; i++){";
            objectCode[func].body +=
                "   argumentInfo += this.typeof_(arguments[i]) + '(value:' + arguments[i] + ')]';}";
            objectCode[func].body +=
                "throw Error('Cannot find the function: " + func +
                " with arguments signature:'+ argumentInfo)";
        }
        if (debug) {
            console.log(JSON.stringify(objectCode, null, '    '));
        }
    }

    /*
     * @breif this function will make the template function call be called
     */
    function makeObjCodeCallable(context) {
        for (var key in objectCode) {
            context[key] = new Function(objectCode[key].arguments,
                objectCode[key].body);
        }
    }

    function compile() {
        var context = new RunContext();
        compileObjCode();
        makeObjCodeCallable(context);
        return context;
    }

    function run(context, func, values) {
        return context[func].apply(context, values);
    }

    var contextCache = {};
    /*
     * @breif User function, pass in a template file/string, a template function name
     *        return the running result
     */
    function render(input, func, values, callback, cache) {
        init();
        /* 
         * detact if it is a string or a path
         */
        if (isPath(input)) {
            ast.imports[input] = false;
        } else {
            //is a string input, try to compile it directly
            parse(input);
        }
        link(function() {
            var context;
            if (cache) {
                //to-do, this should be a LRU cache
                if (contextCache[input]) {
                    context = contextCache[input];
                } else {
                    contextCache[input] = context;
                    context = compile();
                }
            } else {
                context = compile();
            }
            try {
                var res = run(context, func, values)
                callback(res);
            } catch (e) {
                console.error(e);
                throw e;
            }
        });
    }
    return {
        //Some helpers for test 
        init: init,
        getAst: function() {
            return ast
        },
        parse: parse,
        getObjectCode: function() {
            return objectCode;
        },
        compile: compile,
        run: run,
        //User function
        render: render,
    };
}));