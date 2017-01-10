/**************************************************
 * @author Zhifei Fang
 * @license MIT
 * @desc This is the unit test for the FT javascript
 * Don't run it direclty, run it with the npm cmd:
 *          npm run test
 **************************************************/
var assert = require('assert');
var FT = require("../src/ft.js");
var fs = require("fs");
describe('Parser test', function() {
    it('Single template', function() {
        //make sure we have a clean AST
        FT.init();
        FT.parse("template T(a:Number){ a is #a#}");
        assert.deepStrictEqual(FT.getAst(), {
            "templateFunctions": [{
                "name": "T",
                "args": {
                    "arguments": [{
                        "name": "a",
                        "type": "Number"
                    }],
                    "type": true
                },
                "body": [{
                    "content": " a is ",
                    "type": 1
                }, {
                    "content": "a",
                    "type": 2
                }]
            }],
            "imports": {}
        });
    });
    it('Single import', function() {
        //make sure we have a clean AST
        FT.init();
        FT.parse("import ../test_templates/basic.ft;");
        assert.deepStrictEqual(FT.getAst().imports, {
            "../test_templates/basic.ft": false
        });
    });
    it('Mix import and template', function() {
        //make sure we have a clean AST
        FT.init();
        FT.parse("import ../test_templates/basic.ft;\ntemplate T(a:Number){ a is #a#}");
        assert.deepStrictEqual(FT.getAst(), {
            "templateFunctions": [{
                "name": "T",
                "args": {
                    "arguments": [{
                        "name": "a",
                        "type": "Number"
                    }],
                    "type": true
                },
                "body": [{
                    "content": " a is ",
                    "type": 1
                }, {
                    "content": "a",
                    "type": 2
                }]
            }],
            "imports": {
                "../test_templates/basic.ft": false
            }
        });
    });
    it('Complex template', function() {
        //make sure we have a clean AST
        FT.init();
        //Root is the javascript/
        var content = fs.readFileSync("test/test_templates/basic.ft", "utf8");
        FT.parse(content, "test/test_templates/basic.ft");
        assert.deepStrictEqual(FT.getAst(), {
            "templateFunctions": [{
                "name": "typeBlock",
                "args": {
                    "arguments": [{
                        "name": "type",
                        "type": "Number"
                    }],
                    "type": true
                },
                "body": [{
                    "content": "\t<div>This is for unknown type<div>",
                    "type": 1
                }]
            }, {
                "name": "typeBlock",
                "args": {
                    "arguments": [],
                    "condition": "type==0"
                },
                "body": [{
                    "content": "\t<span> This is the type for: ",
                    "type": 1
                }, {
                    "content": "type",
                    "type": 2
                }, {
                    "content": " <span>",
                    "type": 1
                }]
            }, {
                "name": "typeBlock",
                "args": {
                    "arguments": [],
                    "condition": "type==1"
                },
                "body": [{
                    "content": "\t<p>  p This is the type for: ",
                    "type": 1
                }, {
                    "content": "type",
                    "type": 2
                }, {
                    "content": " </p>",
                    "type": 1
                }]
            }, {
                "name": "typeBlock",
                "args": {
                    "arguments": [],
                    "condition": "type==2"
                },
                "body": [{
                    "content": "\t<div> div This is the type for: ",
                    "type": 1
                }, {
                    "content": "type",
                    "type": 2
                }, {
                    "content": " </div>",
                    "type": 1
                }]
            }, {
                "name": "typeBlock",
                "args": {
                    "arguments": [],
                    "condition": "type==3"
                },
                "body": [{
                    "content": "\t<span> div This is the type for: ",
                    "type": 1
                }, {
                    "content": "type",
                    "type": 2
                }, {
                    "content": " </span>",
                    "type": 1
                }]
            }, {
                "name": "outer",
                "args": {
                    "arguments": [{
                        "name": "type",
                        "type": "Number"
                    }, {
                        "name": "desc",
                        "type": "String"
                    }],
                    "type": true
                },
                "body": [{
                    "content": "\t<div>\t\t",
                    "type": 1
                }, {
                    "content": "desc",
                    "type": 2
                }, {
                    "content": "\t</div>\t<div>\t\t",
                    "type": 1
                }, {
                    "content": "this.typeBlock(type)",
                    "type": 2
                }, {
                    "content": "\t</div>",
                    "type": 1
                }]
            }],
            "imports": {}
        });
    });
    it('Invalid input', function() {
        //make sure we have a clean AST
        FT.init();
        assert.throws(() => {
            FT.parse();
        }, Error);
        assert.throws(() => {
            FT.parse("1");
        }, Error);
        assert.throws(() => {
            FT.parse("t");
        }, Error);
        assert.throws(() => {
            FT.parse("template");
        }, Error);
        assert.throws(() => {
            FT.parse("template{");
        }, Error);
        assert.throws(() => {
            FT.parse("import");
        }, Error);
        assert.throws(() => {
            FT.parse("import;");
        }, Error);
        assert.throws(() => {
            FT.parse("template()");
        }, Error);
    });

});

