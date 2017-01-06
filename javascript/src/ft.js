(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
    
        define([false], factory);
    
    } else if (typeof module === 'object' && module.exports) {
    
        module.exports= factory(true);
    
    } else {
        root.FT = factory(false);
    }

}(this, function (node) {
    'use strict';
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

    var currentState=0;

    var ast = {
        templateFunctions:[
        /**
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
                    condition:"n>=1"
                }
            }
        */
        ],
        imports:[]
    };
    var class2type = {} ;
    var typeList = [
        "Boolean", "Number", "String", "Function", 
        "Array", "Date", "RegExp", "Object", "Error"
    ];
    typeList.forEach(function(e,i){
        class2type[ "[object " + e + "]" ] = e;
    }) ;
    var state = {
        findNode:0,
        findTemplateName:1,
        findTemplateArgs:2,
        findTemplateBody:3,
        findImportPath:4
    }
    function parse(input,path){
        if(!path){
            path = "input string"
        }

        //Validate
        if((typeof str !=='string') || (str.constructor !==String)){
            throw Error("Please give a validate input string");
        }
        var buffer="";
        var token;
        var lineCount = 1;
        var columnCount = 0;
        var index=0;
        var currentTemplate = {};
        var currentImport = {};
        var currentArgs = {};
        var comment = false;
        var mixinOpen = false;
        var char;
        for(index=0;index<=input.length;index++){
            if(index!=input.length){
                char = input.charAt[index];
            }else{
                //EOF
                if(currentState !== state.findNode){
                    throw Error("Syntax Error: Unexpectd EOF");
                }   
            }
            columnCount++;
            if(char === '\n' || char==='\r\n'){
                lineCount++;
                columnCount = 0;
                if(comment){
                    comment = false;
                }
                continue;
            }
            if(comment){
                continue;
            }
            if(currentState !== state.findTemplateBody){
                if(char === ' '){
                    continue;
                }
            }
            
            if(currentState == state.findNode){
                buffer += char;
                if(buffer == "template"){
                    currentState = state.findTemplateName;
                    buffer = "";
                    currentTemplate = {};
                }
                if(buffer == "import"){
                    currentState = state.findImportPath;
                    buffer = "";
                    currentImport = {};
                }
                if(buffer == "//"){
                    comment = true;
                }
            }
            if(currentState == state.findTemplateName){
                if(char==="("){
                    if(!buffer.length){
                        throw Error("Syntax Error: Expect template function name \nFile: "+path+" Line:"+lineCount+" Column:"+ columnCount);
                    }
                    currentTemplate.name = buffer;
                    //to-do test if it is a legal function name
                    buffer = "";
                    currentState = state.findTemplateArgs;
                    currentTemplate.args = {arguments:[]};
                    currentTemplate.body = [];
                    currentArgs = {};
                }else{
                    buffer += char;
                }
            }
            if(currentState == state.findTemplateArgs){
                if(char===")"){
                    if(currentTemplate.args.type){
                        currentArgs.type = buffer;
                        currentTemplate.args.arguments.push(currentArgs);
                        currentArgs = {};
                    }else{
                        //add test syntax here
                        currentTemplate.args.condition = buffer;
                    }
                }else if(char ===","){
                    if(!buffer.length){
                        throw Error("Syntax Error: Expect argurment type defination here\nFile: " 
                                    + path + " Line:" + lineCount + " Column:" + columnCount);
                    }
                    currentArgs.type = buffer.trim();
                    var legal = false;
                    for(var i=0; i< typeList.length; i++){
                        if(typeList[i]==buffer){
                            legal = true;
                            break;
                        }
                    }
                    if(!legal){
                        throw Error("Syntax Error: Expect argurment type is " 
                                    + typeList.join("|") 
                                    + " but got " + buffer 
                                    + "\nFile: " + path + "Line:" + lineCount + " Column:" + columnCount);
                    }
                    currentTemplate.args.arguments.push(currentArgs);
                    currentArgs = {};
                    buffer = "";
                }else if(char === ":"){
                    if(!buffer.length){
                        throw Error("Syntax Error: Expect argurment name \nFile: "+path+" Line:"+lineCount+" Column:"+ columnCount);
                    }
                    currentArgs.name = buffer;
                    buffer = "";
                    currentTemplate.args.type = true;
                }else if(char === "{"){
                    currentState = state.findTemplateBody;
                }else{
                    buffer += char;
                }
            }
            if(currentState == state.findTemplateBody){
                if(char=="#"){
                    if(mixinOpen){
                        mixinOpen = false;
                        currentTemplate.body.push({content:buffer,type:2});
                        buffer = "";
                    }else{
                        //string
                        currentTemplate.body.push({content:buffer,type:1});
                        buffer = "";
                        mixinOpen = true;
                    }
                }else if(char == "}"){
                    if(mixinOpen){
                        //error
                        throw Error("Syntax Error: Expect mixin close '#' \nFile: "+path+" Line:"+lineCount+" Column:"+ columnCount);
                    }else{
                        //string
                        currentTemplate.body.push({content:buffer,type:1});
                        buffer = "";
                    }
                    ast.templateFunctions.push(currentTemplate);
                    currentState = state.findNode;
                }else{
                    buffer += char;
                }
            }
            if(currentState == state.findImportPath){
                if(char==";"){
                    if(buffer.length){
                        //to-do test if a path
                        ast.imports.push(buffer);
                    }else{
                        throw Error("Syntax Error: Expect import path \nFile: "+path+" Line:"+lineCount+" Column:"+ columnCount);
                    }
                }
            }
        }
    }

    var buildInFuncPrefix = "__ft__build__in__";
    var templateFunctionsText = {};
    function init(){
        var buildInFuncPrefix = "__ft__build__in__";
        var templateFunctionsText = {};
    };
    
    function typeof_(obj){
        if ( obj == null ){
            return String( obj );
        }
        return typeof obj === "object" || typeof obj === "function" ?
            class2type[ class2type.toString.call(obj) ] || "object" :
            typeof obj;
    }
    var templateFunctionRunContext = function(){
        this.typeof_ = typeof_;
        this[buildInFuncPrefix + "isNumber"] = function(num){
            return this.typeof_(num) === "Number";
        }
        this[buildInFuncPrefix + "isStr"] = function(str){
            return this.typeof_(str) === "String";
        }
        this[buildInFuncPrefix + "isObject"] = function(obj){
            return this.typeof_(obj) === "Object";
        }
        this[buildInFuncPrefix + "isArray"] = function(arr){
            return this.typeof_(arr) === "Array";
        }
        this[buildInFuncPrefix + "isBool"] = function(bool){
            return this.typeof_(bool) === "Boolean";
        }
        this[buildInFuncPrefix + "isFunc"] = function(func){
            return this.typeof_(func) === "Function";
        }
        //useful for loop
        this.map=function(arr,stepper){
            if(!this[buildInFuncPrefix + "isArray"](arr)){
                throw Error("function: Map:Type Error, 1st args must be an array, it is actually:" + this.typeof_(arr));
            }
            if(!this[buildInFuncPrefix + "isFunc"](stepper)){
                throw Error("function: Map:Type Error, 2nd args must be a function, it is actually:" + this.typeof_(stepper));
            }
            var res="";
            for(var i=0;i<arr.length;i++){
                res += stepper(arr[i]);
            }
            return res;
        }
    }
    //to-do
    /*
    * @breif this function will solve all the import AST
    *        call the parse to the target file and mark the import 
    *        have been done
    */
    function handleImport(){

    }

    /*
    * @breif this function will translate a template function
    *        to a javascript function
    */
    function regTemplateFunction(){
        //Init the template functions
        for(var i = 0;i < ast.templateFunctions.length; i++){
            templateFunctionsText[ast.templateFunctions[i].name]={
                body:"",
                arguments:"",
                argumentsLength:0 //in case we need this in future
            };
        }
        for(var i = 0;i < ast.templateFunctions.length; i++){
            var f = ast.templateFunctions[i];
            var body = 'var '+ buildInFuncPrefix +'res="";';
            for(var j=0;j<f.body.length;j++){
                if(f.body[j].type==1){
                    body += buildInFuncPrefix+'res+="'+f.body[j].content+'";';
                }else if(f.body[j].type==2){
                    body += buildInFuncPrefix+'res+=('+f.body[j].content+');';
                }
            }
            body +='return '+buildInFuncPrefix+'res;';

            var argsText = "";
            if(f.args.type){
                var polymorphism = "if(";
                for(var j=0;j<f.args.arguments.length;j++){
                    var name = f.args.arguments[j].name;
                    var type = f.args.arguments[j].type;
                    argsText += name;
                    if(j<args.arguments.length-1){
                        argsText += ",";
                    }
                    polymorphism += "this."+buildInFuncPrefix+type+"("+name+")&&";
                }
                polymorphism += "arguments.length=="+f.args.arguments.length + "{";
                body = polymorphism + body + "}";

                templateFunctionsText[f.name].arguments = argsText;
                templateFunctionsText[f.name].argumentsLength = f.args.arguments.length;
            }else if(f.args.condition){
                //add pattern match conditon
                body= "if("+f.args.condition+"){"+body"}";
            }
            templateFunctionsText[f.name].body += body;
        }
        //Add polymorphism check
        for(var i = 0; i < ast.templateFunctions.length; i++){
            var body = templateFunctionsText[ast.templateFunctions[i].name].body;
            body += 
                "var argumentInfo='|';";
            body += 
                "for(var i=0; i<arguments.length; i++){";
            body +=
                "   argumentInfo += this.typeof_(arguments[i]) + '(=' + arguments[i] + ')|'";
            body += 
                "throw Error('Cannot find the function with signature:'+ argumentInfo)";
        }
    }

    /*
    * @breif this function will make the template function call be called
    */
    function makeTemplateFunctionCallable(context){
        for(var key in templateFunctionsText){
            context[key] = new function(templateFunctionsText[key].arguments,
                                        templateFunctionsText[key].body);
        }
    }

    function compile(context){
        handleImport();
        regTemplateFunction();
        makeTemplateFunctionCallable(context);
    }


    /*
    * @breif User function, pass in a template file/string, a template function name
    *        return the running result
    */
    function render(input, func, values){
        init();
        /* to-do
         * detact if it is a string or a path
         */
        parse(input);
        var context = new templateFunctionRunContext();
        compile(context);
        try{
            return context[func].apply(context,values);
        }catch(e){
            console.error(e);
            throw e;
        }
    }
    return {
        ast:ast,
        render:render
    };
}));