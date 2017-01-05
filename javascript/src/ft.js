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
    var Token = {
        Str_T:0,
        LogicOp2_T:1,
        LogicOp1_T:2,
        FunctionName_T:3,
        TemplateKey_T:4,
        Mixin_T:5,
        Mixin_T:6,
        EOF_T:7,
    };
    var State = {
        FT:0,
        statements:1;

    };
    var Lexer = 
    [
        {reg:/\s|\n|\r\n/,res:-1},//Skip the white space
        {reg:/>=/,res:Token.LogicOp2_T},
        {reg:/<=/,res:Token.LogicOp2_T},
        {reg:/>/,res:Token.LogicOp2_T},
        {reg:/</,res:Token.LogicOp2_T},
        {reg:/!/,res:Token.LogicOp1_T},
        {reg:/^template$/,res:Token.TemplateKey_T},
        {reg:/^#$/,res:Token.Mixin_T},
        {reg:/^(_|\w)[\w|\d]*/,res:Token.FunctionName_T},
        {reg:/^[\w\W]+/,res:Token.Str_T}
    ];

    var StateMarix=[
        []
    ];

    var currentState=0;

    var ast = {
        templateFunctions:[
        /**
            {
                name:"F",//function name
                body:[
                    {
                        content:"<li>",
                        type:0// string
                    },
                    {
                        content:"g(n)",
                        type:1// mixin
                    },
                    {
                        content:"</li>",
                        type:0// string
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
                    condition:true //condition pattern match
                    arguments:[
                        {
                            condition:"n>=1"
                        }
                    ]
                }
            }
        */
        ] 
    };

    function eat(token){

    };
    var state = {
        findTemplate:0,
        findTemplateName:1,
        findTempalteArgs:2,
        findStr:3,
        findMixin:4
    }
    function parse(input){
        

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
        var char;
        for(index=0;index<=input.length;index++){
            /*if(index==input.length){
                eat(token.EOF_T);
            }else{
                for(var i=0;i<Lexer.length;i++){

                }
            }*/
            /*if(index!=input.length){
                char = input.charAt[index];
            }else{
                char = "EOF";
            }
            columnCount++;
            if(char === '\n' || char==='\r\n'){
                lineCount++;
                columnCount = 0;
                continue;
            }
            if(currentState == state.findTemplate){
                if(char === ' '){
                    continue;
                }
                if(buffer.length == "template".length){]
                    if(buffer == "template"){
                        currentState = state.findTemplateName;
                        buffer = "";
                        currentTemplate = {};
                    }else{
                        throw Error("Syntax Error: Expect template defination");
                    }
                }else{
                    if(char == "EOF"){
                        throw Error("Syntax Error: Cannot find any template function defination");
                    }
                    buffer += char;
                }
            }
            if(currentState == state.findTemplateName){
                if(char === ' ' && buffer.length == 0){
                    continue;
                }else if(char === ' ' && buffer.length)
            }*/
        }
    }

    var buildInFuncPrefix = "__ft__build__in__";
    var templateFunctionsText = {};
    function init(){
        var buildInFuncPrefix = "__ft__build__in__";
        var templateFunctionsText = {};
    };
    var class2type = {} ;
    "Boolean Number String Function Array Date RegExp Object Error".split(" ").forEach(function(e,i){
        class2type[ "[object " + e + "]" ] = e;
    }) ;
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
                if(f.body[j].type==0){
                    body += buildInFuncPrefix+'res+="'+f.body[j].content+'";';
                }else if(f.body[j].type==1){
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
                var conds = ""
                if(f.args.arguments.length){
                    conds = "if("
                }
                for(var j=0;j<f.args.arguments.length;j++){
                    conds += f.args.arguments[j].condition;
                    if(j<args.arguments.length-1){
                        conds += "&&";
                    }
                }
                if(f.args.arguments.length){
                    conds += "){"+body"}";  
                    body = conds;
                }
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