describe('Compiler test', function() {
    it('Single template', function() {
        //make sure we have a clean AST
        FT.init();
        FT.parse("template T(a:Number){ a is #a#}");
        var context = FT.compile();
        var res = FT.run(context,"T",[1]);
        assert.equal(res," a is 1");
    });
    it('Complex template', function() {
        //make sure we have a clean AST
        FT.init();
        //Root is the javascript/
        var res;
        var content = fs.readFileSync("test/test_templates/basic.ft", "utf8");
        FT.parse(content, "test/test_templates/basic.ft");
        var context = FT.compile();
        res = FT.run(context,"outer",[0,"Hello world!"]);
        assert(res.indexOf("This is the type for: 0")!=-1);
        res = FT.run(context,"outer",[1,"Hello world!"]);
        assert(res.indexOf("This is the type for: 1")!=-1);
        res = FT.run(context,"outer",[2,"Hello world!"]);
        assert(res.indexOf("This is the type for: 2")!=-1);
        res = FT.run(context,"outer",[3,"Hello world!"]);
        assert(res.indexOf("This is the type for: 3")!=-1);
        res = FT.run(context,"outer",[4,"Hello world!"]);
        assert(res.indexOf("This is for unknown type")!=-1);
    });
    it('Recusive template', function() {
        //make sure we have a clean AST
        FT.init();
        //Root is the javascript/
        var content = fs.readFileSync("test/test_templates/fab.ft", "utf8");
        FT.parse(content, "test/test_templates/fab.ft");
        var context = FT.compile();
        assert.equal(FT.run(context,"fab",[0]),0);
        assert.equal(FT.run(context,"fab",[1]),1);
        assert.equal(FT.run(context,"fab",[2]),1);
        assert.equal(FT.run(context,"fab",[3]),2);
        assert.equal(FT.run(context,"fab",[4]),3);
        assert.equal(FT.run(context,"fab",[5]),5);
        assert.equal(FT.run(context,"fab",[6]),8);
        assert.equal(FT.run(context,"fab",[7]),13);
        assert.equal(FT.run(context,"fab",[8]),21);
        assert.equal(FT.run(context,"fab",[9]),34);
        assert.equal(FT.run(context,"fab",[10]),55);
        assert.equal(FT.run(context,"fab",[20]),6765);
        //assert(res.indexOf("This is the type for: 0")!=-1);
    });
});

describe('Render test', function() {
    it('Simple template', function(done){
        FT.render("template T(a:Number){ a is #a#}","T",[1],function(res){
            assert.equal(res," a is 1");
            done();
        });
    });
    it('Complex template', function(done) {
        FT.render("test/test_templates/basic.ft","outer",[0,"Hello world!"],function(res){
            assert(res.indexOf("This is the type for: 0")!=-1);
            done();
        });
    });
    it('Recusive template', function(done) {
        FT.render("test/test_templates/fab.ft","fab",[20],function(res){
            assert.equal(res,6765);
            done();
        });
    });
});